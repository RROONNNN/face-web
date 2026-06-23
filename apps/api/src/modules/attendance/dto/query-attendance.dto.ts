import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { AttendanceStatus } from '../enums/attendance-status.enum';

export class QueryAttendanceDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsDateString({ strict: false })
  date?: string;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 20;
  @IsOptional()
  @Type(() => Boolean)
  shouldShowPending?: boolean;

  @IsOptional()
  @IsDateString({ strict: false })
  startDate?: string;

  @IsOptional()
  @IsDateString({ strict: false })
  endDate?: string;
}
