import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckIn } from '../attendance/entities/check-in.entity';
import { CheckOut } from '../attendance/entities/check-out.entity';
import { HolidayCalendarModule } from '../holiday-calendar/holiday-calendar.module';
import { LeaveRequest } from '../leave/entities/leave-request.entity';
import { User } from '../users/entities/user.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CheckIn, CheckOut, LeaveRequest, User]),
    HolidayCalendarModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
