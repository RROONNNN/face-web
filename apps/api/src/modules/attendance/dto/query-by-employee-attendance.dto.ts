import { IsDateString, IsOptional, IsUUID } from "class-validator";

export class QueryByEmployeeAttendanceDto {
    @IsOptional()
    @IsUUID()
    employeeId?: string;
    @IsOptional()
    @IsDateString({ strict: false })
    startDate?: string;

    @IsOptional()
    @IsDateString({ strict: false })
    endDate?: string;

}