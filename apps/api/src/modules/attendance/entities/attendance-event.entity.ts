import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";
import { AttendanceEventType } from "../enums/attendance-event.type";
import { AttendanceSource } from "../enums/attendance-source.enum";

@Entity('attendance_events')
export class AttendanceEvent {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'attendance_record_id', type: 'uuid' })
    attendanceRecordId!: string;

    @Column({
        type: 'enum',
        enum: AttendanceEventType,
        enumName: 'attendance_event_type',
    })
    type!: AttendanceEventType;

    @Column({ name: 'occurred_at', type: 'timestamptz' })
    occurredAt!: Date;

    @Column({
        type: 'enum',
        enum: AttendanceSource,
        enumName: 'attendance_source',
    })
    source!: AttendanceSource;

    @Column({ name: 'face_similarity', type: 'double precision', nullable: true })
    faceSimilarity?: number | null;

    @Column({ type: 'double precision', nullable: true })
    latitude?: number | null;

    @Column({ type: 'double precision', nullable: true })
    longitude?: number | null;

    @Column({ name: 'is_out_of_zone', type: 'boolean', nullable: true, default: null })
    isOutOfZone?: boolean | null;

    @Column({ name: 'device_id', type: 'varchar', nullable: true })
    deviceId?: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @Column({ name: 'image_url', type: 'varchar', nullable: true })
    imageUrl?: string | null;
}