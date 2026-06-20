import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';
import { CreateShiftWorkPeriodDto } from './create-shift.dto';

export class UpdateShiftDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    lateGraceMinutes?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsArray()
    @ArrayMinSize(1, {
        message: 'A shift must contain at least 1 work period',
    })
    @ValidateNested({ each: true })
    @Type(() => CreateShiftWorkPeriodDto)
    workPeriods?: CreateShiftWorkPeriodDto[];
}
