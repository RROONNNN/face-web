import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeofenceConfig } from './entities/geofence-config.entity';
import { GeofenceController } from './geofence.controller';
import { GeofenceService } from './geofence.service';

@Module({
    imports: [TypeOrmModule.forFeature([GeofenceConfig])],
    controllers: [GeofenceController],
    providers: [GeofenceService],
    exports: [GeofenceService],
})
export class GeofenceModule { }
