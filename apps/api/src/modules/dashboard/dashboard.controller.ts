import { Controller, Get, UseGuards } from '@nestjs/common';
import { AccountRole } from '../auth/account-role.enum';
import { AccountRoles } from '../auth/roles.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AttendanceService } from '../attendance/attendance.service';

@Controller('dashboard')
@UseGuards(AuthGuard, RolesGuard)
@AccountRoles([AccountRole.Admin])
export class DashboardController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('present')
  findPresentToday() {
    return this.attendanceService.findPresentToday();
  }
}
