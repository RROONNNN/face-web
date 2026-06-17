import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccountRole } from '../auth/account-role.enum';
import { AccountRoles } from '../auth/roles.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UsersService } from './users.service';

@Controller('employees')
@UseGuards(AuthGuard, RolesGuard)
@AccountRoles([AccountRole.Admin])
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  createEmployee(@Body() input: CreateEmployeeDto) {
    return this.usersService.createEmployee(input);
  }

  @Get()
  findEmployees(@Query() input: QueryEmployeesDto) {
    return this.usersService.findEmployees(input);
  }

  @Get(':id')
  findEmployee(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findEmployee(id);
  }

  @Put(':id')
  updateEmployee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateEmployeeDto,
  ) {
    return this.usersService.updateEmployee(id, input);
  }
}
