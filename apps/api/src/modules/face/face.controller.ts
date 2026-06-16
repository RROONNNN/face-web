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
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccountRole } from '../auth/account-role.enum';
import { AccountRoles } from '../auth/roles.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-req.type';
import { FaceService } from './face.service';
import { UpdateFaceDataDto } from './dto/update-face-data.dto';
import { SyncFaceDataDto } from './dto/sync-face-data.dto';

@Controller('face')
@UseGuards(AuthGuard)
export class FaceController {
  constructor(private readonly faceService: FaceService) {}

  @Put('employee/:empId')
  updateEmployeeFace(
    @Param('empId', ParseUUIDPipe) employeeId: string,
    @Body() input: UpdateFaceDataDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.faceService.updateEmployeeFace(employeeId, input, request.user);
  }

  @Post('sync')
  sync(
    @Body(new ParseArrayPipe({ items: SyncFaceDataDto }))
    input: SyncFaceDataDto[],
    @Req() request: AuthenticatedRequest,
  ) {
    return this.faceService.sync(input, request.user);
  }

  @Get()
  @UseGuards(RolesGuard)
  @AccountRoles([AccountRole.Admin])
  findAll() {
    return this.faceService.findAll();
  }

  @Delete(':empId')
  @UseGuards(RolesGuard)
  @AccountRoles([AccountRole.Admin])
  deleteByEmployeeId(@Param('empId', ParseUUIDPipe) employeeId: string) {
    return this.faceService.deleteByEmployeeId(employeeId);
  }
}
