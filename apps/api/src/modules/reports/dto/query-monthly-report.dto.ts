import { Type } from 'class-transformer';
import { IsOptional, IsUUID, Matches } from 'class-validator';
import { IsInt, Min } from 'class-validator';

export class QueryMonthlyReportDto {
  @Matches(/^\d{4}-\d{2}$/)
  month!: string;

  @IsOptional()
  @IsUUID()
  empId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
