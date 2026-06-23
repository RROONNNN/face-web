import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { TimeUtil } from '../../common/utils/time.util';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { LeaveReconciliationService } from '../leave/leave-reconciliation.service';
import { User } from '../users/entities/user.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { QueryShiftAssignmentsDto } from './dto/query-shift-assignments.dto';
import { QueryShiftsDto } from './dto/query-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { UpsertShiftAssignmentDto } from './dto/upsert-shift-assignment.dto';
import { EmployeeShiftAssignment } from './entities/employee-shift-assignment.entity';
import { ShiftWorkPeriod } from './entities/shift-work-period.entity';
import { Shift } from './entities/shift.entity';
import { ShiftAssignmentSource } from './enums/shift-assignment-source.enum';


@Injectable()
export class ShiftsService {
    constructor(
        @InjectRepository(Shift)
        private readonly shiftRepository: Repository<Shift>,
        @InjectRepository(ShiftWorkPeriod)
        private readonly workPeriodRepository: Repository<ShiftWorkPeriod>,
        @InjectRepository(EmployeeShiftAssignment)
        private readonly assignmentRepository: Repository<EmployeeShiftAssignment>,
        @InjectRepository(AttendanceRecord)
        private readonly attendanceRecordRepository: Repository<AttendanceRecord>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly dataSource: DataSource,
        private readonly leaveReconciliationService: LeaveReconciliationService,
    ) {
    }
    async findAllShifts(query: QueryShiftsDto): Promise<PaginatedResponse<Shift>> {
        const {
            search,
            isActive,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
        } = query;
        const qb = this.shiftRepository.createQueryBuilder('shift')
            .leftJoinAndSelect('shift.workPeriods', 'workPeriod')
            .orderBy(`shift.${sortBy}`, sortOrder)
            .addOrderBy('workPeriod.startTime', 'ASC')
            .skip((page - 1) * limit)
            .take(limit);

        if (search) {
            qb.andWhere(
                '(LOWER(shift.code) LIKE LOWER(:search) OR LOWER(shift.name) LIKE LOWER(:search))',
                { search: `%${search}%` },
            );
        }
        if (isActive !== undefined) {
            qb.andWhere('shift.isActive = :isActive', { isActive });
        }
        const [items, total] = await qb.getManyAndCount();
        return {
            items,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async createShift(createShiftDto: CreateShiftDto): Promise<Shift> {
        const name = createShiftDto.name.trim();
        this.validateWorkPeriods(createShiftDto.workPeriods);
        return this.dataSource.transaction(
            async () => {
                const existingShift = await this.shiftRepository.findOne({
                    where: { name },
                });
                if (existingShift) {
                    throw new ConflictException(
                        `Shift name "${name}" already exists.`,
                    );
                }
                const shift = this.shiftRepository.create({
                    name,
                    lateGraceMinutes: createShiftDto.lateGraceMinutes ?? 0,
                    isActive: createShiftDto.isActive ?? true,
                });
                const savedShift = await this.shiftRepository.save(shift);
                const workPeriods = createShiftDto.workPeriods.map((period) =>
                    this.workPeriodRepository.create({
                        shiftId: savedShift.id,
                        name: period.name.trim(),
                        startTime: period.startTime,
                        endTime: period.endTime,
                        isCrossMidnight: period.isCrossMidnight,
                    }),
                );
                await this.workPeriodRepository.save(workPeriods);
                return this.shiftRepository.findOneOrFail({
                    where: { id: savedShift.id },
                    relations: {
                        workPeriods: true,
                    },
                    order: {
                        workPeriods: {
                            startTime: 'ASC',
                        },
                    },
                });
            }
        )


    }

    async updateShift(
        id: string,
        updateShiftDto: UpdateShiftDto,
    ): Promise<Shift> {
        const name = updateShiftDto.name?.trim();

        if (name !== undefined && name.length === 0) {
            throw new BadRequestException('Shift name cannot be empty.');
        }

        if (updateShiftDto.workPeriods !== undefined) {
            this.validateWorkPeriods(updateShiftDto.workPeriods);
        }

        return this.dataSource.transaction(async (manager) => {
            const shiftRepository = manager.getRepository(Shift);
            const workPeriodRepository = manager.getRepository(
                ShiftWorkPeriod,
            );
            const shift = await shiftRepository.findOne({ where: { id } });

            if (!shift) {
                throw new NotFoundException(`Shift with id "${id}" not found.`);
            }

            if (name !== undefined) {
                const existingShift = await shiftRepository
                    .createQueryBuilder('shift')
                    .where('LOWER(shift.name) = LOWER(:name)', { name })
                    .andWhere('shift.id != :id', { id })
                    .getOne();

                if (existingShift) {
                    throw new ConflictException(
                        `Shift name "${name}" already exists.`,
                    );
                }

                shift.name = name;
            }

            if (updateShiftDto.lateGraceMinutes !== undefined) {
                shift.lateGraceMinutes = updateShiftDto.lateGraceMinutes;
            }

            if (updateShiftDto.isActive !== undefined) {
                shift.isActive = updateShiftDto.isActive;
            }

            await shiftRepository.save(shift);

            if (updateShiftDto.workPeriods !== undefined) {
                await workPeriodRepository.delete({ shiftId: id });

                const workPeriods = updateShiftDto.workPeriods.map((period) =>
                    workPeriodRepository.create({
                        shiftId: id,
                        name: period.name.trim(),
                        startTime: period.startTime,
                        endTime: period.endTime,
                        isCrossMidnight: period.isCrossMidnight,
                    }),
                );

                await workPeriodRepository.save(workPeriods);
            }

            return shiftRepository.findOneOrFail({
                where: { id },
                relations: {
                    workPeriods: true,
                },
                order: {
                    workPeriods: {
                        startTime: 'ASC',
                    },
                },
            });
        });
    }

    async deactivateShift(id: string): Promise<Shift> {
        const shift = await this.shiftRepository.findOne({ where: { id } });

        if (!shift) {
            throw new NotFoundException(`Shift with id "${id}" not found.`);
        }

        if (shift.isActive) {
            shift.isActive = false;
            await this.shiftRepository.save(shift);
        }

        return this.shiftRepository.findOneOrFail({
            where: { id },
            relations: {
                workPeriods: true,
            },
            order: {
                workPeriods: {
                    startTime: 'ASC',
                },
            },
        });
    }

    private validateWorkPeriods(workPeriods: CreateShiftDto['workPeriods'],) {
        if (!workPeriods.length) {
            throw new BadRequestException(
                'A shift must contain at least one work period.',
            );
        }
        for (const period of workPeriods) {
            const startMinutes = TimeUtil.timeToMinutes(period.startTime);
            const endMinutes = TimeUtil.timeToMinutes(period.endTime);
            if (startMinutes === endMinutes) {
                throw new BadRequestException(
                    `Work period "${period.name}" cannot have the same start and end time.`,
                );
            }
            if (!period.isCrossMidnight && endMinutes <= startMinutes) {
                throw new BadRequestException(
                    `Work period "${period.name}" must end after it starts unless it crosses midnight.`,
                );
            }

            if (period.isCrossMidnight && endMinutes >= startMinutes) {
                throw new BadRequestException(
                    `Work period "${period.name}" is marked as crossing midnight, so its end time must be earlier than its start time.`,
                );
            }

        }


    }

    /**
     * Guards against modifying a shift assignment after the 02:00 AM cutoff
     * of the assignment's work date (in the configured application timezone).
     *
     * Rationale: the nightly cron runs at 01:00 AM, so 02:00 AM gives a safe
     * one-hour window after cron completion before the work day begins.
     *
     * @throws BadRequestException if now >= workDate 02:00 AM (app timezone)
     */
    private assertAssignmentWindowOpen(workDate: string): void {
        const appTzOffset = process.env['APP_TZ_OFFSET'] ?? '+07:00';
        const cutoff = new Date(`${workDate}T02:00:00${appTzOffset}`);
        const now = new Date();

        if (now >= cutoff) {
            throw new BadRequestException(
                `Cannot modify the shift assignment for ${workDate}: ` +
                `the 02:00 AM cut-off has already passed (current time: ${now.toISOString()}).`,
            );
        }
    }

    // -------------------------------------------------------------------------
    // Assignment management
    // -------------------------------------------------------------------------

    /**
     * Admin upsert: create or overwrite a shift assignment for a single employee on a specific date.
     *
     * Logic:
     * 1. Validate employee exists.
     * 2. Validate shift exists and is active.
     * 3. Map approved leave periods onto the target shift.
     * 4. Upsert the assignment row (source = admin_manual).
     * 5. Reconcile the persisted attendance record.
     */
    async upsertAssignment(
        dto: UpsertShiftAssignmentDto,
        assignedByUserId: string,
    ): Promise<EmployeeShiftAssignment> {
        // Guard: block changes once the 02:00 AM cut-off for the work date has passed.
        this.assertAssignmentWindowOpen(dto.workDate);

        return this.dataSource.transaction(async (manager) => {
            const userRepo = manager.getRepository(User);
            const shiftRepo = manager.getRepository(Shift);
            const workPeriodRepo = manager.getRepository(ShiftWorkPeriod);
            const assignmentRepo = manager.getRepository(EmployeeShiftAssignment);

            // 1. Validate employee
            const employee = await userRepo.findOne({ where: { id: dto.employeeId } });
            if (!employee) {
                throw new NotFoundException(`Employee with id "${dto.employeeId}" not found.`);
            }

            // 2. Validate shift
            const shift = await shiftRepo.findOne({ where: { id: dto.shiftId } });
            if (!shift) {
                throw new NotFoundException(`Shift with id "${dto.shiftId}" not found.`);
            }
            if (!shift.isActive) {
                throw new BadRequestException(
                    `Shift "${shift.name}" is inactive and cannot be assigned.`,
                );
            }

            // 3. Approved leave is the only source of leave period IDs.
            const workPeriods = await workPeriodRepo.find({
                where: { shiftId: dto.shiftId },
            });
            const leaveIds = await this.leaveReconciliationService.resolveLeavePeriodIds(
                manager,
                dto.employeeId,
                dto.workDate,
                workPeriods,
            );

            // 4. Upsert assignment
            await assignmentRepo
                .createQueryBuilder()
                .insert()
                .into(EmployeeShiftAssignment)
                .values({
                    employeeId: dto.employeeId,
                    shiftId: dto.shiftId,
                    workDate: dto.workDate,
                    source: ShiftAssignmentSource.ADMIN_MANUAL,
                    assignedByUserId,
                    note: dto.note ?? null,
                    leaveShiftWorkPeriodIds: leaveIds,
                })
                .orUpdate(
                    ['shift_id', 'source', 'assigned_by_user_id', 'note', 'leave_shift_work_period_ids'],
                    ['employee_id', 'work_date'],
                )
                .execute();

            const assignment = await assignmentRepo.findOneOrFail({
                where: { employeeId: dto.employeeId, workDate: dto.workDate },
                relations: { shift: { workPeriods: true }, assignedByUser: true },
            });

            // 5. Create or update the attendance record from the approved leave state.
            await this.leaveReconciliationService.reconcileAssignment(manager, assignment);

            return assignment;
        });
    }

    /**
     * Paginated list of shift assignments with optional filters.
     */
    async findAllAssignments(
        query: QueryShiftAssignmentsDto,
    ): Promise<PaginatedResponse<EmployeeShiftAssignment>> {
        const {
            employeeId,
            employeeSearch,
            shiftId,
            workDate,
            dateFrom,
            dateTo,
            source,
            page = 1,
            limit = 20,
            sortBy = 'workDate',
            sortOrder = 'DESC',
        } = query;

        const qb = this.assignmentRepository
            .createQueryBuilder('assignment')
            .leftJoinAndSelect('assignment.employee', 'employee')
            .leftJoinAndSelect('assignment.shift', 'shift')
            .leftJoinAndSelect('assignment.assignedByUser', 'assignedByUser')
            .orderBy(`assignment.${sortBy}`, sortOrder)
            .skip((page - 1) * limit)
            .take(limit);

        if (employeeId) {
            qb.andWhere('assignment.employeeId = :employeeId', { employeeId });
        }
        if (employeeSearch) {
            qb.andWhere(
                '(LOWER(employee.name) LIKE LOWER(:employeeSearch) OR LOWER(employee.employeeCode) LIKE LOWER(:employeeSearch))',
                { employeeSearch: `%${employeeSearch}%` },
            );
        }
        if (shiftId) {
            qb.andWhere('assignment.shiftId = :shiftId', { shiftId });
        }
        if (workDate) {
            qb.andWhere('assignment.workDate = :workDate', { workDate });
        }
        if (dateFrom) {
            qb.andWhere('assignment.workDate >= :dateFrom', { dateFrom });
        }
        if (dateTo) {
            qb.andWhere('assignment.workDate <= :dateTo', { dateTo });
        }
        if (source) {
            qb.andWhere('assignment.source = :source', { source });
        }

        const [items, total] = await qb.getManyAndCount();
        return {
            items,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }



}
