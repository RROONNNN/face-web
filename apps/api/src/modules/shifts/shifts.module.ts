import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeShiftAssignment } from './entities/employee-shift-assignment.entity';
import { ShiftWorkPeriod } from './entities/shift-work-period.entity';
import { Shift } from './entities/shift.entity';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Shift, ShiftWorkPeriod, EmployeeShiftAssignment])],
  providers: [ShiftsService],
  controllers: [ShiftsController]
})
export class ShiftsModule { }
