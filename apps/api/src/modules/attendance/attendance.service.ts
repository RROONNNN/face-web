import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { EmployeeShiftAssignment } from '../shifts/entities/employee-shift-assignment.entity';
import { ShiftWorkPeriod } from '../shifts/entities/shift-work-period.entity';
import { AdminCheckInDto } from './dto/admin-check-in.dto';
import { AdminCheckOutDto } from './dto/admin-check-out.dto';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { SyncCheckInDto, SyncCheckOutDto } from './dto/sync-event.dto';
import { AttendanceEvent } from './entities/attendance-event.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';
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
        @InjectRepository(ShiftWorkPeriod)
        private readonly workPeriodRepo: Repository<ShiftWorkPeriod>,
        private readonly dataSource: DataSource,
    ) { }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private get appTimezone(): string {
        return process.env['APP_TIMEZONE'] ?? 'Asia/Ho_Chi_Minh';
    }

    private get appTzOffset(): string {
        return process.env['APP_TZ_OFFSET'] ?? '+07:00';
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

    /**
     * Combine a YYYY-MM-DD workDate and a HH:mm time string into a Date.
     * Interprets the time in the configured timezone offset.
     * e.g. workDate="2026-06-23", time="08:00:00"
     */
    private buildTimestamptz(workDate: string, time: string): Date {
        try {
            return new Date(`${workDate}T${time}${this.appTzOffset}`);
        } catch (error) {
            throw new BadRequestException(
                `Failed to build timestamp: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    /**
     * Compute expected check-in / check-out times for a shift assignment.
     * Work periods in leaveShiftWorkPeriodIds are excluded.
     */
    private calculateExpectedTimes(
        workDate: string,
        workPeriods: ShiftWorkPeriod[],
        leaveShiftWorkPeriodIds: string[],
    ): { expectedCheckInAt: Date; expectedCheckOutAt: Date } {
        const activePeriods = workPeriods
            .filter((p) => !leaveShiftWorkPeriodIds.includes(p.id))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

        if (activePeriods.length === 0) {
            throw new BadRequestException(
                'No active work periods remaining after applying leave periods.',
            );
        }

        const first = activePeriods[0];
        const last = activePeriods[activePeriods.length - 1];

        return {
            expectedCheckInAt: this.buildTimestamptz(workDate, first.startTime),
            expectedCheckOutAt: this.buildTimestamptz(workDate, last.endTime),
        };
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
     * Find the AttendanceRecord for the given employee and workDate.
     * If no record exists yet, create one from the shift assignment.
     * Throws NotFoundException if there is no shift assignment for that day.
     */
    private async resolveOrCreateRecord(
        employeeId: string,
        workDate: string,
        manager: EntityManager,
    ): Promise<{ assignment: EmployeeShiftAssignment; record: AttendanceRecord }> {
        const assignmentRepo = manager.getRepository(EmployeeShiftAssignment);
        const recordRepo = manager.getRepository(AttendanceRecord);

        const assignment = await assignmentRepo.findOne({
            where: { employeeId, workDate },
            relations: { shift: true },
        });
        if (!assignment) {
            throw new NotFoundException(
                `No shift assignment found for employee ${employeeId} on ${workDate}.`,
            );
        }

        let record = await recordRepo.findOne({
            where: { shiftAssignmentId: assignment.id },
        });

        if (!record) {
            const workPeriods = await manager.getRepository(ShiftWorkPeriod).find({
                where: { shiftId: assignment.shiftId },
            });
            const { expectedCheckInAt, expectedCheckOutAt } = this.calculateExpectedTimes(
                workDate,
                workPeriods,
                assignment.leaveShiftWorkPeriodIds ?? [],
            );
            record = await recordRepo.save(
                recordRepo.create({
                    employeeId: assignment.employeeId,
                    shiftAssignmentId: assignment.id,
                    workDate,
                    status: AttendanceStatus.PENDING,
                    expectedCheckInAt,
                    expectedCheckOutAt,
                    lateMinutes: 0,
                    auditCheckIn: [],
                    auditCheckOut: [],
                }),
            );
        }

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

            const { assignment, record } = await this.resolveOrCreateRecord(dto.employeeId, workDate, manager);

            await eventRepo.save(
                this.createEvent(record.id, AttendanceEventType.CHECK_IN, occurredAt, dto.source, dto),
            );

            record.auditCheckIn = [...(record.auditCheckIn ?? []), occurredAt];

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

            const { record } = await this.resolveOrCreateRecord(dto.employeeId, workDate, manager);

            if (record.status !== AttendanceStatus.CHECKED_IN && record.status !== AttendanceStatus.COMPLETED) {
                throw new BadRequestException(
                    `Cannot check out: attendance record is in status '${record.status}'.`,
                );
            }

            await eventRepo.save(
                this.createEvent(record.id, AttendanceEventType.CHECK_OUT, occurredAt, dto.source, dto),
            );
            record.auditCheckOut = [...(record.auditCheckOut ?? []), occurredAt];
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

            const { assignment, record } = await this.resolveOrCreateRecord(
                dto.employeeId,
                dto.workDate,
                manager,
            );

            await eventRepo.save(
                this.createEvent(record.id, AttendanceEventType.CHECK_IN, occurredAt, AttendanceSource.ADMIN_MANUAL, dto),
            );

            record.auditCheckIn = [...(record.auditCheckIn ?? []), occurredAt];

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

            const { record } = await this.resolveOrCreateRecord(
                dto.employeeId,
                dto.workDate,
                manager,
            );

            if (record.status !== AttendanceStatus.CHECKED_IN) {
                throw new BadRequestException(
                    `Cannot check out: attendance record is in status '${record.status}'.`,
                );
            }

            await eventRepo.save(
                this.createEvent(record.id, AttendanceEventType.CHECK_OUT, occurredAt, AttendanceSource.ADMIN_MANUAL, dto),
            );

            record.auditCheckOut = [...(record.auditCheckOut ?? []), occurredAt];

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
        const { employeeId, date, status, page = 1, limit = 20 } = query;

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
