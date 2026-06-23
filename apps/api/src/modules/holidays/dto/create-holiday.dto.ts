import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateHolidayDto {
    /**
     * Date of the holiday in ISO-8601 format: "YYYY-MM-DD".
     * @example "2025-04-30"
     */
    @IsDateString()
    date!: string;

    /**
     * Display name of the holiday.
     * @example "Ngày Giải phóng miền Nam"
     */
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;
}
