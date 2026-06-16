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
import { AccountRoles } from '../auth/roles.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-req.type';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { QueryLeaveRequestsDto } from './dto/query-leave-requests.dto';
import { RejectLeaveRequestDto } from './dto/reject-leave-request.dto';
import { LeaveService } from './leave.service';

@Controller('leave')
@UseGuards(AuthGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  create(
    @Body() input: CreateLeaveRequestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.leaveService.create(input, request.user);
  }

  @Get()
  @UseGuards(RolesGuard)
  @AccountRoles([AccountRole.Admin])
  findAll(@Query() input: QueryLeaveRequestsDto) {
    return this.leaveService.findAll(input);
  }

  @Put(':id/approve')
  @UseGuards(RolesGuard)
  @AccountRoles([AccountRole.Admin])
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.leaveService.approve(id, request.user);
  }

  @Put(':id/reject')
  @UseGuards(RolesGuard)
  @AccountRoles([AccountRole.Admin])
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: RejectLeaveRequestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.leaveService.reject(id, input, request.user);
  }
}
