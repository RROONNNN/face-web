import {
  IsDateString,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateManualAttendanceEventDto {
  @IsUUID()
  empId!: string;

  @IsISO8601()
  time!: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lon?: number;

  @IsDateString()
  workDate!: string;
}
