import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeoConfig } from './entities/geo-config.entity';
import { GeofenceController } from './geofence.controller';
import { GeofenceService } from './geofence.service';

@Module({
  imports: [TypeOrmModule.forFeature([GeoConfig])],
  controllers: [GeofenceController],
  providers: [GeofenceService],
  exports: [GeofenceService],
})
export class GeofenceModule {}
