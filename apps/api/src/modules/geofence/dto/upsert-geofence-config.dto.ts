import { IsInt, IsLatitude, IsLongitude, IsNumber, IsOptional, Min } from 'class-validator';

export class UpsertGeofenceConfigDto {
    @IsOptional()
    @IsNumber()
    @IsLatitude()
    centerLat?: number | null;

    @IsOptional()
    @IsNumber()
    @IsLongitude()
    centerLon?: number | null;

    @IsOptional()
    @IsInt()
    @Min(1)
    radiusMeters?: number | null;
}
