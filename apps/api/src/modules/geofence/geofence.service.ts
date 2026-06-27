import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpsertGeofenceConfigDto } from './dto/upsert-geofence-config.dto';
import { GeofenceConfig } from './entities/geofence-config.entity';

const COMPANY_GEOFENCE_ID = 'company';
const EARTH_RADIUS_METERS = 6_371_000;

@Injectable()
export class GeofenceService {
    constructor(
        @InjectRepository(GeofenceConfig)
        private readonly geofenceConfigRepo: Repository<GeofenceConfig>,
    ) { }

    findCompanyConfig(): Promise<GeofenceConfig | null> {
        return this.geofenceConfigRepo.findOne({
            where: { id: COMPANY_GEOFENCE_ID },
        });
    }

    async upsertCompanyConfig(dto: UpsertGeofenceConfigDto): Promise<GeofenceConfig> {
        const existing = await this.findCompanyConfig();
        const config = this.geofenceConfigRepo.create({
            id: COMPANY_GEOFENCE_ID,
            centerLat: dto.centerLat ?? null,
            centerLon: dto.centerLon ?? null,
            radiusMeters: dto.radiusMeters ?? null,
            createdAt: existing?.createdAt,
        });

        await this.geofenceConfigRepo.save(config);
        return this.geofenceConfigRepo.findOneOrFail({
            where: { id: COMPANY_GEOFENCE_ID },
        });
    }

    async evaluate(
        latitude?: number | null,
        longitude?: number | null,
    ): Promise<boolean | null> {
        if (latitude == null || longitude == null) {
            return null;
        }

        const config = await this.findCompanyConfig();
        if (
            !config ||
            config.centerLat == null ||
            config.centerLon == null ||
            config.radiusMeters == null
        ) {
            return false;
        }

        const distanceMeters = this.distanceMeters(
            config.centerLat,
            config.centerLon,
            latitude,
            longitude,
        );

        return distanceMeters > config.radiusMeters;
    }

    private distanceMeters(
        startLat: number,
        startLon: number,
        endLat: number,
        endLon: number,
    ): number {
        const deltaLat = this.toRadians(endLat - startLat);
        const deltaLon = this.toRadians(endLon - startLon);
        const startLatRad = this.toRadians(startLat);
        const endLatRad = this.toRadians(endLat);

        const a =
            Math.sin(deltaLat / 2) ** 2 +
            Math.cos(startLatRad) *
            Math.cos(endLatRad) *
            Math.sin(deltaLon / 2) ** 2;

        return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private toRadians(value: number): number {
        return (value * Math.PI) / 180;
    }
}
