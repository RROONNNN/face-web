import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EmployeeShiftAssignment } from '../../shifts/entities/employee-shift-assignment.entity';
import { LeaveDayScope } from '../enums/leave-day-scope.enum';
import { LeaveRequest } from './leave-request.entity';

export interface LeavePeriodSnapshot {
  workPeriodId: string;
  name: string;
  startTime: string;
  endTime: string;
  isCrossMidnight: boolean;
}

@Entity('leave_request_days')
@Unique('UQ_leave_request_days_request_date', ['leaveRequestId', 'workDate'])
@Index('IDX_leave_request_days_work_date', ['workDate'])
export class LeaveRequestDay {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'leave_request_id', type: 'uuid' })
  leaveRequestId!: string;

  @ManyToOne(() => LeaveRequest, (request) => request.days, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'leave_request_id' })
  leaveRequest!: LeaveRequest;

  @Column({ name: 'work_date', type: 'date' })
  workDate!: string;

  @Column({
    type: 'enum',
    enum: LeaveDayScope,
    enumName: 'leave_day_scope',
  })
  scope!: LeaveDayScope;

  @Column({ name: 'shift_assignment_id', type: 'uuid', nullable: true })
  shiftAssignmentId!: string | null;

  @ManyToOne(() => EmployeeShiftAssignment, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'shift_assignment_id' })
  shiftAssignment!: EmployeeShiftAssignment | null;

  @Column({ name: 'requested_periods', type: 'jsonb', default: [] })
  requestedPeriods!: LeavePeriodSnapshot[];
}
