import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

import { CheckIn } from '../modules/attendance/entities/check-in.entity';
import { CheckOut } from '../modules/attendance/entities/check-out.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { FaceData } from '../modules/face/entities/face-data.entity';
import { LeaveRequest } from '../modules/leave/entities/leave-request.entity';
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
    CheckIn,
    CheckOut,
    FaceData,
    LeaveRequest,
  ],
  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,
});
