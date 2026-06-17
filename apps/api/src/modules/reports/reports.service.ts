import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { CheckIn } from '../attendance/entities/check-in.entity';
import { CheckOut } from '../attendance/entities/check-out.entity';
import { HolidayCalendarService } from '../holiday-calendar/holiday-calendar.service';
import { LeaveRequest } from '../leave/entities/leave-request.entity';
import { LeaveStatus } from '../leave/enums/leave-status.enum';
import { AccountRole } from '../auth/account-role.enum';
import { User } from '../users/entities/user.entity';
import { QueryMonthlyReportDto } from './dto/query-monthly-report.dto';

type AttendanceEvent = CheckIn | CheckOut;

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(CheckIn)
    private readonly checkInRepository: Repository<CheckIn>,
    @InjectRepository(CheckOut)
    private readonly checkOutRepository: Repository<CheckOut>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly holidayCalendarService: HolidayCalendarService,
  ) {}

  async findMonthly(input: QueryMonthlyReportDto) {
    const { startDate, endDate } = this.getMonthRange(input.month);
    const page = input.page ?? 1;
    const limit = Math.min(input.limit ?? 20, 100);
    const [employees, total] = await this.findEmployees(
      input.empId,
      page,
      limit,
    );
    const employeeIds = employees.map((employee) => employee.id);

    if (employeeIds.length === 0) {
      return { month: input.month, items: [], total, page, limit };
    }

    const [checkIns, checkOuts, leaveRequests, totalWorkDays] =
      await Promise.all([
        this.findCheckIns(employeeIds, startDate, endDate),
        this.findCheckOuts(employeeIds, startDate, endDate),
        this.findApprovedLeaveRequests(employeeIds, startDate, endDate),
        this.holidayCalendarService.countWorkingDays(startDate, endDate),
      ]);

    return {
      month: input.month,
      items: employees.map((employee) =>
        this.buildEmployeeReport({
          employee,
          startDate,
          endDate,
          totalWorkDays,
          checkIns: checkIns.filter(
            (event) => event.employeeId === employee.id,
          ),
          checkOuts: checkOuts.filter(
            (event) => event.employeeId === employee.id,
          ),
          leaveRequests: leaveRequests.filter(
            (leaveRequest) => leaveRequest.employeeId === employee.id,
          ),
        }),
      ),
      total,
      page,
      limit,
    };
  }

  async findEmployeeMonthly(employeeId: string, month: string) {
    const report = await this.findMonthly({ month, empId: employeeId });
    const employeeReport = report.items[0];

    if (!employeeReport) {
      throw new NotFoundException(`Employee with id "${employeeId}" not found`);
    }

    return {
      month,
      ...employeeReport,
    };
  }

  private async findEmployees(
    employeeId: string | undefined,
    page: number,
    limit: number,
  ) {
    return this.userRepository.findAndCount({
      where: employeeId
        ? { id: employeeId, accountRole: AccountRole.Employee }
        : { accountRole: AccountRole.Employee },
      order: { employeeCode: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  private findCheckIns(
    employeeIds: string[],
    startDate: string,
    endDate: string,
  ) {
    return this.checkInRepository.find({
      where: {
        employeeId: In(employeeIds),
        workDate: Between(startDate, endDate),
      },
      relations: { shift: true },
      order: { workDate: 'ASC', time: 'ASC' },
    });
  }

  private findCheckOuts(
    employeeIds: string[],
    startDate: string,
    endDate: string,
  ) {
    return this.checkOutRepository.find({
      where: {
        employeeId: In(employeeIds),
        workDate: Between(startDate, endDate),
      },
      relations: { shift: true },
      order: { workDate: 'ASC', time: 'ASC' },
    });
  }

  private findApprovedLeaveRequests(
    employeeIds: string[],
    startDate: string,
    endDate: string,
  ) {
    return this.leaveRequestRepository.find({
      where: {
        employeeId: In(employeeIds),
        status: LeaveStatus.Approved,
        startDate: LessThanOrEqual(endDate),
        endDate: MoreThanOrEqual(startDate),
      },
    });
  }

  private buildEmployeeReport(input: {
    employee: User;
    startDate: string;
    endDate: string;
    totalWorkDays: number;
    checkIns: CheckIn[];
    checkOuts: CheckOut[];
    leaveRequests: LeaveRequest[];
  }) {
    const earliestCheckIns = this.pickByWorkDate(input.checkIns, 'earliest');
    const latestCheckOuts = this.pickByWorkDate(input.checkOuts, 'latest');
    const workDates = new Set([
      ...earliestCheckIns.keys(),
      ...latestCheckOuts.keys(),
    ]);

    let totalWorkHours = 0;
    let lateCount = 0;
    let earlyLeaveCount = 0;
    let outOfZoneCount = 0;

    for (const workDate of workDates) {
      const checkIn = earliestCheckIns.get(workDate) ?? null;
      const checkOut = latestCheckOuts.get(workDate) ?? null;

      if (checkIn && this.isLaterThanShiftStart(checkIn)) {
        lateCount += 1;
      }

      if (checkOut && this.isEarlierThanShiftEnd(checkOut)) {
        earlyLeaveCount += 1;
      }

      if (checkIn?.isOutOfZone || checkOut?.isOutOfZone) {
        outOfZoneCount += 1;
      }

      totalWorkHours += this.calculateWorkHours(checkIn, checkOut);
    }

    return {
      employee: this.toEmployeeSummary(input.employee),
      totalWorkDays: input.totalWorkDays,
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      leaveDays: this.countLeaveDays(
        input.leaveRequests,
        input.startDate,
        input.endDate,
      ),
      lateCount,
      earlyLeaveCount,
      outOfZoneCount,
    };
  }

  private pickByWorkDate<T extends AttendanceEvent>(
    events: T[],
    mode: 'earliest' | 'latest',
  ) {
    const selected = new Map<string, T>();

    for (const event of events) {
      const current = selected.get(event.workDate);

      if (!current) {
        selected.set(event.workDate, event);
        continue;
      }

      const shouldReplace =
        mode === 'earliest'
          ? event.time.getTime() < current.time.getTime()
          : event.time.getTime() > current.time.getTime();

      if (shouldReplace) {
        selected.set(event.workDate, event);
      }
    }

    return selected;
  }

  private countLeaveDays(
    leaveRequests: LeaveRequest[],
    startDate: string,
    endDate: string,
  ) {
    const coveredDates = new Set<string>();

    for (const leaveRequest of leaveRequests) {
      const start = this.maxDate(startDate, leaveRequest.startDate);
      const end = this.minDate(endDate, leaveRequest.endDate);

      for (
        const cursor = this.parseDateOnly(start);
        cursor.getTime() <= this.parseDateOnly(end).getTime();
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      ) {
        const day = cursor.getUTCDay();

        if (day !== 0 && day !== 6) {
          coveredDates.add(cursor.toISOString().slice(0, 10));
        }
      }
    }

    return coveredDates.size;
  }

  private getMonthRange(month: string) {
    const [year, monthNumber] = month.split('-').map(Number);

    if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) {
      throw new BadRequestException('month must use YYYY-MM format');
    }

    const start = new Date(Date.UTC(year, monthNumber - 1, 1));
    const end = new Date(Date.UTC(year, monthNumber, 0));

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }

  private parseDateOnly(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private maxDate(left: string, right: string) {
    return left > right ? left : right;
  }

  private minDate(left: string, right: string) {
    return left < right ? left : right;
  }

  private isLaterThanShiftStart(checkIn: CheckIn) {
    return (
      this.getLocalMinutes(checkIn.time) >
      this.parseTimeToMinutes(checkIn.shift.startTime)
    );
  }

  private isEarlierThanShiftEnd(checkOut: CheckOut) {
    return (
      this.getLocalMinutes(checkOut.time) <
      this.parseTimeToMinutes(checkOut.shift.endTime)
    );
  }

  private parseTimeToMinutes(value: string) {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private getLocalMinutes(date: Date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  private calculateWorkHours(
    checkIn: CheckIn | null,
    checkOut: CheckOut | null,
  ) {
    if (!checkIn || !checkOut) {
      return 0;
    }

    const hours =
      (checkOut.time.getTime() - checkIn.time.getTime()) / 3_600_000;
    return Math.max(0, hours);
  }

  private toEmployeeSummary(employee: User) {
    return {
      id: employee.id,
      employeeCode: employee.employeeCode,
      name: employee.name,
      department: employee.department,
      jobTitle: employee.jobTitle,
    };
  }
}
