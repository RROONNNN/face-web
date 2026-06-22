import {
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    MaxLength,
} from 'class-validator';

export class CreateDepartmentDto {
    /**
     * Short unique identifier, e.g. "IT", "HR", "OPS".
     */
    @IsString()
    @IsNotEmpty()
    @MaxLength(32)
    @Matches(/^[A-Z0-9_-]+$/, {
        message: 'code must contain only uppercase letters, digits, underscores, or hyphens',
    })
    code!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    /**
     * UUID of the default shift for all employees in this department.
     * Required — the referenced shift must be active.
     */
    @IsUUID()
    defaultShiftId!: string;
}
