import { IsBoolean, IsDateString, IsEnum, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString } from 'class-validator';
import { AttendanceSource } from '../enums/attendance-source.enum';

export class SyncCheckInDto {
  @IsString()
  employeeId!: string;

  @IsString()
  localId!: string;

  @IsDateString()
  occurredAt!: string;

  @IsEnum(AttendanceSource)
  source!: AttendanceSource;

  @IsOptional()
  @IsNumber()
  faceSimilarity?: number;

  @IsOptional()
  @IsNumber()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class SyncCheckInOutDto extends SyncCheckInDto {
  @IsBoolean()
  isCheckIn!: boolean;
}
