import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseArrayPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AccountRoles } from '../auth/roles.decorator';
import { AccountRole } from '../auth/account-role.enum';
import type { AuthenticatedRequest } from '../auth/authenticated-req.type';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceEventDto } from './dto/create-attendance-event.dto';
import { SyncAttendanceEventDto } from './dto/sync-attendance-event.dto';
import { CreateManualAttendanceEventDto } from './dto/create-manual-attendance-event.dto';
import { UpdateAttendanceEventDto } from './dto/update-attendance-event.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';

@Controller('attendance')
@UseGuards(AuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) { }

  @Post('checkIn')
  checkIn(
    @Body() input: CreateAttendanceEventDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.attendanceService.createCheckIn(input, request.user);
  }

  @Post('checkOut')
  checkOut(
    @Body() input: CreateAttendanceEventDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.attendanceService.createCheckOut(input, request.user);
  }

  @Post('sync/checkIn')
  syncCheckIns(
    @Body(new ParseArrayPipe({ items: SyncAttendanceEventDto }))
    input: SyncAttendanceEventDto[],
    @Req() request: AuthenticatedRequest,
  ) {
    return this.attendanceService.syncCheckIns(input, request.user);
  }

  @Post('sync/checkOut')
  syncCheckOuts(
    @Body(new ParseArrayPipe({ items: SyncAttendanceEventDto }))
    input: SyncAttendanceEventDto[],
    @Req() request: AuthenticatedRequest,
  ) {
    return this.attendanceService.syncCheckOuts(input, request.user);
  }

  @Post('manual/checkIn')
  @UseGuards(RolesGuard)
  @AccountRoles([AccountRole.Admin])
  manualCheckIn(
    @Body() input: CreateManualAttendanceEventDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.attendanceService.createManualCheckIn(input, request.user);
  }

  @Post('manual/checkOut')
  @UseGuards(RolesGuard)
  @AccountRoles([AccountRole.Admin])
  manualCheckOut(
    @Body() input: CreateManualAttendanceEventDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.attendanceService.createManualCheckOut(input, request.user);
  }

  @Put('checkIn/:id')
  @UseGuards(RolesGuard)
  @AccountRoles([AccountRole.Admin])
  updateCheckIn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateAttendanceEventDto,
  ) {
    return this.attendanceService.updateCheckIn(id, input);
  }

  @Put('checkOut/:id')
  @UseGuards(RolesGuard)
  @AccountRoles([AccountRole.Admin])
  updateCheckOut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateAttendanceEventDto,
  ) {
    return this.attendanceService.updateCheckOut(id, input);
  }

  @Delete('checkIn/:id')
  @UseGuards(RolesGuard)
  @AccountRoles([AccountRole.Admin])
  deleteCheckIn(@Param('id', ParseUUIDPipe) id: string) {
    return this.attendanceService.deleteCheckIn(id);
  }

  @Delete('checkOut/:id')
  @UseGuards(RolesGuard)
  @AccountRoles([AccountRole.Admin])
  deleteCheckOut(@Param('id', ParseUUIDPipe) id: string) {
    return this.attendanceService.deleteCheckOut(id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @AccountRoles([AccountRole.Admin])
  findAll(@Query() input: QueryAttendanceDto) {
    return this.attendanceService.query(input);
  }
}
