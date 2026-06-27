import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AccountRole } from '../auth/account-role.enum';
import { AuthGuard } from '../auth/auth.guard';
import { AccountRoles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UpsertGeofenceConfigDto } from './dto/upsert-geofence-config.dto';
import { GeofenceService } from './geofence.service';

@Controller('geofence')
@UseGuards(AuthGuard, RolesGuard)
export class GeofenceController {
    constructor(private readonly geofenceService: GeofenceService) { }

    @Get()
    @AccountRoles([AccountRole.Admin])
    findCompanyConfig() {
        return this.geofenceService.findCompanyConfig();
    }

    @Put()
    @AccountRoles([AccountRole.Admin])
    upsertCompanyConfig(@Body() dto: UpsertGeofenceConfigDto) {
        return this.geofenceService.upsertCompanyConfig(dto);
    }
}
