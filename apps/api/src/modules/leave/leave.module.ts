import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceEvent } from '../attendance/entities/attendance-event.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { Department } from '../departments/entities/department.entity';
import { EmployeeShiftAssignment } from '../shifts/entities/employee-shift-assignment.entity';
import { ShiftWorkPeriod } from '../shifts/entities/shift-work-period.entity';
import { User } from '../users/entities/user.entity';
import { LeaveRequestDay } from './entities/leave-request-day.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { LeaveController } from './leave.controller';
import { LeaveReconciliationService } from './leave-reconciliation.service';
import { LeaveService } from './leave.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeaveRequest,
      LeaveRequestDay,
      User,
      Department,
      EmployeeShiftAssignment,
      ShiftWorkPeriod,
      AttendanceRecord,
      AttendanceEvent,
    ]),
  ],
  controllers: [LeaveController],
  providers: [LeaveService, LeaveReconciliationService],
  exports: [LeaveReconciliationService],
})
export class LeaveModule {}
