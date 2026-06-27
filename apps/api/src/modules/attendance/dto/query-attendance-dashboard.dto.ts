import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class QueryAttendanceDashboardDto {
  @IsOptional()
  @IsDateString({ strict: false })
  workDate?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
