import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { Shift } from '../shifts/entities/shift.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { QueryDepartmentsDto } from './dto/query-departments.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Department } from './entities/department.entity';

@Injectable()
export class DepartmentsService {
    constructor(
        @InjectRepository(Department)
        private readonly departmentRepo: Repository<Department>,
        @InjectRepository(Shift)
        private readonly shiftRepo: Repository<Shift>,
    ) {}

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Validate that the referenced shift exists and is active.
     * Throws BadRequestException if not.
     */
    private async validateActiveShift(shiftId: string): Promise<Shift> {
        const shift = await this.shiftRepo.findOne({ where: { id: shiftId } });
        if (!shift) {
            throw new NotFoundException(`Shift with id "${shiftId}" not found.`);
        }
        if (!shift.isActive) {
            throw new BadRequestException(
                `Shift "${shift.name}" is inactive. Departments must reference an active shift.`,
            );
        }
        return shift;
    }

    // -------------------------------------------------------------------------
    // CRUD
    // -------------------------------------------------------------------------

    async findAll(query: QueryDepartmentsDto): Promise<PaginatedResponse<Department>> {
        const { search, isActive, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

        const qb = this.departmentRepo
            .createQueryBuilder('dept')
            .leftJoinAndSelect('dept.defaultShift', 'shift')
            .orderBy(`dept.${sortBy}`, sortOrder)
            .skip((page - 1) * limit)
            .take(limit);

        if (search) {
            qb.andWhere(
                '(LOWER(dept.code) LIKE LOWER(:search) OR LOWER(dept.name) LIKE LOWER(:search))',
                { search: `%${search}%` },
            );
        }
        if (isActive !== undefined) {
            qb.andWhere('dept.isActive = :isActive', { isActive });
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

    async findOne(id: string): Promise<Department> {
        const dept = await this.departmentRepo.findOne({
            where: { id },
            relations: { defaultShift: true },
        });
        if (!dept) {
            throw new NotFoundException(`Department with id "${id}" not found.`);
        }
        return dept;
    }

    async create(dto: CreateDepartmentDto): Promise<Department> {
        await this.validateActiveShift(dto.defaultShiftId);

        const existing = await this.departmentRepo.findOne({ where: { code: dto.code } });
        if (existing) {
            throw new ConflictException(`Department with code "${dto.code}" already exists.`);
        }

        const dept = this.departmentRepo.create({
            code: dto.code,
            name: dto.name.trim(),
            description: dto.description?.trim() ?? null,
            isActive: dto.isActive ?? true,
            defaultShiftId: dto.defaultShiftId,
        });

        const saved = await this.departmentRepo.save(dept);
        return this.findOne(saved.id);
    }

    async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
        const dept = await this.departmentRepo.findOne({ where: { id } });
        if (!dept) {
            throw new NotFoundException(`Department with id "${id}" not found.`);
        }

        // Validate shift if being changed
        if (dto.defaultShiftId !== undefined) {
            await this.validateActiveShift(dto.defaultShiftId);
            dept.defaultShiftId = dto.defaultShiftId;
        }

        // Validate code uniqueness if being changed
        if (dto.code !== undefined && dto.code !== dept.code) {
            const existing = await this.departmentRepo
                .createQueryBuilder('dept')
                .where('LOWER(dept.code) = LOWER(:code)', { code: dto.code })
                .andWhere('dept.id != :id', { id })
                .getOne();
            if (existing) {
                throw new ConflictException(`Department with code "${dto.code}" already exists.`);
            }
            dept.code = dto.code;
        }

        if (dto.name !== undefined) dept.name = dto.name.trim();
        if (dto.description !== undefined) dept.description = dto.description.trim() ?? null;
        if (dto.isActive !== undefined) dept.isActive = dto.isActive;

        await this.departmentRepo.save(dept);
        return this.findOne(id);
    }
}
