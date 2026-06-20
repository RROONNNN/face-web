import { Type } from 'class-transformer';
import {
  IsArray,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class BulkIoItemDto {
  @IsNumber()
  id!: number; // localId

  @IsOptional()
  @IsISO8601()
  in_time?: string;

  @IsOptional()
  @IsISO8601()
  out_time?: string;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lon!: number;
}

export class BulkUserDto {
  @IsUUID()
  employee_id!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkIoItemDto)
  io!: BulkIoItemDto[];
}

export class SyncBulkAttendanceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUserDto)
  bulk_users!: BulkUserDto[];
}
