import type { TransformFnParams } from 'class-transformer';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class PartialLeaveDayDto {
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY_PATTERN)
  workDate!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  workPeriodIds!: string[];
}

export class CreateLeaveRequestDto {
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY_PATTERN)
  startDate!: string;

  @IsDateString({ strict: true })
  @Matches(DATE_ONLY_PATTERN)
  endDate!: string;

  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 2000)
  reason!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartialLeaveDayDto)
  partialDays?: PartialLeaveDayDto[];
  @IsUUID()
  departmentShiftId!: string;
}
