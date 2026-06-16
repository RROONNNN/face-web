import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { LeaveController } from './leave.controller';
import { LeaveRequest } from './entities/leave-request.entity';
import { LeaveService } from './leave.service';

@Module({
  imports: [TypeOrmModule.forFeature([LeaveRequest, User])],
  controllers: [LeaveController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}
