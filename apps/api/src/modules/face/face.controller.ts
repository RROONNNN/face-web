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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AccountRole } from '../auth/account-role.enum';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-req.type';
import { AccountRoles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { QueryFaceDataDto } from './dto/query-face-data.dto';
import { QueryUpdatedFaceDataDto } from './dto/query-updated-face-data.dto';
import { SyncFaceDataDto } from './dto/sync-face-data.dto';
import { UpdateFaceDataDto } from './dto/update-face-data.dto';
import { FaceService } from './face.service';

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

  @Post('sync/file')
  @UseInterceptors(FileInterceptor('file'))
  syncFile(
    @UploadedFile()
    file: { buffer?: Buffer; originalname?: string } | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.faceService.syncFromJsonFile(file, request.user);
  }

  @Get('sync')
  @UseGuards(RolesGuard)
  @AccountRoles([AccountRole.Admin, AccountRole.Employee])
  findUpdatedAfter(
    @Query() input: QueryUpdatedFaceDataDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.faceService.findUpdatedAfter(input, request.user);
  }

  @Get()
  @UseGuards(RolesGuard)
  @AccountRoles([AccountRole.Admin])
  findAll(@Query() input: QueryFaceDataDto) {
    return this.faceService.findAll(input);
  }

  @Delete(':empId')
  @UseGuards(RolesGuard)
  @AccountRoles([AccountRole.Admin])
  deleteByEmployeeId(@Param('empId', ParseUUIDPipe) employeeId: string) {
    return this.faceService.deleteByEmployeeId(employeeId);
  }
}
