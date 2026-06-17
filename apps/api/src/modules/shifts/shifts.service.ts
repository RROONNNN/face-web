import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Shift } from './entities/shift.entity';
import { DataSource, Repository } from 'typeorm';
import { CreateShiftDto } from './dto/create-shift.dto';
import { QueryShiftsDto } from './dto/query-shifts.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    private readonly dataSource: DataSource,
  ) {}
  async findAll(input: QueryShiftsDto) {
    const page = input.page ?? 1;
    const limit = Math.min(input.limit ?? 20, 100);
    const [items, total] = await this.shiftRepository.findAndCount({
      order: { isActive: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }
  create(input: CreateShiftDto) {
    const shift = this.shiftRepository.create(input);
    return this.shiftRepository.save(shift);
  }

  async update(id: string, input: UpdateShiftDto) {
    const shift = await this.shiftRepository.preload({
      id,
      ...input,
    });

    if (!shift) {
      throw new NotFoundException(`Shift with id "${id}" not found`);
    }

    return this.shiftRepository.save(shift);
  }

  async delete(id: string) {
    const result = await this.shiftRepository.delete(id);

    if (!result.affected) {
      throw new NotFoundException(`Shift with id "${id}" not found`);
    }

    return { id };
  }

  async activate(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const shift = await manager.findOne(Shift, { where: { id } });

      if (!shift) {
        throw new NotFoundException(`Shift with id "${id}" not found`);
      }

      await manager.update(Shift, { isActive: true }, { isActive: false });
      shift.isActive = true;

      return manager.save(Shift, shift);
    });
  }
}
