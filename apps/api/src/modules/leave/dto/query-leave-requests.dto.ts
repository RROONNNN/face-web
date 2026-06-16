import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { LeaveStatus } from '../enums/leave-status.enum';

export class QueryLeaveRequestsDto {
  @IsOptional()
  @IsEnum(LeaveStatus)
  status?: LeaveStatus;

  @IsOptional()
  @IsUUID()
  empId?: string;
}
