import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { Department } from '../departments/entities/department.entity';
import { LeaveModule } from '../leave/leave.module';
import { User } from '../users/entities/user.entity';
import { EmployeeShiftAssignment } from './entities/employee-shift-assignment.entity';
import { ShiftWorkPeriod } from './entities/shift-work-period.entity';
import { Shift } from './entities/shift.entity';
import { ShiftAssignmentSchedulerService } from './shift-assignment-scheduler.service';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Shift,
      ShiftWorkPeriod,
      EmployeeShiftAssignment,
      AttendanceRecord,
      User,
      Department,
    ]),
    LeaveModule,
  ],
  providers: [ShiftsService, ShiftAssignmentSchedulerService],
  controllers: [ShiftsController]
})
export class ShiftsModule { }
