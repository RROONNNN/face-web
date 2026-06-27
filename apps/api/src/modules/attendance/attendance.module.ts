import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeofenceModule } from '../geofence/geofence.module';
import { HolidaysModule } from '../holidays/holidays.module';
import { LeaveModule } from '../leave/leave.module';
import { EmployeeShiftAssignment } from '../shifts/entities/employee-shift-assignment.entity';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceEvent } from './entities/attendance-event.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';

@Module({
  imports: [
    LeaveModule,
    HolidaysModule,
    GeofenceModule,
    TypeOrmModule.forFeature([
      AttendanceRecord,
      AttendanceEvent,
      EmployeeShiftAssignment,
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule { }
