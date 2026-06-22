import { Transform, Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Min,
} from 'class-validator';
import { AccountRole } from '../../auth/account-role.enum';

export class QueryUsersDto {
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

    /** Search by name or employeeCode (case-insensitive, partial match). */
    @IsOptional()
    @Transform(({ value }) => String(value).trim())
    @IsString()
    search?: string;

    /** Filter by department UUID. */
    @IsOptional()
    @IsUUID()
    departmentId?: string;

    /** Filter by account role. */
    @IsOptional()
    @IsEnum(AccountRole)
    accountRole?: AccountRole;

    /** Filter by active status. Defaults to returning all. */
    @IsOptional()
    @Transform(({ value }: { value: any }): boolean => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsIn(['name', 'employeeCode', 'createdAt'])
    sortBy: 'name' | 'employeeCode' | 'createdAt' = 'createdAt';

    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sortOrder: 'ASC' | 'DESC' = 'DESC';
}
