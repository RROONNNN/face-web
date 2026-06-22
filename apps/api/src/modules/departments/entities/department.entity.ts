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
import { Shift } from '../../shifts/entities/shift.entity';

@Entity('departments')
export class Department {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 32 })
    code!: string;

    @Column({ type: 'varchar', length: 150 })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ name: 'is_active', default: true })
    isActive!: boolean;

    /**
     * The default shift assigned to all employees in this department.
     * Required — active departments must always have a default shift.
     */
    @ManyToOne(() => Shift, { nullable: false, onDelete: 'RESTRICT', eager: false })
    @JoinColumn({ name: 'default_shift_id' })
    defaultShift!: Shift;

    @Column({ name: 'default_shift_id', type: 'uuid' })
    defaultShiftId!: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;
}
