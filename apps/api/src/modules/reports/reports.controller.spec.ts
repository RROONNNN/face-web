import { StreamableFile } from '@nestjs/common';
import { ReportsController } from './reports.controller';

describe('ReportsController', () => {
  it('sets Excel download headers and returns a streamable file', async () => {
    const buffer = Buffer.from('xlsx');
    const reportsService = {
      exportMonthlyAttendance: jest.fn().mockResolvedValue({
        buffer,
        fileName: 'attendance-report-2026-06.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    };
    const controller = new ReportsController(reportsService as never);
    const response = { set: jest.fn() };

    const result = await controller.exportMonthlyAttendance(
      { month: '2026-06' },
      response as never,
    );

    expect(reportsService.exportMonthlyAttendance).toHaveBeenCalledWith({
      month: '2026-06',
    });
    expect(response.set).toHaveBeenCalledWith({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="attendance-report-2026-06.xlsx"',
      'Content-Length': '4',
      'Cache-Control': 'no-store',
    });
    expect(result).toBeInstanceOf(StreamableFile);
  });
});
