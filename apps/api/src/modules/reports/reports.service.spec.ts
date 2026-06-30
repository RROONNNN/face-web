import * as XLSX from 'xlsx';
import { AttendanceStatus } from '../attendance/enums/attendance-status.enum';
import { AttendanceSource } from '../attendance/enums/attendance-source.enum';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  function createAssignment(
    index: number,
    status: AttendanceStatus | 'no_record',
    lateMinutes = 0,
  ) {
    const workDate = `2026-06-${String(index).padStart(2, '0')}`;
    const record =
      status === 'no_record'
        ? null
        : {
          id: `record-${index}`,
          shiftAssignmentId: `assignment-${index}`,
          employeeId: 'employee-1',
          workDate,
          status,
          expectedCheckInAt: new Date(`${workDate}T01:00:00.000Z`),
          expectedCheckOutAt: new Date(`${workDate}T10:00:00.000Z`),
          checkedInAt:
            status === AttendanceStatus.PENDING ||
              status === AttendanceStatus.ABSENT ||
              status === AttendanceStatus.ON_LEAVE
              ? null
              : new Date(`${workDate}T01:12:00.000Z`),
          checkedOutAt:
            status === AttendanceStatus.COMPLETED
              ? new Date(`${workDate}T10:05:00.000Z`)
              : null,
          lateMinutes,
          checkInSource:
            status === AttendanceStatus.PENDING ||
              status === AttendanceStatus.ABSENT ||
              status === AttendanceStatus.ON_LEAVE
              ? null
              : AttendanceSource.MOBILE_FACE_RECOGNITION,
          checkOutSource:
            status === AttendanceStatus.COMPLETED
              ? AttendanceSource.ADMIN_MANUAL
              : null,
        };

    return {
      id: `assignment-${index}`,
      employeeId: 'employee-1',
      workDate,
      employee: {
        id: 'employee-1',
        employeeCode: 'EMP001',
        name: 'Jane Employee',
        department: 'Engineering',
        departmentId: 'department-1',
      },
      shift: {
        id: 'shift-1',
        name: 'Morning',
      },
      reportRecord: record,
    };
  }

  function createService(assignments: ReturnType<typeof createAssignment>[]) {
    const assignmentQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndMapOne: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(assignments),
    };
    const service = new ReportsService({
      createQueryBuilder: jest.fn().mockReturnValue(assignmentQb),
    } as never);

    return { assignmentQb, service };
  }

  it('exports a monthly workbook with summary and detail sheets', async () => {
    const assignments = [
      createAssignment(1, AttendanceStatus.PENDING),
      createAssignment(2, AttendanceStatus.CHECKED_IN, 12),
      createAssignment(3, AttendanceStatus.COMPLETED),
      createAssignment(4, AttendanceStatus.ABSENT),
      createAssignment(5, AttendanceStatus.MISSING_CHECK_OUT),
      createAssignment(6, AttendanceStatus.ON_LEAVE),
      createAssignment(7, AttendanceStatus.INVALID),
      createAssignment(8, 'no_record'),
    ];
    const { service } = createService(assignments);

    const report = await service.exportMonthlyAttendance({ month: '2026-06' });
    const workbook = XLSX.read(report.buffer, { type: 'buffer' });
    const summary = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets['Summary'],
      { defval: '' },
    );
    const details = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets['Details'],
      { defval: '' },
    );

    expect(report.fileName).toBe('attendance-report-2026-06.xlsx');
    expect(report.buffer.length).toBeGreaterThan(0);
    expect(workbook.SheetNames).toEqual(['Summary', 'Details']);
    expect(summary).toEqual([
      expect.objectContaining({
        'Employee Code': 'EMP001',
        'Employee Name': 'Jane Employee',
        Department: 'Engineering',
        'Scheduled Days': 8,
        'Present Days': 2,
        'Completed Days': 1,
        'Late Days': 1,
        'Late Minutes': 12,
        'Absent Days': 1,
        'Missing Checkout Days': 1,
        'On Leave Days': 1,
        'Pending Days': 1,
        'No Record Days': 1,
        'Invalid Days': 1,
      }),
    ]);
    expect(details.map((row) => row['Status'])).toEqual([
      AttendanceStatus.PENDING,
      AttendanceStatus.CHECKED_IN,
      AttendanceStatus.COMPLETED,
      AttendanceStatus.ABSENT,
      AttendanceStatus.MISSING_CHECK_OUT,
      AttendanceStatus.ON_LEAVE,
      AttendanceStatus.INVALID,
      'no_record',
    ]);
  });

  it('queries the requested month and optional employee and department filters', async () => {
    const { assignmentQb, service } = createService([]);

    await service.exportMonthlyAttendance({
      month: '2026-02',
      employeeId: '6f776774-5765-4b51-898a-d12895d22ebf',
      departmentId: '6d3f3637-af22-4b78-8c14-6f7e6df76693',
    });

    expect(assignmentQb.where).toHaveBeenCalledWith(
      'assignment.workDate BETWEEN :startDate AND :endDate',
      { startDate: '2026-02-01', endDate: '2026-02-28' },
    );
    expect(assignmentQb.andWhere).toHaveBeenCalledWith(
      'assignment.employeeId = :employeeId',
      { employeeId: '6f776774-5765-4b51-898a-d12895d22ebf' },
    );
    expect(assignmentQb.andWhere).toHaveBeenCalledWith(
      'employee.departmentId = :departmentId',
      { departmentId: '6d3f3637-af22-4b78-8c14-6f7e6df76693' },
    );
  });

  it('rejects invalid month values', async () => {
    const { service } = createService([]);

    await expect(
      service.exportMonthlyAttendance({ month: '2026-13' }),
    ).rejects.toThrow('month must be in YYYY-MM format.');
  });
});
