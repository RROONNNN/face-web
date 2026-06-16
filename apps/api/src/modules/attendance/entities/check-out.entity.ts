import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { AttendanceMethod } from '../enums/attendance-method.enum';

@Entity('check_outs')
@Index('IDX_check_outs_employee_work_date', ['employeeId', 'workDate'])
@Index('IDX_check_outs_work_date', ['workDate'])
export class CheckOut {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'employee_id' })
  employee!: User;

  @Column({ name: 'shift_id', type: 'uuid' })
  shiftId!: string;

  @ManyToOne(() => Shift)
  @JoinColumn({ name: 'shift_id' })
  shift!: Shift;

  @Column({ name: 'work_date', type: 'date' })
  workDate!: string;

  @Column({ type: 'timestamptz' })
  time!: Date;

  @Column({ type: 'double precision', nullable: true })
  latitude!: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude!: number | null;

  @Column({
    type: 'enum',
    enum: AttendanceMethod,
    enumName: 'attendance_method_enum',
  })
  method!: AttendanceMethod;

  @Column({ name: 'image_path', type: 'varchar', nullable: true })
  imagePath!: string | null;

  @Column({ name: 'is_out_of_zone', type: 'boolean', default: false })
  isOutOfZone!: boolean;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
