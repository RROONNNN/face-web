import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ShiftWorkPeriodEntity } from "./shift-work-period.entity";


@Entity('shifts')
export class ShiftEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
    @Column({ length: 150 })
    name!: string;
    @Column({ name: 'late_grace_minutes', type: 'int', default: 0 })
    lateGraceMinutes!: number;

    @Column({ name: 'is_active', default: true })
    isActive!: boolean;

    @OneToMany(() => ShiftWorkPeriodEntity, (period) => period.shift)
    workPeriods!: ShiftWorkPeriodEntity[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;

}