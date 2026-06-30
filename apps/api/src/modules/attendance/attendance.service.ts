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
import { GeofenceService } from '../geofence/geofence.service';
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
import { QueryAttendanceDashboardDto } from './dto/query-attendance-dashboard.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { QueryByEmployeeAttendanceDto } from './dto/query-by-employee-attendance.dto';
import { SyncCheckInDto, SyncCheckOutDto } from './dto/sync-event.dto';
import { AttendanceEvent } from './entities/attendance-event.entity';
import { AttendanceRecord, AuditEntry } from './entities/attendance-record.entity';
import { AttendanceEventType } from './enums/attendance-event.type';
import { AttendanceSource } from './enums/attendance-source.enum';
import { AttendanceStatus } from './enums/attendance-status.enum';

type DashboardRecordStatus = AttendanceStatus | 'no_record';
type DashboardRecommendedAction =
    | 'manual_check_in'
    | 'manual_check_out'
    | 'review_absence'
    | 'none';

type DashboardDepartmentSummary = {
    id: string | null;
    name: string;
    scheduled: number;
    checkedIn: number;
    completed: number;
    late: number;
    absent: number;
    missingCheckOut: number;
    onLeave: number;
    pending: number;
};

type DashboardAttentionRow = {
    recordId: string | null;
    shiftAssignmentId: string;
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    departmentId: string | null;
    departmentName: string | null;
    shiftName: string;
    status: DashboardRecordStatus;
    expectedCheckInAt: string;
    expectedCheckOutAt: string;
    checkedInAt: string | null;
    checkedOutAt: string | null;
    lateMinutes: number;
    recommendedAction: DashboardRecommendedAction;
};

type DashboardTotals = {
    scheduled: number;
    pending: number;
    checkedIn: number;
    completed: number;
    late: number;
    absent: number;
    missingCheckOut: number;
    onLeave: number;
    invalid: number;
    noRecord: number;
};

type AttendanceEventUser = {
    userName: string;
    employeeCode: string;
    department: string | null;
    jobTitle: string | null;
};

type AttendanceEventWithUser = AttendanceEvent & {
    user: AttendanceEventUser;
    lateMinutes: number | null;
};

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
        private readonly geofenceService: GeofenceService,
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
     * Ensure an AttendanceRecord exists for the given employee and workDate.
     * If no shift assignment exists yet, one is auto-created from the employee's
     * department default shift. Throws NotFoundException if the employee has no
     * department or the department has no default shift.
     */
    private async ensureAssignmentAndRecord(
        employeeId: string,
        workDate: string,
        manager: EntityManager,
    ): Promise<{
        assignment: EmployeeShiftAssignment;
        record: AttendanceRecord;
        employee: User;
    }> {
        const assignmentRepo = manager.getRepository(EmployeeShiftAssignment);
        const recordRepo = manager.getRepository(AttendanceRecord);

        const employee = await manager.getRepository(User).findOne({
            where: { id: employeeId },
            select: {
                id: true,
                employeeCode: true,
                name: true,
                department: true,
                departmentId: true,
                jobTitle: true,
            },
        });
        if (!employee) {
            throw new NotFoundException(`Employee ${employeeId} was not found.`);
        }

        let assignment = await assignmentRepo.findOne({
            where: { employeeId, workDate },
            relations: { shift: true },
        });

        if (!assignment) {
            if (!employee.departmentId) {
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

        return { assignment, record, employee };
    }

    private toAttendanceEventWithUser(
        event: AttendanceEvent,
        employee: User,
        lateMinutes: number | null = null,
    ): AttendanceEventWithUser {
        return Object.assign(event, {
            user: {
                userName: employee.name,
                employeeCode: employee.employeeCode,
                department: employee.department,
                jobTitle: employee.jobTitle,
            },
            lateMinutes: event.type === AttendanceEventType.CHECK_IN ? lateMinutes : null,
        });
    }

    /** Build an AttendanceEvent entity (not yet persisted) */
    private async createEvent(
        recordId: string,
        type: AttendanceEventType,
        occurredAt: Date,
        source: AttendanceSource,
        opts: {
            faceSimilarity?: number;
            latitude?: number;
            longitude?: number;
            deviceId?: string;
            imageUrl?: string;
        } = {},
    ): Promise<AttendanceEvent> {
        let isOutOfZone: boolean | null = false;
        if (source === AttendanceSource.ADMIN_MANUAL) {
            isOutOfZone = false;
        } else {
            isOutOfZone = await this.geofenceService.evaluate(
                opts.latitude,
                opts.longitude,
            );
        }

        return this.eventRepo.create({
            attendanceRecordId: recordId,
            type,
            occurredAt,
            source,
            faceSimilarity: opts.faceSimilarity ?? null,
            latitude: opts.latitude ?? null,
            longitude: opts.longitude ?? null,
            deviceId: opts.deviceId ?? null,
            imageUrl: opts.imageUrl ?? null,
            isOutOfZone,
        });
    }

    // -------------------------------------------------------------------------
    // Mobile check-in / check-out
    // -------------------------------------------------------------------------

    async checkIn(dto: CheckInDto): Promise<AttendanceEventWithUser> {
        const workDate = this.toWorkDate(dto.occurredAt);
        const occurredAt = new Date(dto.occurredAt);

        return this.dataSource.transaction(async (manager) => {
            const recordRepo = manager.getRepository(AttendanceRecord);
            const eventRepo = manager.getRepository(AttendanceEvent);

            const { assignment, record, employee } = await this.ensureAssignmentAndRecord(
                dto.employeeId,
                workDate,
                manager,
            );
            await this.leaveReconciliationService.assertAttendanceEventAllowed(
                manager,
                assignment,
                occurredAt,
            );

            const event = await eventRepo.save(
                await this.createEvent(record.id, AttendanceEventType.CHECK_IN, occurredAt, dto.source, dto),
            );

            record.auditCheckIn = [
                ...(record.auditCheckIn ?? []),
                { occurredAt, source: dto.source, deviceId: dto.deviceId ?? null },
            ];

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

            await recordRepo.save(record);
            return this.toAttendanceEventWithUser(event, employee, record.lateMinutes ?? null);
        });
    }

    async checkOut(dto: CheckOutDto): Promise<AttendanceEventWithUser> {
        const workDate = this.toWorkDate(dto.occurredAt);
        const occurredAt = new Date(dto.occurredAt);

        return this.dataSource.transaction(async (manager) => {
            const recordRepo = manager.getRepository(AttendanceRecord);
            const eventRepo = manager.getRepository(AttendanceEvent);

            const { assignment, record, employee } = await this.ensureAssignmentAndRecord(
                dto.employeeId,
                workDate,
                manager,
            );
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

            const event = await eventRepo.save(
                await this.createEvent(record.id, AttendanceEventType.CHECK_OUT, occurredAt, dto.source, dto),
            );
            record.auditCheckOut = [...(record.auditCheckOut ?? []), { occurredAt, source: dto.source, deviceId: dto.deviceId ?? null }];
            record.checkedOutAt = occurredAt;
            record.status = AttendanceStatus.COMPLETED;
            record.checkOutSource = dto.source;
            await recordRepo.save(record);
            return this.toAttendanceEventWithUser(event, employee);
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
                await this.createEvent(record.id, AttendanceEventType.CHECK_IN, occurredAt, AttendanceSource.ADMIN_MANUAL, dto,),
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
                await this.createEvent(record.id, AttendanceEventType.CHECK_OUT, occurredAt, AttendanceSource.ADMIN_MANUAL, dto),
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

    async findOne(id: string): Promise<AttendanceRecord> {
        const record = await this.recordRepo
            .createQueryBuilder('record')
            .leftJoin('record.employee', 'employee')
            .addSelect([
                'employee.id',
                'employee.employeeCode',
                'employee.name',
                'employee.accountRole',
                'employee.isActive',
                'employee.department',
                'employee.departmentId',
                'employee.jobTitle',
                'employee.phone',
                'employee.email',
                'employee.dateOfBirth',
                'employee.createdAt',
                'employee.updatedAt',
            ])
            .leftJoinAndSelect('record.shiftAssignment', 'shiftAssignment')
            .leftJoinAndSelect('shiftAssignment.shift', 'shift')
            .where('record.id = :id', { id })
            .getOne();

        if (!record) {
            throw new NotFoundException(`Attendance record ${id} not found.`);
        }

        await this.enrichRecordsWithAuditEvents([record]);

        return record;
    }

    async findOneEvent(id: string): Promise<AttendanceEventWithUser> {
        const event = await this.eventRepo.findOne({ where: { id } });

        if (!event) {
            throw new NotFoundException(`Attendance event ${id} not found.`);
        }

        const record = await this.recordRepo
            .createQueryBuilder('record')
            .leftJoin('record.employee', 'employee')
            .addSelect([
                'employee.id',
                'employee.employeeCode',
                'employee.name',
                'employee.department',
                'employee.departmentId',
                'employee.jobTitle',
            ])
            .where('record.id = :id', { id: event.attendanceRecordId })
            .getOne();

        if (!record?.employee) {
            throw new NotFoundException(`Attendance record ${event.attendanceRecordId} not found.`);
        }

        return this.toAttendanceEventWithUser(event, record.employee, record.lateMinutes ?? null);
    }

    async getAdminDashboard(query: QueryAttendanceDashboardDto): Promise<{
        workDate: string;
        generatedAt: string;
        timezone: string;
        totals: DashboardTotals;
        rates: {
            attendanceRate: number;
            completionRate: number;
            lateRate: number;
        };
        departments: DashboardDepartmentSummary[];
        attention: DashboardAttentionRow[];
        actions: {
            canFinalizeDay: boolean;
            finalizablePendingCount: number;
            finalizableCheckedInCount: number;
        };
    }> {
        const workDate = query.workDate ?? this.todayWorkDate();
        const assignmentQb = this.assignmentRepo
            .createQueryBuilder('assignment')
            .leftJoinAndSelect('assignment.employee', 'employee')
            .leftJoinAndSelect('assignment.shift', 'shift')
            .leftJoinAndSelect('shift.workPeriods', 'workPeriod')
            .leftJoinAndMapOne(
                'assignment.dashboardRecord',
                AttendanceRecord,
                'record',
                'record.shiftAssignmentId = assignment.id',
            )
            .leftJoin(Department, 'department', 'department.id = employee.departmentId')
            .where('assignment.workDate = :workDate', { workDate })
            .orderBy('employee.name', 'ASC')
            .addOrderBy('workPeriod.startTime', 'ASC');

        if (query.departmentId) {
            assignmentQb.andWhere('department.id = :departmentId', {
                departmentId: query.departmentId,
            });
        }

        const assignments = await assignmentQb.getMany();
        const totals: DashboardTotals = {
            scheduled: assignments.length,
            pending: 0,
            checkedIn: 0,
            completed: 0,
            late: 0,
            absent: 0,
            missingCheckOut: 0,
            onLeave: 0,
            invalid: 0,
            noRecord: 0,
        };
        const departmentMap = new Map<string, DashboardDepartmentSummary>();
        const attention: DashboardAttentionRow[] = [];
        let finalizablePendingCount = 0;
        let finalizableCheckedInCount = 0;

        for (const assignment of assignments) {
            const record =
                (assignment as EmployeeShiftAssignment & {
                    dashboardRecord?: AttendanceRecord | null;
                }).dashboardRecord ?? null;
            const status: DashboardRecordStatus = record?.status ?? 'no_record';
            const lateMinutes = record?.lateMinutes ?? 0;
            const department = this.getDepartmentBucket(departmentMap, assignment);
            const expectedTimes = record
                ? {
                    expectedCheckInAt: record.expectedCheckInAt.toISOString(),
                    expectedCheckOutAt: record.expectedCheckOutAt.toISOString(),
                }
                : this.deriveExpectedTimes(assignment);

            this.incrementDashboardTotals(totals, status, lateMinutes);
            this.incrementDepartmentSummary(department, status, lateMinutes);

            if (record?.status === AttendanceStatus.PENDING) {
                finalizablePendingCount += 1;
            }
            if (record?.status === AttendanceStatus.CHECKED_IN) {
                finalizableCheckedInCount += 1;
            }

            const recommendedAction = this.getRecommendedAction(status);
            if (recommendedAction !== 'none' || lateMinutes > 0) {
                attention.push({
                    recordId: record?.id ?? null,
                    shiftAssignmentId: assignment.id,
                    employeeId: assignment.employeeId,
                    employeeCode: assignment.employee?.employeeCode ?? '',
                    employeeName: assignment.employee?.name ?? 'Unknown employee',
                    departmentId: assignment.employee?.departmentId ?? null,
                    departmentName: assignment.employee?.department ?? null,
                    shiftName: assignment.shift?.name ?? 'Unknown shift',
                    status,
                    expectedCheckInAt: expectedTimes.expectedCheckInAt,
                    expectedCheckOutAt: expectedTimes.expectedCheckOutAt,
                    checkedInAt: record?.checkedInAt?.toISOString() ?? null,
                    checkedOutAt: record?.checkedOutAt?.toISOString() ?? null,
                    lateMinutes,
                    recommendedAction,
                });
            }
        }

        return {
            workDate,
            generatedAt: new Date().toISOString(),
            timezone: this.appTimezone,
            totals,
            rates: {
                attendanceRate: this.toRate(totals.checkedIn + totals.completed, totals.scheduled),
                completionRate: this.toRate(totals.completed, totals.scheduled),
                lateRate: this.toRate(totals.late, totals.scheduled),
            },
            departments: [...departmentMap.values()].sort((left, right) =>
                left.name.localeCompare(right.name),
            ),
            attention: attention.sort((left, right) =>
                this.getAttentionSeverity(left) - this.getAttentionSeverity(right) ||
                left.employeeName.localeCompare(right.employeeName),
            ),
            actions: {
                canFinalizeDay: finalizablePendingCount + finalizableCheckedInCount > 0,
                finalizablePendingCount,
                finalizableCheckedInCount,
            },
        };
    }

    private incrementDashboardTotals(
        totals: DashboardTotals,
        status: DashboardRecordStatus,
        lateMinutes: number,
    ): void {
        if (status === 'no_record') {
            totals.noRecord += 1;
        } else if (status === AttendanceStatus.PENDING) {
            totals.pending += 1;
        } else if (status === AttendanceStatus.CHECKED_IN) {
            totals.checkedIn += 1;
        } else if (status === AttendanceStatus.COMPLETED) {
            totals.completed += 1;
        } else if (status === AttendanceStatus.ABSENT) {
            totals.absent += 1;
        } else if (status === AttendanceStatus.MISSING_CHECK_OUT) {
            totals.missingCheckOut += 1;
        } else if (status === AttendanceStatus.ON_LEAVE) {
            totals.onLeave += 1;
        } else if (status === AttendanceStatus.INVALID) {
            totals.invalid += 1;
        }

        if (lateMinutes > 0) {
            totals.late += 1;
        }
    }

    private incrementDepartmentSummary(
        department: DashboardDepartmentSummary,
        status: DashboardRecordStatus,
        lateMinutes: number,
    ): void {
        department.scheduled += 1;

        if (status === 'no_record' || status === AttendanceStatus.PENDING) {
            department.pending += 1;
        } else if (status === AttendanceStatus.CHECKED_IN) {
            department.checkedIn += 1;
        } else if (status === AttendanceStatus.COMPLETED) {
            department.completed += 1;
        } else if (status === AttendanceStatus.ABSENT) {
            department.absent += 1;
        } else if (status === AttendanceStatus.MISSING_CHECK_OUT) {
            department.missingCheckOut += 1;
        } else if (status === AttendanceStatus.ON_LEAVE) {
            department.onLeave += 1;
        }

        if (lateMinutes > 0) {
            department.late += 1;
        }
    }

    private getDepartmentBucket(
        departmentMap: Map<string, DashboardDepartmentSummary>,
        assignment: EmployeeShiftAssignment,
    ): DashboardDepartmentSummary {
        const id = assignment.employee?.departmentId ?? null;
        const key = id ?? 'unassigned';
        const existing = departmentMap.get(key);

        if (existing) {
            return existing;
        }

        const department: DashboardDepartmentSummary = {
            id,
            name: assignment.employee?.department ?? 'Unassigned',
            scheduled: 0,
            checkedIn: 0,
            completed: 0,
            late: 0,
            absent: 0,
            missingCheckOut: 0,
            onLeave: 0,
            pending: 0,
        };
        departmentMap.set(key, department);
        return department;
    }

    private getRecommendedAction(
        status: DashboardRecordStatus,
    ): DashboardRecommendedAction {
        if (status === 'no_record' || status === AttendanceStatus.PENDING) {
            return 'manual_check_in';
        }
        if (status === AttendanceStatus.MISSING_CHECK_OUT) {
            return 'manual_check_out';
        }
        if (status === AttendanceStatus.ABSENT || status === AttendanceStatus.INVALID) {
            return 'review_absence';
        }
        return 'none';
    }

    private getAttentionSeverity(row: DashboardAttentionRow): number {
        if (row.status === AttendanceStatus.MISSING_CHECK_OUT) return 0;
        if (row.status === AttendanceStatus.ABSENT || row.status === AttendanceStatus.INVALID) return 1;
        if (row.lateMinutes > 0) return 2;
        if (row.status === 'no_record' || row.status === AttendanceStatus.PENDING) return 3;
        if (row.status === AttendanceStatus.CHECKED_IN) return 4;
        return 5;
    }

    private deriveExpectedTimes(assignment: EmployeeShiftAssignment): {
        expectedCheckInAt: string;
        expectedCheckOutAt: string;
    } {
        const periods = [...(assignment.shift?.workPeriods ?? [])].sort((left, right) =>
            left.startTime.localeCompare(right.startTime),
        );
        const firstPeriod = periods[0];
        const lastPeriod = periods[periods.length - 1] ?? firstPeriod;
        const offset = process.env['APP_TZ_OFFSET'] ?? '+07:00';

        if (!firstPeriod || !lastPeriod) {
            return {
                expectedCheckInAt: new Date(`${assignment.workDate}T00:00:00${offset}`).toISOString(),
                expectedCheckOutAt: new Date(`${assignment.workDate}T23:59:00${offset}`).toISOString(),
            };
        }

        const startTime = this.toClockTime(firstPeriod.startTime);
        const endTime = this.toClockTime(lastPeriod.endTime);
        const expectedCheckInAt = new Date(`${assignment.workDate}T${startTime}:00${offset}`);
        const expectedCheckOutAt = new Date(`${assignment.workDate}T${endTime}:00${offset}`);

        if (
            lastPeriod.isCrossMidnight ||
            this.timeToMinutes(endTime) <= this.timeToMinutes(startTime)
        ) {
            expectedCheckOutAt.setUTCDate(expectedCheckOutAt.getUTCDate() + 1);
        }

        return {
            expectedCheckInAt: expectedCheckInAt.toISOString(),
            expectedCheckOutAt: expectedCheckOutAt.toISOString(),
        };
    }

    private toClockTime(value: string): string {
        return value.slice(0, 5);
    }

    private timeToMinutes(value: string): number {
        const [hours = 0, minutes = 0] = value.split(':').map(Number);
        return hours * 60 + minutes;
    }

    private toRate(numerator: number, denominator: number): number {
        if (denominator <= 0) {
            return 0;
        }

        return Math.round((numerator / denominator) * 1000) / 10;
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
                id: event.id,
                occurredAt: event.occurredAt,
                source: event.source,
                deviceId: event.deviceId ?? null,
                latitude: event.latitude ?? null,
                longitude: event.longitude ?? null,
                isOutOfZone: event.isOutOfZone ?? null,
            }));
    }

    private normalizeStoredAuditEntries(entries: unknown, fallbackSource?: AttendanceSource | null): AuditEntry[] {
        if (!Array.isArray(entries) || !fallbackSource) return [];

        return entries.flatMap((entry) => {
            if (entry instanceof Date || typeof entry === 'string') {
                return [
                    {
                        occurredAt: new Date(entry),
                        source: fallbackSource,
                        deviceId: null,
                        latitude: null,
                        longitude: null,
                        isOutOfZone: null,
                    },
                ];
            }

            if (!entry || typeof entry !== 'object') return [];

            const value = entry as Partial<AuditEntry>;
            if (!value.occurredAt) return [];

            return [
                {
                    occurredAt: new Date(value.occurredAt),
                    source: value.source ?? fallbackSource,
                    deviceId: value.deviceId ?? null,
                    latitude: value.latitude ?? null,
                    longitude: value.longitude ?? null,
                    isOutOfZone: value.isOutOfZone ?? null,
                },
            ];
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
