import { IsDateString, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

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
  @IsString()
  note?: string;
}
