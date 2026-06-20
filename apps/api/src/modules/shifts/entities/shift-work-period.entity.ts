import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ShiftEntity } from "./shift.entity";


@Entity('shift_work_periods')
export class ShiftWorkPeriodEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => ShiftEntity, (shift) => shift.workPeriods, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'shift_id' })
    shift!: ShiftEntity;

    @Column({ name: 'shift_id', type: 'uuid' })
    shiftId!: string;

    @Column({ length: 100 })
    name!: string;

    @Column({ name: 'start_time', type: 'time' })
    startTime!: string;

    @Column({ name: 'end_time', type: 'time' })
    endTime!: string;

    @Column({ name: 'is_cross_midnight', default: false })
    isCrossMidnight!: boolean;
}