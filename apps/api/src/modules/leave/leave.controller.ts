import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccountRole } from '../auth/account-role.enum';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-req.type';
import { AccountRoles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { QueryLeaveRequestsDto } from './dto/query-leave-requests.dto';
import { RejectLeaveRequestDto } from './dto/reject-leave-request.dto';
import { LeaveService } from './leave.service';

@Controller('leave')
@UseGuards(AuthGuard, RolesGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @AccountRoles([AccountRole.Employee])
  create(
    @Body() input: CreateLeaveRequestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.leaveService.create(input, request.user!);
  }

  @Get('me')
  @AccountRoles([AccountRole.Employee])
  findMine(
    @Query() query: QueryLeaveRequestsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.leaveService.findMine(query, request.user!);
  }

  @Get()
  @AccountRoles([AccountRole.Admin])
  findAll(@Query() query: QueryLeaveRequestsDto) {
    return this.leaveService.findAll(query);
  }

  @Get(':id')
  @AccountRoles([AccountRole.Admin, AccountRole.Employee])
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.leaveService.findOne(id, request.user!);
  }

  @Put(':id/cancel')
  @AccountRoles([AccountRole.Employee])
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.leaveService.cancel(id, request.user!);
  }

  @Put(':id/approve')
  @AccountRoles([AccountRole.Admin])
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.leaveService.approve(id, request.user!);
  }

  @Put(':id/reject')
  @AccountRoles([AccountRole.Admin])
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: RejectLeaveRequestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.leaveService.reject(id, input, request.user!);
  }
}
