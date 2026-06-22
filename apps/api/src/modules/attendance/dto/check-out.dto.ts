import { IsDateString, IsEnum, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString } from 'class-validator';
import { AttendanceSource } from '../enums/attendance-source.enum';

export class CheckOutDto {
  @IsString()
  employeeId!: string;

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
