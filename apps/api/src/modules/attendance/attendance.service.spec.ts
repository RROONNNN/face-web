import { AttendanceService } from './attendance.service';
import { AttendanceEvent } from './entities/attendance-event.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { EmployeeShiftAssignment } from '../shifts/entities/employee-shift-assignment.entity';
import { User } from '../users/entities/user.entity';
import { AttendanceEventType } from './enums/attendance-event.type';
import { AttendanceSource } from './enums/attendance-source.enum';
import { AttendanceStatus } from './enums/attendance-status.enum';

describe('AttendanceService', () => {
  function createMobileAttendanceHarness({
    record,
    isOutOfZone,
  }: {
    record: Partial<AttendanceRecord>;
    isOutOfZone: boolean;
  }) {
    const assignment = {
      id: 'assignment-1',
      employeeId: 'employee-1',
      workDate: '2026-06-23',
      shift: {
        lateGraceMinutes: 5,
      },
    };
    const employee = {
      id: 'employee-1',
      employeeCode: 'EMP001',
      name: 'Employee One',
      department: 'Engineering',
      departmentId: 'department-1',
      jobTitle: 'Engineer',
    };
    const attendanceRecord = {
      id: 'record-1',
      shiftAssignmentId: 'assignment-1',
      employeeId: 'employee-1',
      workDate: '2026-06-23',
      status: AttendanceStatus.PENDING,
      expectedCheckInAt: new Date('2026-06-23T01:00:00.000Z'),
      expectedCheckOutAt: new Date('2026-06-23T10:00:00.000Z'),
      checkedInAt: null,
      checkedOutAt: null,
      auditCheckIn: [],
      auditCheckOut: [],
      lateMinutes: 0,
      ...record,
    } as AttendanceRecord;

    const recordRepo = {
      findOneOrFail: jest.fn().mockResolvedValue(attendanceRecord),
      save: jest.fn(async (value) => value),
    };
    const assignmentRepo = {
      findOne: jest.fn().mockResolvedValue(assignment),
    };
    const userRepo = {
      findOne: jest.fn().mockResolvedValue(employee),
    };
    const transactionEventRepo = {
      save: jest.fn(async (event) => ({ id: 'event-1', ...event })),
    };
    const manager = {
      getRepository: jest.fn((target) => {
        if (target === AttendanceRecord) return recordRepo;
        if (target === AttendanceEvent) return transactionEventRepo;
        if (target === EmployeeShiftAssignment) return assignmentRepo;
        if (target === User) return userRepo;
        throw new Error(`Unexpected repository target ${String(target)}`);
      }),
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    };
    const leaveReconciliationService = {
      reconcileAssignment: jest.fn(),
      assertAttendanceEventAllowed: jest.fn(),
    };
    const geofenceService = {
      evaluate: jest.fn().mockResolvedValue(isOutOfZone),
    };
    const rootEventRepo = {
      create: jest.fn((event) => event),
    };
    const service = new AttendanceService(
      {} as never,
      rootEventRepo as never,
      {} as never,
      dataSource as never,
      leaveReconciliationService as never,
      {} as never,
      geofenceService as never,
    );

    return {
      attendanceRecord,
      recordRepo,
      transactionEventRepo,
      geofenceService,
      service,
    };
  }

  describe('mobile check-in/check-out', () => {
    it('keeps an out-of-zone check-in in audit only without marking the user checked in', async () => {
      const { attendanceRecord, recordRepo, service } = createMobileAttendanceHarness({
        record: {},
        isOutOfZone: true,
      });
      const occurredAt = '2026-06-23T01:08:00.000Z';

      const event = await service.checkIn({
        employeeId: 'employee-1',
        occurredAt,
        source: AttendanceSource.MOBILE_FACE_RECOGNITION,
        latitude: 10.762622,
        longitude: 106.660172,
        deviceId: 'mobile-1',
      });

      expect(event.isOutOfZone).toBe(true);
      expect(attendanceRecord.auditCheckIn).toEqual([
        {
          id: 'event-1',
          occurredAt: new Date(occurredAt),
          source: AttendanceSource.MOBILE_FACE_RECOGNITION,
          deviceId: 'mobile-1',
          latitude: 10.762622,
          longitude: 106.660172,
          isOutOfZone: true,
        },
      ]);
      expect(attendanceRecord.checkedInAt).toBeNull();
      expect(attendanceRecord.status).toBe(AttendanceStatus.PENDING);
      expect(attendanceRecord.checkInSource).toBeUndefined();
      expect(recordRepo.save).toHaveBeenCalledWith(attendanceRecord);
    });

    it('keeps an out-of-zone check-out in audit only without marking the user checked out', async () => {
      const checkedInAt = new Date('2026-06-23T01:03:00.000Z');
      const { attendanceRecord, recordRepo, service } = createMobileAttendanceHarness({
        record: {
          status: AttendanceStatus.CHECKED_IN,
          checkedInAt,
          checkInSource: AttendanceSource.MOBILE_FACE_RECOGNITION,
        },
        isOutOfZone: true,
      });
      const occurredAt = '2026-06-23T10:07:00.000Z';

      const event = await service.checkOut({
        employeeId: 'employee-1',
        occurredAt,
        source: AttendanceSource.MOBILE_FACE_RECOGNITION,
        latitude: 10.762622,
        longitude: 106.660172,
        deviceId: 'mobile-1',
      });

      expect(event.isOutOfZone).toBe(true);
      expect(attendanceRecord.auditCheckOut).toEqual([
        {
          id: 'event-1',
          occurredAt: new Date(occurredAt),
          source: AttendanceSource.MOBILE_FACE_RECOGNITION,
          deviceId: 'mobile-1',
          latitude: 10.762622,
          longitude: 106.660172,
          isOutOfZone: true,
        },
      ]);
      expect(attendanceRecord.checkedOutAt).toBeNull();
      expect(attendanceRecord.status).toBe(AttendanceStatus.CHECKED_IN);
      expect(attendanceRecord.checkOutSource).toBeUndefined();
      expect(recordRepo.save).toHaveBeenCalledWith(attendanceRecord);
    });

    it('does not replace an existing checkout timestamp', async () => {
      const checkedOutAt = new Date('2026-06-23T10:01:00.000Z');
      const { attendanceRecord, service } = createMobileAttendanceHarness({
        record: {
          status: AttendanceStatus.COMPLETED,
          checkedInAt: new Date('2026-06-23T01:03:00.000Z'),
          checkedOutAt,
          checkOutSource: AttendanceSource.MOBILE_FACE_RECOGNITION,
        },
        isOutOfZone: false,
      });

      await service.checkOut({
        employeeId: 'employee-1',
        occurredAt: '2026-06-23T10:15:00.000Z',
        source: AttendanceSource.MOBILE_FACE_RECOGNITION,
        latitude: 10.762622,
        longitude: 106.660172,
        deviceId: 'mobile-1',
      });

      expect(attendanceRecord.checkedOutAt).toBe(checkedOutAt);
      expect(attendanceRecord.status).toBe(AttendanceStatus.COMPLETED);
    });
  });

  describe('queryByEmployee', () => {
    it('filters records, returns summary counts, and enriches audits from attendance events', async () => {
      const completedRecord = {
        id: 'record-1',
        employeeId: 'employee-1',
        workDate: '2026-06-23',
        status: AttendanceStatus.COMPLETED,
        auditCheckIn: [],
        auditCheckOut: [],
      };
      const absentRecord = {
        id: 'record-2',
        employeeId: 'employee-1',
        workDate: '2026-06-24',
        status: AttendanceStatus.ABSENT,
        auditCheckIn: [],
        auditCheckOut: [],
      };
      const recordItems = [completedRecord, absentRecord];

      const recordQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(recordItems),
      };
      const eventQb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'event-check-in',
            attendanceRecordId: 'record-1',
            type: AttendanceEventType.CHECK_IN,
            occurredAt: new Date('2026-06-23T01:09:00.000Z'),
            source: AttendanceSource.MOBILE_FACE_RECOGNITION,
            deviceId: 'mobile-1',
            latitude: 10.762622,
            longitude: 106.660172,
            isOutOfZone: false,
          },
          {
            id: 'event-check-out',
            attendanceRecordId: 'record-1',
            type: AttendanceEventType.CHECK_OUT,
            occurredAt: new Date('2026-06-23T10:26:00.000Z'),
            source: AttendanceSource.MOBILE_FACE_RECOGNITION,
            deviceId: 'mobile-1',
            latitude: null,
            longitude: null,
            isOutOfZone: null,
          },
        ]),
      };
      const holidays = [
        {
          id: 'holiday-1',
          date: '2026-06-25',
          name: 'Company Holiday',
          description: null,
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
          updatedAt: new Date('2026-06-01T00:00:00.000Z'),
        },
      ];
      const holidaysService = {
        findByMonth: jest.fn().mockResolvedValue(holidays),
      };

      const service = new AttendanceService(
        { createQueryBuilder: jest.fn().mockReturnValue(recordQb) } as never,
        { createQueryBuilder: jest.fn().mockReturnValue(eventQb) } as never,
        {} as never,
        {} as never,
        {} as never,
        holidaysService as never,
        { evaluate: jest.fn().mockResolvedValue(null) } as never,
      );

      const result = await service.queryByEmployee({
        employeeId: 'employee-1',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      });

      expect(recordQb.andWhere).toHaveBeenCalledWith(
        'record.employeeId = :employeeId',
        { employeeId: 'employee-1' },
      );
      expect(recordQb.andWhere).toHaveBeenCalledWith(
        'record.workDate >= :startDate',
        { startDate: '2026-06-01' },
      );
      expect(recordQb.andWhere).toHaveBeenCalledWith(
        'record.workDate <= :endDate',
        { endDate: '2026-06-30' },
      );
      expect(eventQb.where).toHaveBeenCalledWith(
        'event.attendanceRecordId IN (:...recordIds)',
        { recordIds: ['record-1', 'record-2'] },
      );
      expect(holidaysService.findByMonth).toHaveBeenCalledWith('2026-06-01');
      expect(result.metaData).toEqual({
        presentCount: 1,
        leaveCount: 0,
        absentCount: 1,
        missingCheckOutCount: 0,
        holidays,
      });
      expect(result.items[0].auditCheckIn).toEqual([
        {
          id: 'event-check-in',
          occurredAt: new Date('2026-06-23T01:09:00.000Z'),
          source: AttendanceSource.MOBILE_FACE_RECOGNITION,
          deviceId: 'mobile-1',
          latitude: 10.762622,
          longitude: 106.660172,
          isOutOfZone: false,
        },
      ]);
      expect(result.items[0].auditCheckOut).toEqual([
        {
          id: 'event-check-out',
          occurredAt: new Date('2026-06-23T10:26:00.000Z'),
          source: AttendanceSource.MOBILE_FACE_RECOGNITION,
          deviceId: 'mobile-1',
          latitude: null,
          longitude: null,
          isOutOfZone: null,
        },
      ]);
    });
  });

  describe('getAdminDashboard', () => {
    function createAssignment(index: number, departmentId: string | null) {
      return {
        id: `assignment-${index}`,
        employeeId: `employee-${index}`,
        workDate: '2026-06-23',
        employee: {
          id: `employee-${index}`,
          employeeCode: `EMP${index}`,
          name: `Employee ${index}`,
          departmentId,
          department: departmentId ? 'Engineering' : null,
        },
        shift: {
          id: `shift-${index}`,
          name: 'Morning',
          workPeriods: [
            {
              startTime: '08:00:00',
              endTime: '17:00:00',
              isCrossMidnight: false,
            },
          ],
        },
      };
    }

    function createRecord(
      assignmentId: string,
      employeeId: string,
      status: AttendanceStatus,
      lateMinutes = 0,
    ) {
      return {
        id: `record-${assignmentId}`,
        shiftAssignmentId: assignmentId,
        employeeId,
        status,
        workDate: '2026-06-23',
        expectedCheckInAt: new Date('2026-06-23T01:00:00.000Z'),
        expectedCheckOutAt: new Date('2026-06-23T10:00:00.000Z'),
        checkedInAt: status === AttendanceStatus.PENDING ? null : new Date('2026-06-23T01:12:00.000Z'),
        checkedOutAt: status === AttendanceStatus.COMPLETED ? new Date('2026-06-23T10:05:00.000Z') : null,
        lateMinutes,
      };
    }

    function createService(assignments: ReturnType<typeof createAssignment>[], records: ReturnType<typeof createRecord>[]) {
      const recordsByAssignmentId = new Map(
        records.map((record) => [record.shiftAssignmentId, record]),
      );
      const assignmentsWithRecords = assignments.map((assignment) => ({
        ...assignment,
        dashboardRecord: recordsByAssignmentId.get(assignment.id) ?? null,
      }));
      const assignmentQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndMapOne: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(assignmentsWithRecords),
      };
      const service = new AttendanceService(
        {} as never,
        {} as never,
        { createQueryBuilder: jest.fn().mockReturnValue(assignmentQb) } as never,
        {} as never,
        {} as never,
        {} as never,
        { evaluate: jest.fn().mockResolvedValue(null) } as never,
      );

      return { assignmentQb, service };
    }

    it('summarizes assignment attendance including assignments without records', async () => {
      const assignments = [
        createAssignment(1, 'department-1'),
        createAssignment(2, 'department-1'),
        createAssignment(3, 'department-1'),
        createAssignment(4, 'department-1'),
        createAssignment(5, 'department-1'),
        createAssignment(6, 'department-1'),
        createAssignment(7, 'department-1'),
        createAssignment(8, null),
      ];
      const records = [
        createRecord('assignment-1', 'employee-1', AttendanceStatus.PENDING),
        createRecord('assignment-2', 'employee-2', AttendanceStatus.CHECKED_IN, 14),
        createRecord('assignment-3', 'employee-3', AttendanceStatus.COMPLETED),
        createRecord('assignment-4', 'employee-4', AttendanceStatus.ABSENT),
        createRecord('assignment-5', 'employee-5', AttendanceStatus.MISSING_CHECK_OUT),
        createRecord('assignment-6', 'employee-6', AttendanceStatus.ON_LEAVE),
        createRecord('assignment-7', 'employee-7', AttendanceStatus.INVALID),
      ];
      const { service } = createService(assignments, records);

      const result = await service.getAdminDashboard({ workDate: '2026-06-23' });

      expect(result.workDate).toBe('2026-06-23');
      expect(result.timezone).toBe('Asia/Ho_Chi_Minh');
      expect(result.totals).toEqual({
        scheduled: 8,
        pending: 1,
        checkedIn: 1,
        completed: 1,
        late: 1,
        absent: 1,
        missingCheckOut: 1,
        onLeave: 1,
        invalid: 1,
        noRecord: 1,
      });
      expect(result.rates).toMatchObject({
        attendanceRate: 25,
        completionRate: 12.5,
        lateRate: 12.5,
      });
      expect(result.actions).toEqual({
        canFinalizeDay: true,
        finalizablePendingCount: 1,
        finalizableCheckedInCount: 1,
      });
      expect(result.departments).toEqual([
        expect.objectContaining({
          id: 'department-1',
          scheduled: 7,
          pending: 1,
          checkedIn: 1,
          completed: 1,
          late: 1,
          absent: 1,
          missingCheckOut: 1,
          onLeave: 1,
        }),
        expect.objectContaining({
          id: null,
          name: 'Unassigned',
          scheduled: 1,
          pending: 1,
        }),
      ]);
      expect(result.attention.map((row) => row.status)).toEqual([
        AttendanceStatus.MISSING_CHECK_OUT,
        AttendanceStatus.ABSENT,
        AttendanceStatus.INVALID,
        AttendanceStatus.CHECKED_IN,
        AttendanceStatus.PENDING,
        'no_record',
      ]);
      expect(result.attention.find((row) => row.status === 'no_record')).toMatchObject({
        recordId: null,
        recommendedAction: 'manual_check_in',
      });
    });

    it('applies the department filter to dashboard assignment aggregation', async () => {
      const assignments = [createAssignment(1, 'department-1')];
      const records = [createRecord('assignment-1', 'employee-1', AttendanceStatus.COMPLETED)];
      const { assignmentQb, service } = createService(assignments, records);

      await service.getAdminDashboard({
        workDate: '2026-06-23',
        departmentId: 'department-1',
      });

      expect(assignmentQb.andWhere).toHaveBeenCalledWith(
        'department.id = :departmentId',
        { departmentId: 'department-1' },
      );
    });
  });
});
