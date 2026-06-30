import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { AttendanceStatus } from '../attendance/enums/attendance-status.enum';
import { EmployeeShiftAssignment } from '../shifts/entities/employee-shift-assignment.entity';
import { QueryMonthlyAttendanceReportDto } from './dto/query-monthly-attendance-report.dto';

type MonthlyReportAssignment = EmployeeShiftAssignment & {
  reportRecord?: AttendanceRecord | null;
};

type SummaryRow = {
  'Employee Code': string;
  'Employee Name': string;
  Department: string;
  'Scheduled Days': number;
  'Present Days': number;
  'Completed Days': number;
  'Late Days': number;
  'Late Minutes': number;
  'Absent Days': number;
  'Missing Checkout Days': number;
  'On Leave Days': number;
  'Pending Days': number;
  'No Record Days': number;
  'Invalid Days': number;
};

type DetailRow = {
  'Work Date': string;
  'Employee Code': string;
  'Employee Name': string;
  Department: string;
  Shift: string;
  Status: AttendanceStatus | 'no_record';
  'Expected Check-in': string;
  'Expected Check-out': string;
  'Check-in': string;
  'Check-out': string;
  'Late Minutes': number;
  'Check-in Source': string;
  'Check-out Source': string;
};

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(EmployeeShiftAssignment)
    private readonly assignmentRepo: Repository<EmployeeShiftAssignment>,
  ) { }

  async exportMonthlyAttendance(
    query: QueryMonthlyAttendanceReportDto,
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const { startDate, endDate } = this.getMonthBounds(query.month);
    const assignments = await this.getMonthlyAssignments(query, startDate, endDate);
    const { summaryRows, detailRows } = this.buildRows(assignments);
    const buffer = this.buildWorkbook(summaryRows, detailRows);

    return {
      buffer,
      fileName: `attendance-report-${query.month}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private async getMonthlyAssignments(
    query: QueryMonthlyAttendanceReportDto,
    startDate: string,
    endDate: string,
  ): Promise<MonthlyReportAssignment[]> {
    const qb = this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.employee', 'employee')
      .leftJoinAndSelect('assignment.shift', 'shift')
      .leftJoinAndMapOne(
        'assignment.reportRecord',
        AttendanceRecord,
        'record',
        'record.shiftAssignmentId = assignment.id',
      )
      .where('assignment.workDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('assignment.workDate', 'ASC')
      .addOrderBy('employee.name', 'ASC');

    if (query.employeeId) {
      qb.andWhere('assignment.employeeId = :employeeId', {
        employeeId: query.employeeId,
      });
    }

    if (query.departmentId) {
      qb.andWhere('employee.departmentId = :departmentId', {
        departmentId: query.departmentId,
      });
    }

    return qb.getMany() as Promise<MonthlyReportAssignment[]>;
  }

  private buildRows(assignments: MonthlyReportAssignment[]): {
    summaryRows: SummaryRow[];
    detailRows: DetailRow[];
  } {
    const summaryByEmployeeId = new Map<string, SummaryRow>();
    const detailRows: DetailRow[] = [];

    for (const assignment of assignments) {
      const record = assignment.reportRecord ?? null;
      const status = record?.status ?? 'no_record';
      const employee = assignment.employee;
      const summary = this.getSummaryRow(summaryByEmployeeId, assignment);

      this.incrementSummary(summary, status, record?.lateMinutes ?? 0);

      detailRows.push({
        'Work Date': assignment.workDate,
        'Employee Code': employee?.employeeCode ?? '',
        'Employee Name': employee?.name ?? 'Unknown employee',
        Department: employee?.department ?? 'Unassigned',
        Shift: assignment.shift?.name ?? '',
        Status: status,
        'Expected Check-in': this.formatDateTime(record?.expectedCheckInAt),
        'Expected Check-out': this.formatDateTime(record?.expectedCheckOutAt),
        'Check-in': this.formatDateTime(record?.checkedInAt),
        'Check-out': this.formatDateTime(record?.checkedOutAt),
        'Late Minutes': record?.lateMinutes ?? 0,
        'Check-in Source': record?.checkInSource ?? '',
        'Check-out Source': record?.checkOutSource ?? '',
      });
    }

    return {
      summaryRows: [...summaryByEmployeeId.values()].sort((left, right) =>
        left['Employee Name'].localeCompare(right['Employee Name']),
      ),
      detailRows,
    };
  }

  private getSummaryRow(
    summaryByEmployeeId: Map<string, SummaryRow>,
    assignment: MonthlyReportAssignment,
  ): SummaryRow {
    const existing = summaryByEmployeeId.get(assignment.employeeId);
    if (existing) {
      return existing;
    }

    const row: SummaryRow = {
      'Employee Code': assignment.employee?.employeeCode ?? '',
      'Employee Name': assignment.employee?.name ?? 'Unknown employee',
      Department: assignment.employee?.department ?? 'Unassigned',
      'Scheduled Days': 0,
      'Present Days': 0,
      'Completed Days': 0,
      'Late Days': 0,
      'Late Minutes': 0,
      'Absent Days': 0,
      'Missing Checkout Days': 0,
      'On Leave Days': 0,
      'Pending Days': 0,
      'No Record Days': 0,
      'Invalid Days': 0,
    };
    summaryByEmployeeId.set(assignment.employeeId, row);
    return row;
  }

  private incrementSummary(
    row: SummaryRow,
    status: AttendanceStatus | 'no_record',
    lateMinutes: number,
  ): void {
    row['Scheduled Days'] += 1;
    row['Late Minutes'] += lateMinutes;

    if (lateMinutes > 0) {
      row['Late Days'] += 1;
    }

    if (
      status === AttendanceStatus.CHECKED_IN ||
      status === AttendanceStatus.COMPLETED
    ) {
      row['Present Days'] += 1;
    }
    if (status === AttendanceStatus.COMPLETED) row['Completed Days'] += 1;
    if (status === AttendanceStatus.ABSENT) row['Absent Days'] += 1;
    if (status === AttendanceStatus.MISSING_CHECK_OUT) row['Missing Checkout Days'] += 1;
    if (status === AttendanceStatus.ON_LEAVE) row['On Leave Days'] += 1;
    if (status === AttendanceStatus.PENDING) row['Pending Days'] += 1;
    if (status === 'no_record') row['No Record Days'] += 1;
    if (status === AttendanceStatus.INVALID) row['Invalid Days'] += 1;
  }

  private buildWorkbook(summaryRows: SummaryRow[], detailRows: DetailRow[]): Buffer {
    const workbook = XLSX.utils.book_new();
    const summarySheet = this.rowsToSheet<SummaryRow>(summaryRows, [
      'Employee Code',
      'Employee Name',
      'Department',
      'Scheduled Days',
      'Present Days',
      'Completed Days',
      'Late Days',
      'Late Minutes',
      'Absent Days',
      'Missing Checkout Days',
      'On Leave Days',
      'Pending Days',
      'No Record Days',
      'Invalid Days',
    ]);
    const detailSheet = this.rowsToSheet<DetailRow>(detailRows, [
      'Work Date',
      'Employee Code',
      'Employee Name',
      'Department',
      'Shift',
      'Status',
      'Expected Check-in',
      'Expected Check-out',
      'Check-in',
      'Check-out',
      'Late Minutes',
      'Check-in Source',
      'Check-out Source',
    ]);

    summarySheet['!cols'] = [
      { wch: 16 },
      { wch: 24 },
      { wch: 20 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 22 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
    ];
    detailSheet['!cols'] = [
      { wch: 12 },
      { wch: 16 },
      { wch: 24 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Details');

    const workbookBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer',
    }) as Buffer;

    return Buffer.isBuffer(workbookBuffer)
      ? workbookBuffer
      : Buffer.from(workbookBuffer);
  }

  private rowsToSheet<T extends Record<string, string | number>>(
    rows: T[],
    headers: (keyof T & string)[],
  ): XLSX.WorkSheet {
    if (rows.length === 0) {
      return XLSX.utils.aoa_to_sheet([headers]);
    }

    return XLSX.utils.json_to_sheet(rows, { header: headers });
  }

  private getMonthBounds(month: string): { startDate: string; endDate: string } {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
    if (!match) {
      throw new BadRequestException('month must be in YYYY-MM format.');
    }

    const year = Number(match[1]);
    const monthNumber = Number(match[2]);
    const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

    return {
      startDate: `${month}-01`,
      endDate: `${month}-${String(daysInMonth).padStart(2, '0')}`,
    };
  }

  private formatDateTime(value: Date | string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: process.env['APP_TIMEZONE'] ?? 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }
}
