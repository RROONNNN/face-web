import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { Department } from '../departments/entities/department.entity';
import { Holiday } from '../holidays/entities/holiday.entity';
import { HolidaysService } from '../holidays/holidays.service';
import { LeaveReconciliationService } from '../leave/leave-reconciliation.service';
import { EmployeeShiftAssignment } from '../shifts/entities/employee-shift-assignment.entity';
import { ShiftAssignmentSource } from '../shifts/enums/shift-assignment-source.enum';
import { User } from '../users/entities/user.entity';
import { AdminCheckInDto } from './dto/admin-check-in.dto';
import { AdminCheckOutDto } from './dto/admin-check-out.dto';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { QueryByEmployeeAttendanceDto } from './dto/query-by-employee-attendance.dto';
import { SyncCheckInDto, SyncCheckOutDto } from './dto/sync-event.dto';
import { AttendanceEvent } from './entities/attendance-event.entity';
import { AttendanceRecord, AuditEntry } from './entities/attendance-record.entity';
import { AttendanceEventType } from './enums/attendance-event.type';
import { AttendanceSource } from './enums/attendance-source.enum';
import { AttendanceStatus } from './enums/attendance-status.enum';

@Injectable()
export class AttendanceService {
    constructor(
        @InjectRepository(AttendanceRecord)
        private readonly recordRepo: Repository<AttendanceRecord>,
        @InjectRepository(AttendanceEvent)
        private readonly eventRepo: Repository<AttendanceEvent>,
        @InjectRepository(EmployeeShiftAssignment)
        private readonly assignmentRepo: Repository<EmployeeShiftAssignment>,
        private readonly dataSource: DataSource,
        private readonly leaveReconciliationService: LeaveReconciliationService,
        private readonly holidaysService: HolidaysService,
    ) { }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private get appTimezone(): string {
        return process.env['APP_TIMEZONE'] ?? 'Asia/Ho_Chi_Minh';
    }

    /** Convert an ISO 8601 string to local YYYY-MM-DD work date */
    private toWorkDate(iso: string): string {
        return new Intl.DateTimeFormat('sv-SE', {
            timeZone: this.appTimezone,
        }).format(new Date(iso));
    }

    /** Today's work date in the configured timezone */
    private todayWorkDate(): string {
        return new Intl.DateTimeFormat('sv-SE', {
            timeZone: this.appTimezone,
        }).format(new Date());
    }

    /** Compute lateMinutes from actual check-in vs expected, after grace period */
    private computeLateMinutes(
        expectedCheckInAt: Date,
        actualCheckInAt: Date,
        lateGraceMinutes: number,
    ): number {
        const diffMs = actualCheckInAt.getTime() - expectedCheckInAt.getTime();
        const diffMin = Math.floor(diffMs / 60_000);
        return Math.max(diffMin, diffMin - lateGraceMinutes);
    }

    /**
     * Stub: returns null until a GeoConfig module is implemented.
     * TODO: inject GeoConfigService and compute haversine distance.
     */
    private computeIsOutOfZone(
        _latitude?: number | null,
        _longitude?: number | null,
    ): boolean | null {
        if (_latitude == null || _longitude == null) return null;
        return null; // TODO: compare against GeoConfig once available
    }

    /**
     * Ensure an AttendanceRecord exists for the given employee and workDate.
     * If no shift assignment exists yet, one is auto-created from the employee's
     * department default shift. Throws NotFoundException if the employee has no
     * department or the department has no default shift.
     */
    private async ensureAssignmentAndRecord(
        employeeId: string,
        workDate: string,
        manager: EntityManager,
    ): Promise<{ assignment: EmployeeShiftAssignment; record: AttendanceRecord }> {
        const assignmentRepo = manager.getRepository(EmployeeShiftAssignment);
        const recordRepo = manager.getRepository(AttendanceRecord);

        let assignment = await assignmentRepo.findOne({
            where: { employeeId, workDate },
            relations: { shift: true },
        });

        if (!assignment) {
            const employee = await manager.getRepository(User).findOne({
                where: { id: employeeId },
                select: { id: true, departmentId: true },
            });
            if (!employee?.departmentId) {
                throw new NotFoundException(
                    `Employee ${employeeId} has no department assigned — cannot resolve a shift for ${workDate}.`,
                );
            }

            const department = await manager.getRepository(Department).findOne({
                where: { id: employee.departmentId },
                select: { id: true, defaultShiftId: true },
            });
            if (!department?.defaultShiftId) {
                throw new NotFoundException(
                    `Employee ${employeeId}'s department has no default shift — cannot create an assignment for ${workDate}.`,
                );
            }

            assignment = await assignmentRepo.save(
                assignmentRepo.create({
                    employeeId,
                    shiftId: department.defaultShiftId,
                    workDate,
                    source: ShiftAssignmentSource.DEPARTMENT_DEFAULT,
                    assignedByUserId: null,
                    note: null,
                    leaveShiftWorkPeriodIds: [],
                }),
            );

            // Reload with shift relation so downstream code can read shift fields.
            assignment = await assignmentRepo.findOneOrFail({
                where: { id: assignment.id },
                relations: { shift: true },
            });
        }

        await this.leaveReconciliationService.reconcileAssignment(manager, assignment);
        const record = await recordRepo.findOneOrFail({
            where: { shiftAssignmentId: assignment.id },
        });

        return { assignment, record };
    }

    /** Build an AttendanceEvent entity (not yet persisted) */
    private createEvent(
        recordId: string,
        type: AttendanceEventType,
        occurredAt: Date,
        source: AttendanceSource,
        opts: {
            faceSimilarity?: number;
            latitude?: number;
            longitude?: number;
            deviceId?: string;
        } = {},
    ): AttendanceEvent {
        return this.eventRepo.create({
            attendanceRecordId: recordId,
            type,
            occurredAt,
            source,
            faceSimilarity: opts.faceSimilarity ?? null,
            latitude: opts.latitude ?? null,
            longitude: opts.longitude ?? null,
            deviceId: opts.deviceId ?? null,
            isOutOfZone: this.computeIsOutOfZone(opts.latitude, opts.longitude),
        });
    }

    // -------------------------------------------------------------------------
    // Mobile check-in / check-out
    // -------------------------------------------------------------------------

    async checkIn(dto: CheckInDto): Promise<AttendanceRecord> {
        const workDate = this.toWorkDate(dto.occurredAt);
        const occurredAt = new Date(dto.occurredAt);

        return this.dataSource.transaction(async (manager) => {
            const recordRepo = manager.getRepository(AttendanceRecord);
            const eventRepo = manager.getRepository(AttendanceEvent);

            const { assignment, record } = await this.ensureAssignmentAndRecord(dto.employeeId, workDate, manager);
            await this.leaveReconciliationService.assertAttendanceEventAllowed(
                manager,
                assignment,
                occurredAt,
            );

            await eventRepo.save(
                this.createEvent(record.id, AttendanceEventType.CHECK_IN, occurredAt, dto.source, dto),
            );

            record.auditCheckIn = [...(record.auditCheckIn ?? []), { occurredAt, source: dto.source, deviceId: dto.deviceId ?? null }];

            if (!record.checkedInAt) {
                record.checkedInAt = occurredAt;
                record.status = AttendanceStatus.CHECKED_IN;
                record.lateMinutes = this.computeLateMinutes(
                    record.expectedCheckInAt,
                    occurredAt,
                    assignment.shift.lateGraceMinutes,
                );
                record.checkInSource = dto.source;
            }

            return recordRepo.save(record);
        });
    }

    async checkOut(dto: CheckOutDto): Promise<AttendanceRecord> {
        const workDate = this.toWorkDate(dto.occurredAt);
        const occurredAt = new Date(dto.occurredAt);

        return this.dataSource.transaction(async (manager) => {
            const recordRepo = manager.getRepository(AttendanceRecord);
            const eventRepo = manager.getRepository(AttendanceEvent);

            const { assignment, record } = await this.ensureAssignmentAndRecord(dto.employeeId, workDate, manager);
            await this.leaveReconciliationService.assertAttendanceEventAllowed(
                manager,
                assignment,
                occurredAt,
            );

            if (record.status !== AttendanceStatus.CHECKED_IN && record.status !== AttendanceStatus.COMPLETED) {
                throw new BadRequestException(
                    `Cannot check out: attendance record is in status '${record.status}'.`,
                );
            }

            await eventRepo.save(
                this.createEvent(record.id, AttendanceEventType.CHECK_OUT, occurredAt, dto.source, dto),
            );
            record.auditCheckOut = [...(record.auditCheckOut ?? []), { occurredAt, source: dto.source, deviceId: dto.deviceId ?? null }];
            record.checkedOutAt = occurredAt;
            record.status = AttendanceStatus.COMPLETED;
            record.checkOutSource = dto.source;
            return recordRepo.save(record);
        });
    }

    // -------------------------------------------------------------------------
    // Admin manual check-in / check-out
    // -------------------------------------------------------------------------

    async adminCheckIn(dto: AdminCheckInDto): Promise<AttendanceRecord> {
        const occurredAt = new Date(dto.occurredAt);

        return this.dataSource.transaction(async (manager) => {
            const recordRepo = manager.getRepository(AttendanceRecord);
            const eventRepo = manager.getRepository(AttendanceEvent);

            const { assignment, record } = await this.ensureAssignmentAndRecord(
                dto.employeeId,
                dto.workDate,
                manager,
            );
            await this.leaveReconciliationService.assertAttendanceEventAllowed(
                manager,
                assignment,
                occurredAt,
            );

            await eventRepo.save(
                this.createEvent(record.id, AttendanceEventType.CHECK_IN, occurredAt, AttendanceSource.ADMIN_MANUAL, dto),
            );

            record.auditCheckIn = [...(record.auditCheckIn ?? []), { occurredAt, source: AttendanceSource.ADMIN_MANUAL, deviceId: null }];

            if (!record.checkedInAt) {
                record.checkedInAt = occurredAt;
                record.status = AttendanceStatus.CHECKED_IN;
                record.lateMinutes = this.computeLateMinutes(
                    record.expectedCheckInAt,
                    occurredAt,
                    assignment.shift.lateGraceMinutes,
                );
                record.checkInSource = AttendanceSource.ADMIN_MANUAL;
            }

            return recordRepo.save(record);
        });
    }

    async adminCheckOut(dto: AdminCheckOutDto): Promise<AttendanceRecord> {
        const occurredAt = new Date(dto.occurredAt);

        return this.dataSource.transaction(async (manager) => {
            const recordRepo = manager.getRepository(AttendanceRecord);
            const eventRepo = manager.getRepository(AttendanceEvent);

            const { assignment, record } = await this.ensureAssignmentAndRecord(
                dto.employeeId,
                dto.workDate,
                manager,
            );
            await this.leaveReconciliationService.assertAttendanceEventAllowed(
                manager,
                assignment,
                occurredAt,
            );

            if (record.status !== AttendanceStatus.CHECKED_IN) {
                throw new BadRequestException(
                    `Cannot check out: attendance record is in status '${record.status}'.`,
                );
            }

            await eventRepo.save(
                this.createEvent(record.id, AttendanceEventType.CHECK_OUT, occurredAt, AttendanceSource.ADMIN_MANUAL, dto),
            );

            record.auditCheckOut = [...(record.auditCheckOut ?? []), { occurredAt, source: AttendanceSource.ADMIN_MANUAL, deviceId: null }];

            if (!record.checkedOutAt) {
                record.checkedOutAt = occurredAt;
                record.status = AttendanceStatus.COMPLETED;
                record.checkOutSource = AttendanceSource.ADMIN_MANUAL;
            }

            return recordRepo.save(record);
        });
    }

    // -------------------------------------------------------------------------
    // Offline sync (batch)
    // -------------------------------------------------------------------------

    /**
     * Returns true if an event of the given type already exists for the employee's
     * attendance record on that workDate with occurredAt within 5 seconds of the given time.
     */
    private async isDuplicateEvent(
        employeeId: string,
        workDate: string,
        type: AttendanceEventType,
        occurredAt: Date,
    ): Promise<boolean> {
        const assignment = await this.assignmentRepo.findOne({
            where: { employeeId, workDate },
        });
        if (!assignment) return false;

        const record = await this.recordRepo.findOne({
            where: { shiftAssignmentId: assignment.id },
        });
        if (!record) return false;

        const events = await this.eventRepo.find({
            where: { attendanceRecordId: record.id, type },
        });

        return events.some(
            (e) => Math.abs(e.occurredAt.getTime() - occurredAt.getTime()) < 5_000,
        );
    }

    async syncCheckIn(
        events: SyncCheckInDto[],
    ): Promise<{ failedLocalIds: string[] }> {
        const failedLocalIds: string[] = [];

        for (const item of events) {
            try {
                const workDate = this.toWorkDate(item.occurredAt);
                const occurredAt = new Date(item.occurredAt);

                if (await this.isDuplicateEvent(item.employeeId, workDate, AttendanceEventType.CHECK_IN, occurredAt)) {
                    continue;
                }

                await this.checkIn({
                    occurredAt: item.occurredAt,
                    source: item.source,
                    faceSimilarity: item.faceSimilarity,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    deviceId: item.deviceId,
                    employeeId: item.employeeId,
                });
            } catch {
                failedLocalIds.push(item.localId);
            }
        }

        return { failedLocalIds };
    }

    async syncCheckOut(
        events: SyncCheckOutDto[],
    ): Promise<{ failedLocalIds: string[] }> {
        const failedLocalIds: string[] = [];

        for (const item of events) {
            try {
                const workDate = this.toWorkDate(item.occurredAt);
                const occurredAt = new Date(item.occurredAt);

                if (await this.isDuplicateEvent(item.employeeId, workDate, AttendanceEventType.CHECK_OUT, occurredAt)) {
                    continue;
                }

                await this.checkOut({
                    occurredAt: item.occurredAt,
                    source: item.source,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    deviceId: item.deviceId,
                    employeeId: item.employeeId,
                });
            } catch {
                failedLocalIds.push(item.localId);
            }
        }

        return { failedLocalIds };
    }

    // -------------------------------------------------------------------------
    // Query
    // -------------------------------------------------------------------------

    async findAll(query: QueryAttendanceDto): Promise<PaginatedResponse<AttendanceRecord>> {
        const { employeeId, date, status, shouldShowPending, page = 1, limit = 20 } = query;

        const qb = this.recordRepo
            .createQueryBuilder('record')
            .leftJoinAndSelect('record.employee', 'employee')
            .leftJoinAndSelect('record.shiftAssignment', 'shiftAssignment')
            .orderBy('record.workDate', 'DESC')
            .addOrderBy('employee.name', 'ASC')
            .skip((page - 1) * limit)
            .take(limit);

        if (employeeId) {
            qb.andWhere('record.employeeId = :employeeId', { employeeId });
        }
        if (date) {
            qb.andWhere('record.workDate = :date', { date });
        }
        if (status) {
            qb.andWhere('record.status = :status', { status });
        }
        if (!shouldShowPending) {
            qb.andWhere('record.status != :pendingStatus', { pendingStatus: AttendanceStatus.PENDING });
        }

        const [items, total] = await qb.getManyAndCount();

        return {
            items,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async queryByEmployee(query: QueryByEmployeeAttendanceDto): Promise<{
        items: AttendanceRecord[]; metaData: {
            presentCount: number;
            leaveCount: number;
            absentCount: number;
            missingCheckOutCount: number;
            holidays: Holiday[];
        };
    }> {
        const { employeeId, startDate, endDate } = query;

        const qb = this.recordRepo
            .createQueryBuilder('record')
            .leftJoinAndSelect('record.employee', 'employee')
            .leftJoinAndSelect('record.shiftAssignment', 'shiftAssignment')
            .orderBy('record.workDate', 'ASC');

        if (employeeId) {
            qb.andWhere('record.employeeId = :employeeId', { employeeId });
        }
        if (startDate) {
            qb.andWhere('record.workDate >= :startDate', { startDate });
        }
        if (endDate) {
            qb.andWhere('record.workDate <= :endDate', { endDate });
        }

        const [items, holidays] = await Promise.all([
            qb.getMany(),
            startDate ? this.holidaysService.findByMonth(startDate) : Promise.resolve([]),
        ]);
        await this.enrichRecordsWithAuditEvents(items);

        const presentCount = items.filter(
            (r) => r.status === AttendanceStatus.COMPLETED || r.status === AttendanceStatus.CHECKED_IN,
        ).length;
        const leaveCount = items.filter((r) => r.status === AttendanceStatus.ON_LEAVE).length;
        const absentCount = items.filter((r) => r.status === AttendanceStatus.ABSENT).length;
        const missingCheckOutCount = items.filter((r) => r.status === AttendanceStatus.MISSING_CHECK_OUT).length;

        return {
            items,
            metaData: { presentCount, leaveCount, absentCount, missingCheckOutCount, holidays },
        };
    }

    private async enrichRecordsWithAuditEvents(records: AttendanceRecord[]): Promise<void> {
        const recordIds = records.map((record) => record.id);
        if (recordIds.length === 0) return;

        const events = await this.eventRepo
            .createQueryBuilder('event')
            .where('event.attendanceRecordId IN (:...recordIds)', { recordIds })
            .orderBy('event.occurredAt', 'ASC')
            .getMany();

        const eventsByRecordId = new Map<string, AttendanceEvent[]>();
        for (const event of events) {
            const existing = eventsByRecordId.get(event.attendanceRecordId) ?? [];
            existing.push(event);
            eventsByRecordId.set(event.attendanceRecordId, existing);
        }

        for (const record of records) {
            const recordEvents = eventsByRecordId.get(record.id);
            if (recordEvents) {
                record.auditCheckIn = this.toAuditEntries(recordEvents, AttendanceEventType.CHECK_IN);
                record.auditCheckOut = this.toAuditEntries(recordEvents, AttendanceEventType.CHECK_OUT);
                continue;
            }

            record.auditCheckIn = this.normalizeStoredAuditEntries(
                record.auditCheckIn,
                record.checkInSource,
            );
            record.auditCheckOut = this.normalizeStoredAuditEntries(
                record.auditCheckOut,
                record.checkOutSource,
            );
        }
    }

    private toAuditEntries(events: AttendanceEvent[], type: AttendanceEventType): AuditEntry[] {
        return events
            .filter((event) => event.type === type)
            .map((event) => ({
                occurredAt: event.occurredAt,
                source: event.source,
                deviceId: event.deviceId ?? null,
                latitude: event.latitude ?? null,
                longitude: event.longitude ?? null,
                isOutOfZone: event.isOutOfZone ?? null,
            }));
    }

    private normalizeStoredAuditEntries(
        entries: unknown,
        fallbackSource?: AttendanceSource | null,
    ): AuditEntry[] {
        if (!Array.isArray(entries) || !fallbackSource) return [];

        return entries.flatMap((entry) => {
            if (entry instanceof Date || typeof entry === 'string') {
                return [{
                    occurredAt: new Date(entry),
                    source: fallbackSource,
                    deviceId: null,
                    latitude: null,
                    longitude: null,
                    isOutOfZone: null,
                }];
            }

            if (!entry || typeof entry !== 'object') return [];

            const value = entry as Partial<AuditEntry>;
            if (!value.occurredAt) return [];

            return [{
                occurredAt: new Date(value.occurredAt),
                source: value.source ?? fallbackSource,
                deviceId: value.deviceId ?? null,
                latitude: value.latitude ?? null,
                longitude: value.longitude ?? null,
                isOutOfZone: value.isOutOfZone ?? null,
            }];
        });
    }

    // -------------------------------------------------------------------------
    // Cron jobs
    // -------------------------------------------------------------------------

    /** Runs at 23:59 every day. Marks unfinished records as ABSENT or MISSING_CHECK_OUT. */
    @Cron('59 23 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
    async finalizeEndOfDay(workDate?: string): Promise<void> {
        const targetDate = workDate ?? this.todayWorkDate();
        await this.finalizeEndOfDayForDate(targetDate);
    }

    async finalizeEndOfDayForDate(workDate: string): Promise<void> {
        await this.leaveReconciliationService.reconcileAssignmentsForDate(workDate);

        await this.recordRepo
            .createQueryBuilder()
            .update(AttendanceRecord)
            .set({ status: AttendanceStatus.ABSENT })
            .where('workDate = :workDate', { workDate })
            .andWhere('status = :status', { status: AttendanceStatus.PENDING })
            .execute();

        await this.recordRepo
            .createQueryBuilder()
            .update(AttendanceRecord)
            .set({ status: AttendanceStatus.MISSING_CHECK_OUT })
            .where('workDate = :workDate', { workDate })
            .andWhere('status = :status', { status: AttendanceStatus.CHECKED_IN })
            .execute();
    }
}
