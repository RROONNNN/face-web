import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryHolidaysDto {
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

    /**
     * Filter by year, e.g. 2025.
     */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    year?: number;

    /**
     * Search by holiday name.
     */
    @IsOptional()
    @Transform(({ value }) => String(value).trim())
    @IsString()
    search?: string;

    @IsOptional()
    @IsIn(['date', 'name', 'createdAt'])
    sortBy: 'date' | 'name' | 'createdAt' = 'date';

    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sortOrder: 'ASC' | 'DESC' = 'ASC';
}
