import {
  IsBoolean,
  IsDateString,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateAttendanceEventDto {
  @IsOptional()
  @IsDateString()
  workDate?: string;

  @IsOptional()
  @IsISO8601()
  time?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lon?: number;

  @IsOptional()
  @IsString()
  imagePath?: string;

  @IsOptional()
  @IsBoolean()
  isOutOfZone?: boolean;
}
