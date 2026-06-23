import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('holidays')
@Index(['date'], { unique: true })
export class Holiday {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    /**
     * Calendar date of the holiday, stored as a plain date (no time component).
     * Unique — you cannot register two holidays on the same day.
     */
    @Column({ type: 'date' })
    date!: string; // ISO-8601 "YYYY-MM-DD"

    /**
     * Display name of the holiday, e.g. "Tết Nguyên Đán".
     */
    @Column({ type: 'varchar', length: 200 })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;
}
