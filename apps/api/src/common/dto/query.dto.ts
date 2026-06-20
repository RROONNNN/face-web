import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryDto {
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

    @IsOptional()
    @Transform(({ value }) => String(value).trim())
    @IsString()
    search?: string;
    @IsOptional()

    @IsIn(['name', 'code', 'createdAt'])
    sortBy: 'name' | 'code' | 'createdAt' = 'createdAt';

    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sortOrder: 'ASC' | 'DESC' = 'DESC';
}
