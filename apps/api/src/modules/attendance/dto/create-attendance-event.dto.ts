import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAttendanceEventDto {
  @IsUUID()
  empId!: string;

  @IsISO8601()
  time!: string;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lon!: number;

  @IsOptional()
  @IsString()
  imagePath?: string;
}
