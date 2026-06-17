import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccountRole } from '../auth/account-role.enum';
import { AuthGuard } from '../auth/auth.guard';
import { AccountRoles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { QueryShiftsDto } from './dto/query-shifts.dto';

@Controller('shifts')
@UseGuards(AuthGuard, RolesGuard)
@AccountRoles([AccountRole.Admin])
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('create')
  create(@Body() createShiftDto: CreateShiftDto) {
    return this.shiftsService.create(createShiftDto);
  }

  @Post()
  createWithRequirementRoute(@Body() createShiftDto: CreateShiftDto) {
    return this.shiftsService.create(createShiftDto);
  }

  @Get()
  findAll(@Query() input: QueryShiftsDto) {
    return this.shiftsService.findAll(input);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateShiftDto: UpdateShiftDto,
  ) {
    return this.shiftsService.update(id, updateShiftDto);
  }

  @Put(':id')
  updateWithRequirementRoute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateShiftDto: UpdateShiftDto,
  ) {
    return this.shiftsService.update(id, updateShiftDto);
  }

  @Put(':id/activate')
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.shiftsService.activate(id);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.shiftsService.delete(id);
  }
}
