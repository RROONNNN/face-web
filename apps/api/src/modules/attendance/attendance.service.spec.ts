import { AttendanceService } from './attendance.service';
import { AttendanceEventType } from './enums/attendance-event.type';
import { AttendanceSource } from './enums/attendance-source.enum';
import { AttendanceStatus } from './enums/attendance-status.enum';

describe('AttendanceService', () => {
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
            attendanceRecordId: 'record-1',
            type: AttendanceEventType.CHECK_OUT,
            occurredAt: new Date('2026-06-23T10:26:00.000Z'),
            source: AttendanceSource.FINGERPRINT_DEVICE,
            deviceId: 'fingerprint-1',
            latitude: null,
            longitude: null,
            isOutOfZone: null,
          },
        ]),
      };

      const service = new AttendanceService(
        { createQueryBuilder: jest.fn().mockReturnValue(recordQb) } as never,
        { createQueryBuilder: jest.fn().mockReturnValue(eventQb) } as never,
        {} as never,
        {} as never,
        {} as never,
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
      expect(result.metaData).toEqual({
        presentCount: 1,
        leaveCount: 0,
        absentCount: 1,
        missingCheckOutCount: 0,
      });
      expect(result.items[0].auditCheckIn).toEqual([
        {
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
          occurredAt: new Date('2026-06-23T10:26:00.000Z'),
          source: AttendanceSource.FINGERPRINT_DEVICE,
          deviceId: 'fingerprint-1',
          latitude: null,
          longitude: null,
          isOutOfZone: null,
        },
      ]);
    });
  });
});
