import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class SyncAttendanceEventDto {
  @IsUUID()
  empId!: string;

  @IsISO8601()
  time!: string;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lon!: number;

  @IsString()
  localId!: string;

  @IsOptional()
  @IsString()
  imagePath?: string;
}
