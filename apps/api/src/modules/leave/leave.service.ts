import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { AccountRole } from '../auth/account-role.enum';
import { CurrentUser } from '../auth/current-user.interface';
import { Holiday } from '../holidays/entities/holiday.entity';
import { EmployeeShiftAssignment } from '../shifts/entities/employee-shift-assignment.entity';
import { ShiftWorkPeriod } from '../shifts/entities/shift-work-period.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { ShiftAssignmentSource } from '../shifts/enums/shift-assignment-source.enum';
import { User } from '../users/entities/user.entity';
import {
  CreateLeaveRequestDto,
  PartialLeaveDayDto,
} from './dto/create-leave-request.dto';
import { QueryLeaveRequestsDto } from './dto/query-leave-requests.dto';
import { RejectLeaveRequestDto } from './dto/reject-leave-request.dto';
import {
  LeavePeriodSnapshot,
  LeaveRequestDay,
} from './entities/leave-request-day.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { LeaveDayScope } from './enums/leave-day-scope.enum';
import { LeaveStatus } from './enums/leave-status.enum';
import { LeaveReconciliationService } from './leave-reconciliation.service';

type LeaveRequestResponse = ReturnType<LeaveService['toResponse']>;

@Injectable()
export class LeaveService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly reconciliationService: LeaveReconciliationService,
  ) { }

  private get appTimezone(): string {
    return process.env['APP_TIMEZONE'] ?? 'Asia/Ho_Chi_Minh';
  }

  async create(
    input: CreateLeaveRequestDto,
    currentUser: CurrentUser,
  ): Promise<LeaveRequestResponse> {
    const dates = this.enumerateDates(input.startDate, input.endDate);
    const today = this.todayWorkDate();
    if (input.startDate < today) {
      throw new BadRequestException('Leave requests cannot start in the past.');
    }
    if (dates.length > 14) {
      throw new BadRequestException('A leave request cannot exceed 14 days.');
    }

    return this.runSerializable(async (manager) => {
      await this.ensureActiveEmployee(manager, currentUser.id);

      const holidays = await manager.getRepository(Holiday).find({
        where: dates.map((d) => ({ date: d })),
        select: { date: true },
      });
      const holidaySet = new Set(holidays.map((h) => h.date));
      const workDates = dates.filter((d) => !holidaySet.has(d));
      if (workDates.length === 0) {
        throw new BadRequestException(
          'All requested dates fall on public holidays.',
        );
      }

      const partialDays = await this.preparePartialDays(
        manager,
        workDates,
        input.partialDays ?? [],
        currentUser.id,
        input.departmentShiftId,
      );
      const proposedDays = workDates.map((workDate) => {
        const partial = partialDays.get(workDate);
        return {
          workDate,
          scope: partial?.scope ?? LeaveDayScope.FULL_DAY,
          requestedPeriods: partial?.requestedPeriods ?? [],
        };
      });

      await this.assertNoOverlap(manager, currentUser.id, proposedDays);

      const requestRepository = manager.getRepository(LeaveRequest);
      const leaveRequest = await requestRepository.save(
        requestRepository.create({
          employeeId: currentUser.id,
          startDate: input.startDate,
          endDate: input.endDate,
          reason: input.reason,
          status: LeaveStatus.PENDING,
          reviewedById: null,
          reviewedAt: null,
          rejectionReason: null,
          cancelledAt: null,
        }),
      );

      const dayRepository = manager.getRepository(LeaveRequestDay);
      await dayRepository.save(
        proposedDays.map((day) =>
          dayRepository.create({
            leaveRequestId: leaveRequest.id,
            ...day,
          }),
        ),
      );

      return this.toResponse(await this.loadRequest(manager, leaveRequest.id));
    });
  }

  findMine(
    query: QueryLeaveRequestsDto,
    currentUser: CurrentUser,
  ): Promise<PaginatedResponse<LeaveRequestResponse>> {
    return this.findAllInternal({ ...query, employeeId: currentUser.id });
  }

  findAll(
    query: QueryLeaveRequestsDto,
  ): Promise<PaginatedResponse<LeaveRequestResponse>> {
    return this.findAllInternal(query);
  }

  async findOne(
    id: string,
    currentUser: CurrentUser,
  ): Promise<LeaveRequestResponse> {
    const request = await this.loadRequest(this.dataSource.manager, id);
    const isAdmin = currentUser.roles.includes(AccountRole.Admin);
    if (!isAdmin && request.employeeId !== currentUser.id) {
      throw new ForbiddenException(
        'You can only view your own leave requests.',
      );
    }
    return this.toResponse(request);
  }

  async cancel(
    id: string,
    currentUser: CurrentUser,
  ): Promise<LeaveRequestResponse> {
    return this.dataSource.transaction(async (manager) => {
      const request = await this.loadLockedRequest(manager, id);
      if (request.employeeId !== currentUser.id) {
        throw new ForbiddenException(
          'You can only cancel your own leave requests.',
        );
      }
      this.assertPending(request);

      request.status = LeaveStatus.CANCELLED;
      request.cancelledAt = new Date();
      await manager.getRepository(LeaveRequest).save(request);
      return this.toResponse(await this.loadRequest(manager, id));
    });
  }

  async approve(
    id: string,
    currentUser: CurrentUser,
  ): Promise<LeaveRequestResponse> {
    return this.dataSource.transaction(async (manager) => {
      const request = await this.loadLockedRequest(manager, id);
      this.assertPending(request);

      const assignments: EmployeeShiftAssignment[] = [];
      for (const day of request.days) {
        let assignment = await manager
          .getRepository(EmployeeShiftAssignment)
          .findOne({
            where: { employeeId: request.employeeId, workDate: day.workDate },
          });

        if (!assignment) {
          const activeShift = await manager
            .getRepository(Shift)
            .findOne({ where: { isActive: true } });
          if (!activeShift) {
            throw new ConflictException(
              `No active shift configured to create assignment for ${day.workDate}.`,
            );
          }
          const assignmentRepo = manager.getRepository(EmployeeShiftAssignment);
          assignment = await assignmentRepo.save(
            assignmentRepo.create({
              employeeId: request.employeeId,
              shiftId: activeShift.id,
              workDate: day.workDate,
              source: ShiftAssignmentSource.DEPARTMENT_DEFAULT,
              assignedByUserId: currentUser.id,
              leaveShiftWorkPeriodIds: day.requestedPeriods.map((period) => period.workPeriodId),
            }),
          );
        }

        await manager.getRepository(AttendanceRecord).delete({
          shiftAssignmentId: assignment.id,
        });
        assignments.push(assignment);
      }

      request.status = LeaveStatus.APPROVED;
      request.reviewedById = currentUser.id;
      request.reviewedAt = new Date();
      request.rejectionReason = null;
      await manager.getRepository(LeaveRequest).save(request);

      for (const assignment of assignments) {
        await this.reconciliationService.reconcileAssignment(
          manager,
          assignment,
        );
      }

      return this.toResponse(await this.loadRequest(manager, id));
    });
  }

  async reject(
    id: string,
    input: RejectLeaveRequestDto,
    currentUser: CurrentUser,
  ): Promise<LeaveRequestResponse> {
    return this.dataSource.transaction(async (manager) => {
      const request = await this.loadLockedRequest(manager, id);
      this.assertPending(request);
      request.status = LeaveStatus.REJECTED;
      request.reviewedById = currentUser.id;
      request.reviewedAt = new Date();
      request.rejectionReason = input.reason;
      await manager.getRepository(LeaveRequest).save(request);
      return this.toResponse(await this.loadRequest(manager, id));
    });
  }

  private async findAllInternal(
    query: QueryLeaveRequestsDto,
  ): Promise<PaginatedResponse<LeaveRequestResponse>> {
    const {
      status,
      employeeId,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = query;
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException(
        'fromDate must be before or equal to toDate.',
      );
    }

    const qb = this.dataSource
      .getRepository(LeaveRequest)
      .createQueryBuilder('leaveRequest')
      .leftJoinAndSelect('leaveRequest.employee', 'employee')
      .leftJoinAndSelect('leaveRequest.reviewedBy', 'reviewedBy')
      .leftJoinAndSelect('leaveRequest.days', 'day')
      .orderBy('leaveRequest.createdAt', 'DESC')
      .addOrderBy('day.workDate', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('leaveRequest.status = :status', { status });
    if (employeeId) {
      qb.andWhere('leaveRequest.employeeId = :employeeId', { employeeId });
    }
    if (fromDate)
      qb.andWhere('leaveRequest.endDate >= :fromDate', { fromDate });
    if (toDate) qb.andWhere('leaveRequest.startDate <= :toDate', { toDate });

    const [requests, total] = await qb.getManyAndCount();
    return {
      items: requests.map((request) => this.toResponse(request)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private async preparePartialDays(
    manager: EntityManager,
    dates: string[],
    partialDays: PartialLeaveDayDto[],
    employeeId: string,
    departmentShiftId: string,
  ): Promise<
    Map<
      string,
      {
        scope: LeaveDayScope;
        requestedPeriods: LeavePeriodSnapshot[];
      }
    >
  > {
    const allowedDates = new Set(dates);
    const seenDates = new Set<string>();
    const result = new Map<
      string,
      {
        scope: LeaveDayScope;
        requestedPeriods: LeavePeriodSnapshot[];
      }
    >();

    for (const partial of partialDays) {
      if (!allowedDates.has(partial.workDate)) {
        throw new BadRequestException(
          `Partial leave date ${partial.workDate} is outside the request range.`,
        );
      }
      if (seenDates.has(partial.workDate)) {
        throw new BadRequestException(
          `Partial leave date ${partial.workDate} is duplicated.`,
        );
      }
      seenDates.add(partial.workDate);

      const selectedIds = new Set(partial.workPeriodIds);
      if (selectedIds.size !== partial.workPeriodIds.length) {
        throw new BadRequestException(
          `workPeriodIds contains duplicates for ${partial.workDate}.`,
        );
      }

      const workPeriods = await manager.getRepository(ShiftWorkPeriod).find({
        where: { shiftId: departmentShiftId },
      });
      const selected = workPeriods.filter((period) =>
        selectedIds.has(period.id),
      );
      if (selected.length !== selectedIds.size) {
        throw new BadRequestException(
          `One or more work periods do not belong to the assigned shift on ${partial.workDate}.`,
        );
      }

      const allPeriodsSelected = selected.length === workPeriods.length;
      result.set(partial.workDate, {
        scope: allPeriodsSelected
          ? LeaveDayScope.FULL_DAY
          : LeaveDayScope.WORK_PERIODS,

        requestedPeriods: allPeriodsSelected
          ? []
          : selected.map((period) => ({
            workPeriodId: period.id,
            name: period.name,
            startTime: period.startTime,
            endTime: period.endTime,
            isCrossMidnight: period.isCrossMidnight,
          })),
      });
    }
    return result;
  }

  private async assertNoOverlap(
    manager: EntityManager,
    employeeId: string,
    proposedDays: Array<{
      workDate: string;
      scope: LeaveDayScope;
      requestedPeriods: LeavePeriodSnapshot[];
    }>,
  ): Promise<void> {
    const dates = proposedDays.map((day) => day.workDate);
    const existing = await manager
      .getRepository(LeaveRequestDay)
      .createQueryBuilder('day')
      .innerJoinAndSelect('day.leaveRequest', 'leaveRequest')
      .where('leaveRequest.employeeId = :employeeId', { employeeId })
      .andWhere('leaveRequest.status IN (:...statuses)', {
        statuses: [LeaveStatus.PENDING, LeaveStatus.APPROVED],
      })
      .andWhere('day.workDate IN (:...dates)', { dates })
      .getMany();

    for (const proposed of proposedDays) {
      for (const current of existing.filter(
        (day) => day.workDate === proposed.workDate,
      )) {
        if (
          proposed.scope === LeaveDayScope.FULL_DAY ||
          current.scope === LeaveDayScope.FULL_DAY ||
          proposed.requestedPeriods.some((left) =>
            current.requestedPeriods.some((right) =>
              this.periodsOverlap(left, right),
            ),
          )
        ) {
          throw new ConflictException(
            `Leave overlaps an existing pending or approved request on ${proposed.workDate}.`,
          );
        }
      }
    }
  }

  private periodsOverlap(
    left: LeavePeriodSnapshot,
    right: LeavePeriodSnapshot,
  ): boolean {
    const range = (period: LeavePeriodSnapshot) => {
      const minutes = (value: string) => {
        const [hours, mins] = value.split(':').map(Number);
        return hours * 60 + mins;
      };
      const start = minutes(period.startTime);
      let end = minutes(period.endTime);
      if (period.isCrossMidnight || end <= start) end += 24 * 60;
      return { start, end };
    };
    const a = range(left);
    const b = range(right);
    return a.start < b.end && b.start < a.end;
  }

  private async ensureActiveEmployee(
    manager: EntityManager,
    employeeId: string,
  ): Promise<void> {
    const employee = await manager.getRepository(User).findOne({
      where: {
        id: employeeId,
        accountRole: AccountRole.Employee,
        isActive: true,
      },
      select: { id: true },
    });
    if (!employee) {
      throw new ForbiddenException('An active employee account is required.');
    }
  }

  private async runSerializable<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.dataSource.transaction('SERIALIZABLE', work);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '40001'
      ) {
        throw new ConflictException(
          'The leave request conflicts with another concurrent update. Please retry.',
        );
      }
      throw error;
    }
  }

  private async loadLockedRequest(
    manager: EntityManager,
    id: string,
  ): Promise<LeaveRequest> {
    const request = await manager
      .getRepository(LeaveRequest)
      .createQueryBuilder('leaveRequest')
      .setLock('pessimistic_write')
      .where('leaveRequest.id = :id', { id })
      .getOne();
    if (!request) throw new NotFoundException(`Leave request ${id} not found.`);
    return this.loadRequest(manager, id);
  }

  private async loadRequest(
    manager: EntityManager,
    id: string,
  ): Promise<LeaveRequest> {
    const request = await manager.getRepository(LeaveRequest).findOne({
      where: { id },
      relations: { employee: true, reviewedBy: true, days: true },
    });
    if (!request) throw new NotFoundException(`Leave request ${id} not found.`);
    request.days.sort((a, b) => a.workDate.localeCompare(b.workDate));
    return request;
  }

  private assertPending(request: LeaveRequest): void {
    if (request.status !== LeaveStatus.PENDING) {
      throw new ConflictException(
        `Leave request is already ${request.status} and cannot transition again.`,
      );
    }
  }

  private todayWorkDate(): string {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: this.appTimezone,
    }).format(new Date());
  }

  private enumerateDates(startDate: string, endDate: string): string[] {
    const start = this.parseDateOnly(startDate);
    const end = this.parseDateOnly(endDate);
    if (start > end) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate.',
      );
    }
    const dates: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end && dates.length <= 366) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return dates;
  }

  private parseDateOnly(value: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException(`Invalid date: ${value}.`);
    }
    return date;
  }

  private toResponse(request: LeaveRequest) {
    const employeeSummary = (employee: User | null | undefined) =>
      employee
        ? {
          id: employee.id,
          employeeCode: employee.employeeCode,
          name: employee.name,
          department: employee.department,
          jobTitle: employee.jobTitle,
        }
        : null;

    return {
      id: request.id,
      employeeId: request.employeeId,
      employee: employeeSummary(request.employee),
      startDate: request.startDate,
      endDate: request.endDate,
      reason: request.reason,
      status: request.status,
      days: request.days.map((day) => ({
        id: day.id,
        workDate: day.workDate,
        scope: day.scope,
        shiftAssignmentId: day.shiftAssignmentId,
        requestedPeriods: day.requestedPeriods,
      })),
      reviewedById: request.reviewedById,
      reviewedBy: employeeSummary(request.reviewedBy),
      reviewedAt: request.reviewedAt,
      rejectionReason: request.rejectionReason,
      cancelledAt: request.cancelledAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }
}
