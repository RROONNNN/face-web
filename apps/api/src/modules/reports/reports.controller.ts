import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccountRole } from '../auth/account-role.enum';
import { AuthGuard } from '../auth/auth.guard';
import { AccountRoles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { QueryMonthlyReportDto } from './dto/query-monthly-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard, RolesGuard)
@AccountRoles([AccountRole.Admin])
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly')
  findMonthly(@Query() input: QueryMonthlyReportDto) {
    return this.reportsService.findMonthly(input);
  }

  @Get('employee/:id')
  findEmployeeMonthly(
    @Param('id', ParseUUIDPipe) employeeId: string,
    @Query() input: QueryMonthlyReportDto,
  ) {
    return this.reportsService.findEmployeeMonthly(employeeId, input.month);
  }
}
