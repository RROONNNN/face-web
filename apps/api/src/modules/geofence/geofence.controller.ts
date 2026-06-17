import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AccountRole } from '../auth/account-role.enum';
import { AccountRoles } from '../auth/roles.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UpdateGeofenceDto } from './dto/update-geofence.dto';
import { GeofenceService } from './geofence.service';

@Controller('config/geofence')
@UseGuards(AuthGuard, RolesGuard)
@AccountRoles([AccountRole.Admin])
export class GeofenceController {
  constructor(private readonly geofenceService: GeofenceService) {}

  @Get()
  find() {
    return this.geofenceService.find();
  }

  @Put()
  update(@Body() input: UpdateGeofenceDto) {
    return this.geofenceService.upsert(input);
  }
}
