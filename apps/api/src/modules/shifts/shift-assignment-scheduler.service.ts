import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { EmployeeShiftAssignment } from './entities/employee-shift-assignment.entity';
import { ShiftAssignmentSource } from './enums/shift-assignment-source.enum';

@Injectable()
export class ShiftAssignmentSchedulerService {
    private readonly logger = new Logger(ShiftAssignmentSchedulerService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(EmployeeShiftAssignment)
        private readonly assignmentRepo: Repository<EmployeeShiftAssignment>,
        private readonly dataSource: DataSource,
    ) { }

    private get appTimezone(): string {
        return process.env['APP_TIMEZONE'] ?? 'Asia/Ho_Chi_Minh';
    }

    /**
     * Returns YYYY-MM-DD for the next calendar day in the application timezone.
     */
    public tomorrowWorkDate(): string {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return new Intl.DateTimeFormat('sv-SE', {
            timeZone: this.appTimezone,
        }).format(tomorrow);
    }

    /**
     * Runs every day at 01:00 AM in the application timezone.
     * Generates department_default shift assignments for all active employees
     * whose department has a defaultShiftId set.
     *
     * Uses INSERT ... ON CONFLICT DO NOTHING, so it is fully idempotent.
     * Skips employees who already have any assignment for that date (any source).
     */
    @Cron('0 1 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
    async generateDepartmentDefaultAssignments(targetDate?: string): Promise<void> {
        const workDate = targetDate ?? this.tomorrowWorkDate();
        this.logger.log(`[ShiftAssignmentScheduler] Generating department_default assignments for ${workDate}`);

        try {
            await this.generateForDate(workDate);
        } catch (err) {
            this.logger.error(
                `[ShiftAssignmentScheduler] Failed to generate assignments for ${workDate}`,
                err instanceof Error ? err.stack : String(err),
            );
            throw err;
        }
    }

    /**
     * Core generation logic, extracted for testability and manual triggering.
     *
     * Fetches all active users with a departmentId that has a defaultShiftId,
     * then bulk-inserts assignments using INSERT ... ON CONFLICT DO NOTHING.
     */
    async generateForDate(workDate: string): Promise<{ inserted: number; skipped: number }> {
        // Load all active users who are in a department with a default shift.
        // The department join is done via raw query for efficiency.
        const employees = await this.userRepo
            .createQueryBuilder('user')
            .innerJoin(
                'departments',
                'dept',
                'dept.id = user.department_id AND dept.is_active = true AND dept.default_shift_id IS NOT NULL',
            )
            .select([
                'user.id AS "employeeId"',
                'dept.default_shift_id AS "defaultShiftId"',
            ])
            .where('user.department_id IS NOT NULL')
            .getRawMany<{ employeeId: string; defaultShiftId: string }>();

        if (employees.length === 0) {
            this.logger.log('[ShiftAssignmentScheduler] No eligible employees found. Skipping.');
            return { inserted: 0, skipped: 0 };
        }

        // Bulk insert with ON CONFLICT DO NOTHING for idempotency.
        // The unique constraint on (employee_id, work_date) ensures no duplicates.
        const result = await this.dataSource
            .createQueryBuilder()
            .insert()
            .into(EmployeeShiftAssignment)
            .values(
                employees.map((emp) => ({
                    employeeId: emp.employeeId,
                    shiftId: emp.defaultShiftId,
                    workDate,
                    source: ShiftAssignmentSource.DEPARTMENT_DEFAULT,
                    assignedByUserId: null,
                    note: null,
                    leaveShiftWorkPeriodIds: [],
                })),
            )
            .orIgnore() // ON CONFLICT DO NOTHING
            .execute();

        // const inserted = result.raw?.length ?? 0;
        this.logger.debug(`[ShiftAssignmentScheduler] Raw insert result: ${JSON.stringify(result)}`);
        const inserted = Array.isArray(result.raw) ? result.raw.length : 0;
        const skipped = employees.length - inserted;

        this.logger.log(
            `[ShiftAssignmentScheduler] ${workDate}: ${inserted} inserted, ${skipped} skipped (already assigned).`,
        );
        return { inserted, skipped };
    }
}
