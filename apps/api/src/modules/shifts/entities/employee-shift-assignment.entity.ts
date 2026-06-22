import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { ShiftAssignmentSource } from "../enums/shift-assignment-source.enum";
import { Shift } from "./shift.entity";
@Entity('employee_shift_assignments')
@Unique(['employeeId', 'workDate'])
export class EmployeeShiftAssignment {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
    @ManyToOne(() => User, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'employee_id' })
    employee!: User;
    @Column({ name: 'employee_id', type: 'uuid' })
    employeeId!: string;
    @ManyToOne(() => Shift, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'shift_id' })
    shift!: Shift;
    @Column({ name: 'shift_id', type: 'uuid' })
    shiftId!: string;
    @Column({ name: 'work_date', type: 'date' })
    workDate!: string;
    @Column({
        name: 'source', type: 'enum',
        enum: ShiftAssignmentSource,
        enumName: 'shift_assignment_source',
        default: ShiftAssignmentSource.DEPARTMENT_DEFAULT,
    })
    source!: ShiftAssignmentSource;

    @ManyToOne(() => User, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'assigned_by_user_id' })

    assignedByUser?: User | null;
    @Column({
        name: 'assigned_by_user_id',
        type: 'uuid',
        nullable: true,
    })
    assignedByUserId?: string | null;

    @Column({
        type: 'text',
        nullable: true,
    })
    note?: string | null;

    @Column({ name: 'leave_shift_work_period_ids', type: 'json', nullable: true, default: [] })
    leaveShiftWorkPeriodIds!: string[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}