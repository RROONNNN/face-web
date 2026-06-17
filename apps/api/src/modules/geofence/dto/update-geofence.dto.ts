import { IsLatitude, IsLongitude, IsInt, Max, Min } from 'class-validator';

export class UpdateGeofenceDto {
  @IsLatitude()
  centerLat!: number;

  @IsLongitude()
  centerLon!: number;

  @IsInt()
  @Min(1)
  @Max(100000)
  radiusMeters!: number;
}
