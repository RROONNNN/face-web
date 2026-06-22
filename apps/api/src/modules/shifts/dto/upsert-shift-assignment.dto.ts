import {
    IsArray,
    IsDateString,
    IsOptional,
    IsString,
    IsUUID,
} from 'class-validator';

export class UpsertShiftAssignmentDto {
    /** UUID of the employee to assign. */
    @IsUUID()
    employeeId!: string;

    /** UUID of the shift to assign. Must be active. */
    @IsUUID()
    shiftId!: string;

    /**
     * The work date for the assignment in YYYY-MM-DD format.
     * This is the local date in the configured application timezone.
     */
    @IsDateString()
    workDate!: string;

    /** Optional admin note about this assignment. */
    @IsOptional()
    @IsString()
    note?: string;

    /**
     * Work period IDs within the assigned shift that the employee is on leave for.
     * These periods are excluded when calculating expectedCheckIn/Out.
     */
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    leaveShiftWorkPeriodIds?: string[];
}
