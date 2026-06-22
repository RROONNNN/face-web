import { IsDateString, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class AdminCheckInDto {
  @IsUUID()
  employeeId!: string;

  @IsDateString({ strict: false })
  workDate!: string;

  @IsDateString()
  occurredAt!: string;

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
  note?: string;
}
