import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { AttendanceController } from './attendance.controller';
import { AttendanceRealtimeGateway } from './attendance-realtime.gateway';
import { AttendanceService } from './attendance.service';
import { CheckIn } from './entities/check-in.entity';
import { CheckOut } from './entities/check-out.entity';
import { GeofenceModule } from '../geofence/geofence.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CheckIn, CheckOut, User, Shift]),
    GeofenceModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRealtimeGateway],
  exports: [AttendanceService],
})
export class AttendanceModule {}
