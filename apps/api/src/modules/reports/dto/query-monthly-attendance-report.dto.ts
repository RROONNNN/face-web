import { IsOptional, IsUUID, Matches } from 'class-validator';

export class QueryMonthlyAttendanceReportDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format.',
  })
  month!: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
