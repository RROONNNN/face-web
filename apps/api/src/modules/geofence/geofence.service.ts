import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateGeofenceDto } from './dto/update-geofence.dto';
import { GeoConfig } from './entities/geo-config.entity';

const SINGLETON_ID = 'company';
const EARTH_RADIUS_METERS = 6371000;

@Injectable()
export class GeofenceService {
  constructor(
    @InjectRepository(GeoConfig)
    private readonly geoConfigRepository: Repository<GeoConfig>,
  ) {}

  async find() {
    const config = await this.geoConfigRepository.findOne({
      where: { id: SINGLETON_ID },
    });

    return config ?? null;
  }

  async upsert(input: UpdateGeofenceDto) {
    const existing = await this.geoConfigRepository.findOne({
      where: { id: SINGLETON_ID },
    });

    const config = existing ?? this.geoConfigRepository.create({ id: SINGLETON_ID });
    config.centerLat = input.centerLat;
    config.centerLon = input.centerLon;
    config.radiusMeters = input.radiusMeters;

    return this.geoConfigRepository.save(config);
  }

  async isOutOfZone(latitude: number | null, longitude: number | null) {
    if (latitude === null || longitude === null) {
      return false;
    }

    const config = await this.find();

    if (!config) {
      return false;
    }

    return (
      this.distanceInMeters(
        latitude,
        longitude,
        config.centerLat,
        config.centerLon,
      ) > config.radiusMeters
    );
  }

  private distanceInMeters(
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number,
  ) {
    const fromLatRad = this.toRadians(fromLat);
    const toLatRad = this.toRadians(toLat);
    const deltaLat = this.toRadians(toLat - fromLat);
    const deltaLon = this.toRadians(toLon - fromLon);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(fromLatRad) *
        Math.cos(toLatRad) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);

    return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRadians(value: number) {
    return (value * Math.PI) / 180;
  }
}
