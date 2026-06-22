import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ShiftWorkPeriod } from "./shift-work-period.entity";


@Entity('shifts')
export class Shift {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
    @Column({ length: 150 })
    name!: string;
    @Column({ name: 'late_grace_minutes', type: 'int', default: 0 })
    lateGraceMinutes!: number;
    @Column({
        name: 'flexible_window_minutes',
        type: 'int',
        default: 0,
    })
    flexibleWindowMinutes!: number;

    @Column({ name: 'is_active', default: true })
    isActive!: boolean;

    @OneToMany(() => ShiftWorkPeriod, (period) => period.shift)
    workPeriods!: ShiftWorkPeriod[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;

}