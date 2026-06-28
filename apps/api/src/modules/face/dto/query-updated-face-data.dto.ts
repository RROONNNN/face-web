import { IsISO8601, IsOptional } from 'class-validator';

export class QueryUpdatedFaceDataDto {
    @IsOptional()
    @IsISO8601()
    from_date?: string;
}
