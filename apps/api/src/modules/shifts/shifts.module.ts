import { Module } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftEntity } from './entities/shift.entity';
import { ShiftWorkPeriodEntity } from './entities/shift-work-period.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShiftEntity, ShiftWorkPeriodEntity])],
  providers: [ShiftsService],
  controllers: [ShiftsController]
})
export class ShiftsModule {}
