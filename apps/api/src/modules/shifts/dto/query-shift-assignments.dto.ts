import { Transform, Type } from 'class-transformer';
import {
    IsDateString,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Min,
} from 'class-validator';
import { ShiftAssignmentSource } from '../enums/shift-assignment-source.enum';

export class QueryShiftAssignmentsDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit = 20;

    /** Filter by employee ID. */
    @IsOptional()
    @IsUUID()
    employeeId?: string;

    /** Search by employee name or code (case-insensitive, partial match). */
    @IsOptional()
    @Transform(({ value }) => String(value).trim())
    @IsString()
    employeeSearch?: string;

    /** Filter by shift ID. */
    @IsOptional()
    @IsUUID()
    shiftId?: string;

    /** Filter by exact work date (YYYY-MM-DD). */
    @IsOptional()
    @IsDateString()
    workDate?: string;

    /** Filter by start of date range (inclusive, YYYY-MM-DD). */
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    /** Filter by end of date range (inclusive, YYYY-MM-DD). */
    @IsOptional()
    @IsDateString()
    dateTo?: string;

    /** Filter by assignment source. */
    @IsOptional()
    @IsIn(Object.values(ShiftAssignmentSource))
    source?: ShiftAssignmentSource;

    @IsOptional()
    @IsIn(['workDate', 'createdAt'])
    sortBy: 'workDate' | 'createdAt' = 'workDate';

    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sortOrder: 'ASC' | 'DESC' = 'DESC';
}
