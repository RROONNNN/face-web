import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { AccountRole } from '../auth/account-role.enum';
import { Department } from '../departments/entities/department.entity';
import { EmployeeShiftAssignment } from '../shifts/entities/employee-shift-assignment.entity';
import { ShiftAssignmentSource } from '../shifts/enums/shift-assignment-source.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,
        @InjectRepository(Department)
        private readonly departmentRepository: Repository<Department>,
        @InjectRepository(EmployeeShiftAssignment)
        private readonly assignmentRepository: Repository<EmployeeShiftAssignment>,
        private readonly dataSource: DataSource,
    ) { }

    // -------------------------------------------------------------------------
    // Internal helpers (used by AuthService)
    // -------------------------------------------------------------------------

    findByEmployeeCode(employeeCode: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { employeeCode } });
    }

    async findById(id: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { id } });
    }

    /** @deprecated Use create() instead. Kept for backward compat with seeder. */
    async createAdmin(input: {
        employeeCode: string;
        name: string;
        passwordHash: string;
    }): Promise<User> {
        const user = this.usersRepository.create({
            employeeCode: input.employeeCode,
            name: input.name,
            passwordHash: input.passwordHash,
            accountRole: AccountRole.Admin,
        });
        return this.usersRepository.save(user);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private get appTimezone(): string {
        return process.env['APP_TIMEZONE'] ?? 'Asia/Ho_Chi_Minh';
    }

    private todayWorkDate(): string {
        return new Intl.DateTimeFormat('sv-SE', {
            timeZone: this.appTimezone,
        }).format(new Date());
    }

    /**
     * Auto-generates a unique employee code based on the employee's date of birth.
     *
     * Format: EMP{YYYYMMDD}[NNN]
     *   - Base:      EMP19900515
     *   - Collision: EMP19900515001, EMP19900515002, …
     */
    private async generateEmployeeCode(dateOfBirth: string): Promise<string> {
        // dateOfBirth is YYYY-MM-DD — strip dashes to get YYYYMMDD
        const datePart = dateOfBirth.replace(/-/g, '');
        const base = `EMP${datePart}`;

        // Try the bare base first, then append a zero-padded counter
        const candidates = [base, ...Array.from({ length: 999 }, (_, i) =>
            `${base}${String(i + 1).padStart(3, '0')}`,
        )];

        for (const code of candidates) {
            const exists = await this.usersRepository.findOne({ where: { employeeCode: code } });
            if (!exists) return code;
        }

        // Extremely unlikely, but guard against it
        throw new ConflictException(
            `Unable to auto-generate a unique employee code for DOB ${dateOfBirth}. Please provide one manually.`,
        );
    }

    /**
     * Validate that the referenced department exists and is active.
     * Returns the department so the caller can read defaultShiftId / name.
     */
    private async validateActiveDepartment(departmentId: string): Promise<Department> {
        const dept = await this.departmentRepository.findOne({
            where: { id: departmentId },
        });
        if (!dept) {
            throw new NotFoundException(`Department with id "${departmentId}" not found.`);
        }
        if (!dept.isActive) {
            throw new BadRequestException(
                `Department "${dept.name}" is inactive. Employees can only be assigned to active departments.`,
            );
        }
        return dept;
    }

    // -------------------------------------------------------------------------
    // CRUD
    // -------------------------------------------------------------------------

    async findAll(query: QueryUsersDto): Promise<PaginatedResponse<Omit<User, 'passwordHash'>>> {
        const {
            search,
            departmentId,
            accountRole,
            isActive,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
        } = query;

        const qb = this.usersRepository
            .createQueryBuilder('user')
            .select([
                'user.id',
                'user.employeeCode',
                'user.name',
                'user.accountRole',
                'user.isActive',
                'user.department',
                'user.departmentId',
                'user.jobTitle',
                'user.phone',
                'user.email',
                'user.dateOfBirth',
                'user.createdAt',
                'user.updatedAt',
            ])
            .orderBy(`user.${sortBy}`, sortOrder)
            .skip((page - 1) * limit)
            .take(limit);

        if (search) {
            qb.andWhere(
                '(LOWER(user.name) LIKE LOWER(:search) OR LOWER(user.employeeCode) LIKE LOWER(:search))',
                { search: `%${search}%` },
            );
        }
        if (departmentId) {
            qb.andWhere('user.departmentId = :departmentId', { departmentId });
        }
        if (accountRole) {
            qb.andWhere('user.accountRole = :accountRole', { accountRole });
        }
        if (isActive !== undefined) {
            qb.andWhere('user.isActive = :isActive', { isActive });
        }

        const [items, total] = await qb.getManyAndCount();
        return {
            items,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    async findOne(id: string): Promise<Omit<User, 'passwordHash'>> {
        const user = await this.usersRepository
            .createQueryBuilder('user')
            .select([
                'user.id',
                'user.employeeCode',
                'user.name',
                'user.accountRole',
                'user.isActive',
                'user.department',
                'user.departmentId',
                'user.jobTitle',
                'user.phone',
                'user.email',
                'user.dateOfBirth',
                'user.createdAt',
                'user.updatedAt',
            ])
            .where('user.id = :id', { id })
            .getOne();

        if (!user) {
            throw new NotFoundException(`User with id "${id}" not found.`);
        }
        return user;
    }

    /**
     * Create a new user (employee or admin).
     * - Hashes the plain-text password.
     * - Validates departmentId references an active department.
     * - Syncs the legacy `department` varchar from Department.name.
     */
    async create(dto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
        // Resolve employee code — use provided value or auto-generate from DOB
        let employeeCode = dto.employeeCode?.trim();
        if (!employeeCode) {
            if (!dto.dateOfBirth) {
                throw new BadRequestException(
                    'Either employeeCode or dateOfBirth must be provided to create a user.',
                );
            }
            employeeCode = await this.generateEmployeeCode(dto.dateOfBirth);
        }

        // Unique code check
        const existing = await this.usersRepository.findOne({
            where: { employeeCode },
        });
        if (existing) {
            throw new ConflictException(
                `Employee code "${employeeCode}" is already taken.`,
            );
        }

        let departmentName: string | null = null;
        if (dto.departmentId) {
            const dept = await this.validateActiveDepartment(dto.departmentId);
            departmentName = dept.name;
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);

        const user = this.usersRepository.create({
            employeeCode,
            name: dto.name.trim(),
            passwordHash,
            accountRole: dto.accountRole ?? AccountRole.Employee,
            isActive: true,
            departmentId: dto.departmentId ?? null,
            department: departmentName,
            jobTitle: dto.jobTitle?.trim() ?? null,
            phone: dto.phone?.trim() ?? null,
            email: dto.email?.trim() ?? null,
            dateOfBirth: dto.dateOfBirth ?? null,
        });

        await this.usersRepository.save(user);
        return this.findOne(user.id);
    }

    /**
     * Update a user.
     *
     * Department-change side-effect:
     * When `departmentId` changes, all future (workDate > today) EmployeeShiftAssignment
     * rows with source = 'department_default' are updated to the new department's defaultShiftId.
     * Admin-manual assignments are intentionally left untouched.
     */
    async update(id: string, dto: UpdateUserDto): Promise<Omit<User, 'passwordHash'>> {
        return this.dataSource.transaction(async (manager) => {
            const userRepo = manager.getRepository(User);
            const assignmentRepo = manager.getRepository(EmployeeShiftAssignment);

            const user = await userRepo.findOne({ where: { id } });
            if (!user) {
                throw new NotFoundException(`User with id "${id}" not found.`);
            }

            // Unique employeeCode check if changing
            if (dto.employeeCode !== undefined && dto.employeeCode !== user.employeeCode) {
                const conflict = await userRepo
                    .createQueryBuilder('u')
                    .where('LOWER(u.employeeCode) = LOWER(:code)', { code: dto.employeeCode })
                    .andWhere('u.id != :id', { id })
                    .getOne();
                if (conflict) {
                    throw new ConflictException(
                        `Employee code "${dto.employeeCode}" is already taken.`,
                    );
                }
                user.employeeCode = dto.employeeCode;
            }

            if (dto.name !== undefined) user.name = dto.name.trim();
            if (dto.jobTitle !== undefined) user.jobTitle = dto.jobTitle.trim() ?? null;
            if (dto.phone !== undefined) user.phone = dto.phone.trim() ?? null;
            if (dto.email !== undefined) user.email = dto.email.trim() ?? null;
            if (dto.dateOfBirth !== undefined) user.dateOfBirth = dto.dateOfBirth ?? null;
            if (dto.accountRole !== undefined) user.accountRole = dto.accountRole;

            if (dto.password !== undefined) {
                user.passwordHash = await bcrypt.hash(dto.password, 10);
            }

            // Department change
            const departmentChanged =
                dto.departmentId !== undefined && dto.departmentId !== user.departmentId;

            if (departmentChanged) {
                const newDept = await this.validateActiveDepartment(dto.departmentId!);
                const today = this.todayWorkDate();

                // Update future department_default assignments to new shift
                await assignmentRepo
                    .createQueryBuilder()
                    .update(EmployeeShiftAssignment)
                    .set({ shiftId: newDept.defaultShiftId })
                    .where('employee_id = :id', { id: user.id })
                    .andWhere('work_date > :today', { today })
                    .andWhere('source = :source', { source: ShiftAssignmentSource.DEPARTMENT_DEFAULT })
                    .execute();

                user.departmentId = dto.departmentId ?? null;
                // Sync legacy varchar
                user.department = newDept.name;
            } else if (dto.departmentId === null) {
                // Explicit unset
                user.departmentId = null;
                user.department = null;
            }

            await userRepo.save(user);
            return this.findOne(id);
        });
    }

    /**
     * Soft-deactivate a user (isActive = false).
     * Hard-delete is intentionally not supported — FK constraints from
     * attendance_records and employee_shift_assignments prevent it anyway.
     */
    async deactivate(id: string): Promise<Omit<User, 'passwordHash'>> {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException(`User with id "${id}" not found.`);
        }
        if (!user.isActive) {
            return this.findOne(id);
        }
        user.isActive = false;
        await this.usersRepository.save(user);
        return this.findOne(id);
    }
}
