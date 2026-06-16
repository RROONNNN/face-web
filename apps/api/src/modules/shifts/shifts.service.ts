import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Shift } from './entities/shift.entity';
import { Repository } from 'typeorm';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
  ) {}
  findAll() {
    return this.shiftRepository.find();
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
}
