import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

import { AttendanceEvent } from '../modules/attendance/entities/attendance-event.entity';
import { AttendanceRecord } from '../modules/attendance/entities/attendance-record.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { Department } from '../modules/departments/entities/department.entity';
import { GeofenceConfig } from '../modules/geofence/entities/geofence-config.entity';
import { LeaveRequestDay } from '../modules/leave/entities/leave-request-day.entity';
import { LeaveRequest } from '../modules/leave/entities/leave-request.entity';
import { EmployeeShiftAssignment } from '../modules/shifts/entities/employee-shift-assignment.entity';
import { ShiftWorkPeriod } from '../modules/shifts/entities/shift-work-period.entity';
import { Shift } from '../modules/shifts/entities/shift.entity';
import { User } from '../modules/users/entities/user.entity';

config({ path: resolve(process.cwd(), '../../.env') });

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,

  entities: [
    User,
    RefreshToken,
    Shift,
    ShiftWorkPeriod,
    Department,
    GeofenceConfig,
    EmployeeShiftAssignment,
    AttendanceRecord,
    AttendanceEvent,
    LeaveRequest,
    LeaveRequestDay,
  ],
  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,
});
