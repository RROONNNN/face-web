import { IsDateString, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class AdminCheckOutDto {
  @IsUUID()
  employeeId!: string;

  @IsDateString({ strict: false })
  workDate!: string;

  @IsDateString()
  occurredAt!: string;

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
