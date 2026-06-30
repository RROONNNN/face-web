import { Controller, Get, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { AccountRole } from '../auth/account-role.enum';
import { AuthGuard } from '../auth/auth.guard';
import { AccountRoles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { QueryMonthlyAttendanceReportDto } from './dto/query-monthly-attendance-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  @Get('attendance/monthly')
  @AccountRoles([AccountRole.Admin])
  @SkipTransform()
  async exportMonthlyAttendance(
    @Query() query: QueryMonthlyAttendanceReportDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const report = await this.reportsService.exportMonthlyAttendance(query);

    response.set({
      'Content-Type': report.mimeType,
      'Content-Disposition': `attachment; filename="${report.fileName}"`,
      'Content-Length': report.buffer.length.toString(),
      'Cache-Control': 'no-store',
    });

    return new StreamableFile(report.buffer);
  }
}
