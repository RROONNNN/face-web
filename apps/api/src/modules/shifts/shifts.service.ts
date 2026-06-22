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
import { CreateShiftDto } from './dto/create-shift.dto';
import { QueryShiftsDto } from './dto/query-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { ShiftWorkPeriod } from './entities/shift-work-period.entity';
import { Shift } from './entities/shift.entity';


@Injectable()
export class ShiftsService {
    constructor(
        @InjectRepository(Shift)
        private readonly shiftRepository: Repository<Shift>,
        @InjectRepository(ShiftWorkPeriod)
        private readonly workPeriodRepository: Repository<ShiftWorkPeriod>,
        private readonly dataSource: DataSource,
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



}
