import {
    IsDateString,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';
import { AccountRole } from '../../auth/account-role.enum';

export class CreateUserDto {
    /**
     * Unique employee code, e.g. "EMP001".
     * If omitted, auto-generated from `dateOfBirth` (format: EMP{YYYYMMDD}).
     * Either `employeeCode` or `dateOfBirth` must be provided.
     */
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(32)
    employeeCode?: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    name!: string;

    /**
     * Plain-text password — will be hashed in the service layer.
     */
    @IsString()
    @MinLength(6)
    password!: string;

    @IsOptional()
    @IsEnum(AccountRole)
    accountRole?: AccountRole;

    /**
     * UUID of the Department the employee belongs to.
     * Must reference an active department.
     */
    @IsOptional()
    @IsUUID()
    departmentId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    jobTitle?: string;

    @IsOptional()
    @IsString()
    @MaxLength(32)
    phone?: string;

    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    email?: string;

    /**
     * Date of birth in YYYY-MM-DD format.
     */
    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;
}
