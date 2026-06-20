import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DeepPartial, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { AccountRole } from '../auth/account-role.enum';
import { CurrentUser } from '../auth/current-user.interface';
import { CheckIn } from './entities/check-in.entity';
import { CheckOut } from './entities/check-out.entity';
import { AttendanceMethod } from './enums/attendance-method.enum';
import { AttendanceStatus } from './enums/attendance-status.enum';
import { CreateAttendanceEventDto } from './dto/create-attendance-event.dto';
import { SyncAttendanceEventDto } from './dto/sync-attendance-event.dto';
import { SyncBulkAttendanceDto } from './dto/sync-bulk-attendance.dto';
import { CreateManualAttendanceEventDto } from './dto/create-manual-attendance-event.dto';
import { UpdateAttendanceEventDto } from './dto/update-attendance-event.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { GeofenceService } from '../geofence/geofence.service';
import { AttendanceRealtimeGateway } from './attendance-realtime.gateway';

const SYNC_DUPLICATE_WINDOW_MS = 5_000;

type AttendanceEvent = CheckIn | CheckOut;
type AttendanceRepository<T extends AttendanceEvent> = Repository<T>;

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(CheckIn)
    private readonly checkInRepository: Repository<CheckIn>,
    @InjectRepository(CheckOut)
    private readonly checkOutRepository: Repository<CheckOut>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    private readonly geofenceService: GeofenceService,
    private readonly attendanceRealtimeGateway: AttendanceRealtimeGateway,
  ) { }

  createCheckIn(input: CreateAttendanceEventDto, currentUser?: CurrentUser) {
    return this.createMobileEvent(this.checkInRepository, input, currentUser);
  }

  createCheckOut(input: CreateAttendanceEventDto, currentUser?: CurrentUser) {
    return this.createMobileEvent(this.checkOutRepository, input, currentUser);
  }

  syncCheckIns(input: SyncAttendanceEventDto[], currentUser?: CurrentUser) {
    return this.syncEvents(this.checkInRepository, input, currentUser);
  }

  syncCheckOuts(input: SyncAttendanceEventDto[], currentUser?: CurrentUser) {
    return this.syncEvents(this.checkOutRepository, input, currentUser);
  }

  async syncBulkAttendance(
    input: SyncBulkAttendanceDto,
    currentUser?: CurrentUser,
  ) {
    const results: Array<{ employeeId: string; successLocalIds: number[] }> = [];

    for (const userEntry of input.bulk_users) {
      const successLocalIds: number[] = [];

      for (const item of userEntry.io) {
        const isCheckIn = item.in_time !== undefined;
        const timeStr = isCheckIn ? item.in_time! : item.out_time!;
        const repository = isCheckIn
          ? this.checkInRepository
          : this.checkOutRepository;

        try {
          this.assertCanCreateMobileEvent(userEntry.employee_id, currentUser);

          const time = this.parseDateTime(timeStr);
          const duplicate = await this.findNearDuplicate(
            repository,
            userEntry.employee_id,
            time,
          );

          if (!duplicate) {
            await this.createEvent(
              repository,
              isCheckIn ? 'checkIn' : 'checkOut',
              {
                employeeId: userEntry.employee_id,
                time,
                workDate: this.normalizeWorkDateFromTime(time),
                latitude: item.lat,
                longitude: item.lon,
                method: AttendanceMethod.Sync,
                imagePath: null,
                createdById: null,
              },
            );
          }

          successLocalIds.push(item.id);
        } catch {
          // item.id not added to successLocalIds on failure
        }
      }

      results.push({ employeeId: userEntry.employee_id, successLocalIds });
    }

    return results;
  }

  createManualCheckIn(
    input: CreateManualAttendanceEventDto,
    currentUser?: CurrentUser,
  ) {
    return this.createManualEvent(this.checkInRepository, input, currentUser);
  }

  createManualCheckOut(
    input: CreateManualAttendanceEventDto,
    currentUser?: CurrentUser,
  ) {
    return this.createManualEvent(this.checkOutRepository, input, currentUser);
  }

  updateCheckIn(id: string, input: UpdateAttendanceEventDto) {
    return this.updateEvent(this.checkInRepository, id, input);
  }

  updateCheckOut(id: string, input: UpdateAttendanceEventDto) {
    return this.updateEvent(this.checkOutRepository, id, input);
  }

  deleteCheckIn(id: string) {
    return this.deleteEvent(this.checkInRepository, id);
  }

  deleteCheckOut(id: string) {
    return this.deleteEvent(this.checkOutRepository, id);
  }

  async query(input: QueryAttendanceDto) {
    const workDate = this.normalizeDateOnly(input.date);
    const employees = await this.userRepository.find({
      where: input.empId
        ? { id: input.empId, accountRole: AccountRole.Employee }
        : { accountRole: AccountRole.Employee },
      order: { employeeCode: 'ASC' },
    });
    const employeeIds = employees.map((employee) => employee.id);

    if (employeeIds.length === 0) {
      return this.paginate([], input);
    }

    const [checkIns, checkOuts] = await Promise.all([
      this.checkInRepository
        .createQueryBuilder('checkIn')
        .leftJoinAndSelect('checkIn.shift', 'shift')
        .where('checkIn.work_date = :workDate', { workDate })
        .andWhere('checkIn.employee_id IN (:...employeeIds)', { employeeIds })
        .getMany(),
      this.checkOutRepository
        .createQueryBuilder('checkOut')
        .leftJoinAndSelect('checkOut.shift', 'shift')
        .where('checkOut.work_date = :workDate', { workDate })
        .andWhere('checkOut.employee_id IN (:...employeeIds)', { employeeIds })
        .getMany(),
    ]);

    const earliestCheckIns = this.pickByEmployee(checkIns, 'earliest');
    const latestCheckOuts = this.pickByEmployee(checkOuts, 'latest');

    const rows = employees.map((employee) => {
      const checkIn = earliestCheckIns.get(employee.id) ?? null;
      const checkOut = latestCheckOuts.get(employee.id) ?? null;
      const status = this.getStatus(checkIn, checkOut);
      const late = checkIn ? this.isLaterThanShiftStart(checkIn) : false;
      const early = checkOut ? this.isEarlierThanShiftEnd(checkOut) : false;

      return {
        employee: this.toEmployeeSummary(employee),
        workDate,
        status,
        checkIn: checkIn ? this.toEventSummary(checkIn) : null,
        checkOut: checkOut ? this.toEventSummary(checkOut) : null,
        late,
        early,
        outOfZone: Boolean(checkIn?.isOutOfZone || checkOut?.isOutOfZone),
        totalWorkHours: this.calculateWorkHours(checkIn, checkOut),
      };
    });

    const filtered = rows.filter((row) => {
      if (input.status && row.status !== input.status) {
        return false;
      }
      if (
        input.late !== undefined &&
        row.late !== this.parseBoolean(input.late)
      ) {
        return false;
      }
      if (
        input.early !== undefined &&
        row.early !== this.parseBoolean(input.early)
      ) {
        return false;
      }
      return true;
    });

    return this.paginate(filtered, input);
  }

  async findPresentToday() {
    const workDate = this.normalizeWorkDateFromTime(new Date());
    const [checkIns, checkOuts] = await Promise.all([
      this.checkInRepository.find({
        where: { workDate },
        relations: { employee: true, shift: true },
        order: { time: 'DESC' },
      }),
      this.checkOutRepository.find({
        where: { workDate },
        order: { time: 'DESC' },
      }),
    ]);

    const latestCheckInByEmployee = this.pickByEmployee(checkIns, 'latest');
    const latestCheckOutByEmployee = this.pickByEmployee(checkOuts, 'latest');

    return Array.from(latestCheckInByEmployee.values())
      .filter((checkIn) => {
        const checkOut = latestCheckOutByEmployee.get(checkIn.employeeId);
        return !checkOut || checkOut.time.getTime() < checkIn.time.getTime();
      })
      .map((checkIn) => ({
        employee: this.toEmployeeSummary(checkIn.employee),
        checkIn: this.toEventSummary(checkIn),
        workDate,
        late: this.isLaterThanShiftStart(checkIn),
        outOfZone: checkIn.isOutOfZone,
      }));
  }

  private async createMobileEvent<T extends AttendanceEvent>(
    repository: AttendanceRepository<T>,
    input: CreateAttendanceEventDto,
    currentUser?: CurrentUser,
  ) {
    this.assertCanCreateMobileEvent(input.empId, currentUser);

    const time = this.parseDateTime(input.time);
    return this.createEvent(repository, this.getEventType(repository), {
      employeeId: input.empId,
      time,
      workDate: this.normalizeWorkDateFromTime(time),
      latitude: input.lat,
      longitude: input.lon,
      method: AttendanceMethod.Mobile,
      imagePath: input.imagePath ?? null,
      createdById: null,
    });
  }

  private async syncEvents<T extends AttendanceEvent>(
    repository: AttendanceRepository<T>,
    input: SyncAttendanceEventDto[],
    currentUser?: CurrentUser,
  ) {
    const failedLocalIds: string[] = [];

    for (const item of input) {
      try {
        this.assertCanCreateMobileEvent(item.empId, currentUser);

        const time = this.parseDateTime(item.time);
        const duplicate = await this.findNearDuplicate(
          repository,
          item.empId,
          time,
        );

        if (!duplicate) {
          await this.createEvent(repository, this.getEventType(repository), {
            employeeId: item.empId,
            time,
            workDate: this.normalizeWorkDateFromTime(time),
            latitude: item.lat,
            longitude: item.lon,
            method: AttendanceMethod.Sync,
            imagePath: item.imagePath ?? null,
            createdById: null,
          });
        }
      } catch {
        failedLocalIds.push(item.localId);
      }
    }

    return failedLocalIds;
  }

  private async createManualEvent<T extends AttendanceEvent>(
    repository: AttendanceRepository<T>,
    input: CreateManualAttendanceEventDto,
    currentUser?: CurrentUser,
  ) {
    const time = this.parseDateTime(input.time);
    const latitude = input.lat ?? null;
    const longitude = input.lon ?? null;

    return this.createEvent(repository, this.getEventType(repository), {
      employeeId: input.empId,
      time,
      workDate: this.normalizeDateOnly(input.workDate),
      latitude,
      longitude,
      method: AttendanceMethod.Manual,
      imagePath: null,
      createdById: currentUser?.id ?? null,
    });
  }

  private async createEvent<T extends AttendanceEvent>(
    repository: AttendanceRepository<T>,
    eventType: 'checkIn' | 'checkOut',
    input: {
      employeeId: string;
      time: Date;
      workDate: string;
      latitude: number | null;
      longitude: number | null;
      method: AttendanceMethod;
      imagePath: string | null;
      createdById: string | null;
    },
  ) {
    await this.ensureEmployee(input.employeeId);
    const activeShift = await this.getActiveShift();
    const isOutOfZone = await this.calculateIsOutOfZone(
      input.latitude,
      input.longitude,
    );

    const entity = repository.create({
      employeeId: input.employeeId,
      shiftId: activeShift.id,
      workDate: input.workDate,
      time: input.time,
      latitude: input.latitude,
      longitude: input.longitude,
      method: input.method,
      imagePath: input.imagePath,
      isOutOfZone,
      createdById: input.createdById,
    } as DeepPartial<T>);

    const saved = await repository.save(entity);
    this.attendanceRealtimeGateway.publishAttendanceUpdate({
      eventType,
      employeeId: saved.employeeId,
      workDate: saved.workDate,
      event: this.toEventSummary(saved),
    });

    return saved;
  }

  private async updateEvent<T extends AttendanceEvent>(
    repository: AttendanceRepository<T>,
    id: string,
    input: UpdateAttendanceEventDto,
  ) {
    const event = await repository.findOne({ where: { id } as never });

    if (!event) {
      throw new NotFoundException(`Attendance event with id "${id}" not found`);
    }

    if (input.time !== undefined) {
      event.time = this.parseDateTime(input.time);
    }
    if (input.workDate !== undefined) {
      event.workDate = this.normalizeDateOnly(input.workDate);
    }
    if (input.lat !== undefined) {
      event.latitude = input.lat;
    }
    if (input.lon !== undefined) {
      event.longitude = input.lon;
    }
    if (input.imagePath !== undefined) {
      event.imagePath = input.imagePath;
    }
    if (input.isOutOfZone !== undefined) {
      event.isOutOfZone = input.isOutOfZone;
    }

    return repository.save(event);
  }

  private async deleteEvent<T extends AttendanceEvent>(
    repository: AttendanceRepository<T>,
    id: string,
  ) {
    const result = await repository.delete(id);

    if (!result.affected) {
      throw new NotFoundException(`Attendance event with id "${id}" not found`);
    }

    return { id };
  }

  private async findNearDuplicate<T extends AttendanceEvent>(
    repository: AttendanceRepository<T>,
    employeeId: string,
    time: Date,
  ) {
    return repository.findOne({
      where: {
        employeeId,
        time: Between(
          new Date(time.getTime() - SYNC_DUPLICATE_WINDOW_MS),
          new Date(time.getTime() + SYNC_DUPLICATE_WINDOW_MS),
        ),
      } as never,
    });
  }

  private assertCanCreateMobileEvent(
    employeeId: string,
    currentUser?: CurrentUser,
  ) {
    if (!currentUser) {
      return;
    }

    if (currentUser.roles.includes(AccountRole.Admin)) {
      throw new ForbiddenException(
        'Admins must use manual attendance endpoints',
      );
    }

    if (currentUser.id !== employeeId) {
      throw new ForbiddenException(
        'Employees can only create their own attendance',
      );
    }
  }

  private async ensureEmployee(employeeId: string) {
    const employee = await this.userRepository.findOne({
      where: { id: employeeId, accountRole: AccountRole.Employee },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with id "${employeeId}" not found`);
    }
  }

  private async getActiveShift() {
    const shift = await this.shiftRepository.findOne({
      where: { isActive: true },
    });

    if (!shift) {
      throw new BadRequestException('No active shift configured');
    }

    return shift;
  }

  private parseDateTime(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid time');
    }

    return date;
  }

  private normalizeWorkDateFromTime(time: Date) {
    return time.toISOString().slice(0, 10);
  }

  private normalizeDateOnly(value: string) {
    const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    return date.toISOString().slice(0, 10);
  }

  private calculateIsOutOfZone(
    latitude: number | null,
    longitude: number | null,
  ) {
    return this.geofenceService.isOutOfZone(latitude, longitude);
  }

  private pickByEmployee<T extends AttendanceEvent>(
    events: T[],
    mode: 'earliest' | 'latest',
  ) {
    const selected = new Map<string, T>();

    for (const event of events) {
      const current = selected.get(event.employeeId);

      if (!current) {
        selected.set(event.employeeId, event);
        continue;
      }

      const shouldReplace =
        mode === 'earliest'
          ? event.time.getTime() < current.time.getTime()
          : event.time.getTime() > current.time.getTime();

      if (shouldReplace) {
        selected.set(event.employeeId, event);
      }
    }

    return selected;
  }

  private getStatus(checkIn: CheckIn | null, checkOut: CheckOut | null) {
    if (checkIn && checkOut) {
      return AttendanceStatus.Present;
    }

    if (checkIn || checkOut) {
      return AttendanceStatus.Partial;
    }

    return AttendanceStatus.Absent;
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
    return Math.max(0, Math.round(hours * 100) / 100);
  }

  private parseBoolean(value: string) {
    return value === 'true';
  }

  private paginate<T>(items: T[], input: QueryAttendanceDto) {
    const page = input.page ?? 1;
    const limit = Math.min(input.limit ?? 20, 100);
    const start = (page - 1) * limit;

    return {
      items: items.slice(start, start + limit),
      total: items.length,
      page,
      limit,
    };
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

  private toEventSummary(event: AttendanceEvent) {
    return {
      id: event.id,
      shiftId: event.shiftId,
      time: event.time,
      latitude: event.latitude,
      longitude: event.longitude,
      method: event.method,
      imagePath: event.imagePath,
      isOutOfZone: event.isOutOfZone,
    };
  }

  private getEventType<T extends AttendanceEvent>(
    repository: AttendanceRepository<T>,
  ): 'checkIn' | 'checkOut' {
    return repository.metadata.target === CheckIn ? 'checkIn' : 'checkOut';
  }
}
