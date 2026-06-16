import {
  IsBooleanString,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '../enums/attendance-status.enum';

export class QueryAttendanceDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsUUID()
  empId?: string;

  @IsOptional()
  @IsBooleanString()
  late?: string;

  @IsOptional()
  @IsBooleanString()
  early?: string;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
