import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { CheckIn } from './entities/check-in.entity';
import { CheckOut } from './entities/check-out.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CheckIn, CheckOut, User, Shift])],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule { }
