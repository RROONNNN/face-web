import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { QueryDto } from '../../../common/dto/query.dto';

export class QueryDepartmentsDto extends QueryDto {
    @IsOptional()
    @Transform(({ value }: { value: any }): boolean => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    isActive?: boolean;
}
