import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AccountRole } from '../auth/account-role.enum';
import { AuthGuard } from '../auth/auth.guard';
import { AccountRoles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AttendanceService } from './attendance.service';
import { AdminCheckInDto } from './dto/admin-check-in.dto';
import { AdminCheckOutDto } from './dto/admin-check-out.dto';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { QueryByEmployeeAttendanceDto } from './dto/query-by-employee-attendance.dto';
import { SyncCheckInDto, SyncCheckOutDto } from './dto/sync-event.dto';

@Controller('attendance')
@UseGuards(AuthGuard, RolesGuard)
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) { }

    @Post('check-in')
    @AccountRoles([AccountRole.Employee, AccountRole.Admin])
    checkIn(@Body() dto: CheckInDto,) {
        return this.attendanceService.checkIn(dto);
    }

    @Post('check-out')
    @AccountRoles([AccountRole.Employee, AccountRole.Admin])
    checkOut(@Body() dto: CheckOutDto,) {
        return this.attendanceService.checkOut(dto);
    }

    @Post('sync/check-in')
    @AccountRoles([AccountRole.Employee, AccountRole.Admin])
    syncCheckIn(@Body() events: SyncCheckInDto[]) {
        return this.attendanceService.syncCheckIn(events);
    }

    @Post('sync/check-out')
    @AccountRoles([AccountRole.Employee, AccountRole.Admin])
    syncCheckOut(@Body() events: SyncCheckOutDto[]) {
        return this.attendanceService.syncCheckOut(events);
    }

    @Post('manual/check-in')
    @AccountRoles([AccountRole.Admin])
    adminCheckIn(@Body() dto: AdminCheckInDto) {
        return this.attendanceService.adminCheckIn(dto);
    }

    @Post('manual/check-out')
    @AccountRoles([AccountRole.Admin])
    adminCheckOut(@Body() dto: AdminCheckOutDto) {
        return this.attendanceService.adminCheckOut(dto);
    }

    @Get()
    @AccountRoles([AccountRole.Admin])
    findAll(@Query() query: QueryAttendanceDto) {
        return this.attendanceService.findAll(query);
    }

    @Post('admin/finalize-day')
    @AccountRoles([AccountRole.Admin])
    finalizeDay(@Body('workDate') workDate: string) {
        return this.attendanceService.finalizeEndOfDayForDate(workDate);
    }
    @Get('query-by-employee')
    @AccountRoles([AccountRole.Admin])
    queryByEmployee(@Query() query: QueryByEmployeeAttendanceDto) {
        return this.attendanceService.queryByEmployee(query);
    }
}
