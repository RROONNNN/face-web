import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { AttendanceStatus } from '../attendance/enums/attendance-status.enum';
import { EmployeeShiftAssignment } from '../shifts/entities/employee-shift-assignment.entity';
import { ShiftWorkPeriod } from '../shifts/entities/shift-work-period.entity';
import {
  LeavePeriodSnapshot,
  LeaveRequestDay,
} from './entities/leave-request-day.entity';
import { LeaveDayScope } from './enums/leave-day-scope.enum';
import { LeaveStatus } from './enums/leave-status.enum';

@Injectable()
export class LeaveReconciliationService {
  constructor(private readonly dataSource: DataSource) {}

  private get appTzOffset(): string {
    return process.env['APP_TZ_OFFSET'] ?? '+07:00';
  }

  async reconcileAssignmentsForDate(workDate: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const assignments = await manager
        .getRepository(EmployeeShiftAssignment)
        .find({
          where: { workDate },
        });

      for (const assignment of assignments) {
        await this.reconcileAssignment(manager, assignment);
      }
    });
  }

  async reconcileAssignment(
    manager: EntityManager,
    assignment: EmployeeShiftAssignment,
  ): Promise<AttendanceRecord> {
    const workPeriods = await manager.getRepository(ShiftWorkPeriod).find({
      where: { shiftId: assignment.shiftId },
      order: { startTime: 'ASC' },
    });

    if (workPeriods.length === 0) {
      throw new ConflictException(
        `Shift assignment ${assignment.id} has no work periods.`,
      );
    }

    const leavePeriodIds = await this.resolveLeavePeriodIds(
      manager,
      assignment.employeeId,
      assignment.workDate,
      workPeriods,
    );

    assignment.leaveShiftWorkPeriodIds = leavePeriodIds;
    await manager.getRepository(EmployeeShiftAssignment).save(assignment);

    const activePeriods = workPeriods.filter(
      (period) => !leavePeriodIds.includes(period.id),
    );
    const effectivePeriods =
      activePeriods.length > 0 ? activePeriods : workPeriods;
    const { expectedCheckInAt, expectedCheckOutAt } = this.periodBounds(
      assignment.workDate,
      effectivePeriods,
    );

    const recordRepository = manager.getRepository(AttendanceRecord);
    let record = await recordRepository.findOne({
      where: { shiftAssignmentId: assignment.id },
    });

    if (!record) {
      record = recordRepository.create({
        employeeId: assignment.employeeId,
        shiftAssignmentId: assignment.id,
        workDate: assignment.workDate,
        status:
          activePeriods.length === 0
            ? AttendanceStatus.ON_LEAVE
            : AttendanceStatus.PENDING,
        expectedCheckInAt,
        expectedCheckOutAt,
        checkedInAt: null,
        checkedOutAt: null,
        auditCheckIn: [],
        auditCheckOut: [],
        lateMinutes: 0,
      });
    } else {
      record.expectedCheckInAt = expectedCheckInAt;
      record.expectedCheckOutAt = expectedCheckOutAt;

      if (!record.checkedInAt && !record.checkedOutAt) {
        record.status =
          activePeriods.length === 0
            ? AttendanceStatus.ON_LEAVE
            : AttendanceStatus.PENDING;
        record.lateMinutes = 0;
      }
    }

    return recordRepository.save(record);
  }

  async resolveLeavePeriodIds(
    manager: EntityManager,
    employeeId: string,
    workDate: string,
    targetPeriods: ShiftWorkPeriod[],
  ): Promise<string[]> {
    const days = await this.findApprovedDays(manager, employeeId, workDate);
    if (days.length === 0) return [];

    if (days.some((day) => day.scope === LeaveDayScope.FULL_DAY)) {
      return targetPeriods.map((period) => period.id);
    }

    const mappedIds = new Set<string>();
    for (const day of days) {
      for (const requested of day.requestedPeriods) {
        const matches = targetPeriods.filter((period) =>
          this.periodsOverlap(requested, period),
        );

        if (matches.length === 0) {
          throw new ConflictException(
            `Approved leave period ${requested.startTime}-${requested.endTime} on ${workDate} cannot be mapped to the target shift.`,
          );
        }

        for (const match of matches) mappedIds.add(match.id);
      }
    }

    return [...mappedIds];
  }

  async assertAttendanceEventAllowed(
    manager: EntityManager,
    assignment: EmployeeShiftAssignment,
    occurredAt: Date,
  ): Promise<void> {
    const workPeriods = await manager.getRepository(ShiftWorkPeriod).find({
      where: { shiftId: assignment.shiftId },
    });
    const leaveIds = new Set(assignment.leaveShiftWorkPeriodIds ?? []);

    if (leaveIds.size === 0) return;
    if (workPeriods.length > 0 && leaveIds.size === workPeriods.length) {
      throw new ConflictException(
        `Attendance is not allowed on full-day leave for ${assignment.workDate}.`,
      );
    }

    const leavePeriods = workPeriods.filter((period) =>
      leaveIds.has(period.id),
    );
    const conflicts = leavePeriods.some((period) => {
      const { start, end } = this.periodDateBounds(assignment.workDate, period);
      return occurredAt >= start && occurredAt < end;
    });

    if (conflicts) {
      throw new ConflictException(
        `Attendance is not allowed during an approved leave period on ${assignment.workDate}.`,
      );
    }
  }

  private async findApprovedDays(
    manager: EntityManager,
    employeeId: string,
    workDate: string,
  ): Promise<LeaveRequestDay[]> {
    return manager
      .getRepository(LeaveRequestDay)
      .createQueryBuilder('day')
      .innerJoinAndSelect('day.leaveRequest', 'leaveRequest')
      .where('leaveRequest.employeeId = :employeeId', { employeeId })
      .andWhere('leaveRequest.status = :status', {
        status: LeaveStatus.APPROVED,
      })
      .andWhere('day.workDate = :workDate', { workDate })
      .getMany();
  }

  private periodsOverlap(
    requested: LeavePeriodSnapshot,
    target: ShiftWorkPeriod,
  ): boolean {
    const requestedRange = this.minuteRange(
      requested.startTime,
      requested.endTime,
      requested.isCrossMidnight,
    );
    const targetRange = this.minuteRange(
      target.startTime,
      target.endTime,
      target.isCrossMidnight,
    );
    return (
      requestedRange.start < targetRange.end &&
      targetRange.start < requestedRange.end
    );
  }

  private minuteRange(
    startTime: string,
    endTime: string,
    isCrossMidnight: boolean,
  ): { start: number; end: number } {
    const toMinutes = (value: string) => {
      const [hours, minutes] = value.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const start = toMinutes(startTime);
    let end = toMinutes(endTime);
    if (isCrossMidnight || end <= start) end += 24 * 60;
    return { start, end };
  }

  private periodBounds(
    workDate: string,
    periods: ShiftWorkPeriod[],
  ): { expectedCheckInAt: Date; expectedCheckOutAt: Date } {
    const bounds = periods.map((period) =>
      this.periodDateBounds(workDate, period),
    );
    return {
      expectedCheckInAt: new Date(
        Math.min(...bounds.map(({ start }) => start.getTime())),
      ),
      expectedCheckOutAt: new Date(
        Math.max(...bounds.map(({ end }) => end.getTime())),
      ),
    };
  }

  private periodDateBounds(
    workDate: string,
    period: Pick<ShiftWorkPeriod, 'startTime' | 'endTime' | 'isCrossMidnight'>,
  ): { start: Date; end: Date } {
    const start = new Date(
      `${workDate}T${period.startTime}${this.appTzOffset}`,
    );
    const end = new Date(`${workDate}T${period.endTime}${this.appTzOffset}`);
    if (period.isCrossMidnight || end <= start) {
      end.setUTCDate(end.getUTCDate() + 1);
    }
    return { start, end };
  }
}
