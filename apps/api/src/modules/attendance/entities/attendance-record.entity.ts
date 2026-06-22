import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { EmployeeShiftAssignment } from "../../shifts/entities/employee-shift-assignment.entity";
import { User } from "../../users/entities/user.entity";
import { AttendanceSource } from "../enums/attendance-source.enum";
import { AttendanceStatus } from "../enums/attendance-status.enum";
@Entity('attendance_records')
export class AttendanceRecord {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => User, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'employee_id' })
    employee!: User;
    @Column({ name: 'employee_id', type: 'uuid' })
    employeeId!: string;

    @ManyToOne(() => EmployeeShiftAssignment, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'shift_assignment_id' })
    shiftAssignment!: EmployeeShiftAssignment;

    @Column({ name: 'shift_assignment_id', type: 'uuid' })
    shiftAssignmentId!: string;

    // Copied from the shift assignment. Never accept it from mobile.
    @Column({ name: 'work_date', type: 'date' })
    workDate!: string;

    @Column({
        type: 'enum',
        enum: AttendanceStatus,
        enumName: 'attendance_status',
        default: AttendanceStatus.PENDING,
    })
    status!: AttendanceStatus;

    // Effective expected times, after leave rules are applied in the future.
    @Column({ name: 'expected_check_in_at', type: 'timestamptz' })
    expectedCheckInAt!: Date;

    @Column({ name: 'expected_check_out_at', type: 'timestamptz' })
    expectedCheckOutAt!: Date;

    @Column({ name: 'checked_in_at', type: 'timestamptz', nullable: true })
    checkedInAt?: Date | null;

    @Column({ name: 'checked_out_at', type: 'timestamptz', nullable: true })
    checkedOutAt?: Date | null;

    @Column({ name: 'audit_check_in', type: 'json', default: [] })
    auditCheckIn!: Date[];

    @Column({ name: 'audit_check_out', type: 'json', default: [] })
    auditCheckOut!: Date[];

    @Column({
        name: 'check_in_source',
        type: 'enum',
        enum: AttendanceSource,
        enumName: 'attendance_source',
        nullable: true,
    })
    checkInSource?: AttendanceSource | null;
    @Column({
        name: 'check_out_source',
        type: 'enum',
        enum: AttendanceSource,
        enumName: 'attendance_source',
        nullable: true,
    })
    checkOutSource?: AttendanceSource | null;
    @Column({ name: 'late_minutes', type: 'int', default: 0 })
    lateMinutes!: number;
}