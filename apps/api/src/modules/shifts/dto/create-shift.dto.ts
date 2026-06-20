import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShiftWorkPeriodDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    startTime!: string;

    @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    endTime!: string;

    @IsOptional()
    @IsBoolean()
    isCrossMidnight = false;
}

export class CreateShiftDto {

    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    lateGraceMinutes?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsArray()
    @ArrayMinSize(1, {
        message: 'A shift must contain at least 1 work period',
    })
    @ValidateNested({ each: true })
    @Type(() => CreateShiftWorkPeriodDto)
    workPeriods!: CreateShiftWorkPeriodDto[];
}