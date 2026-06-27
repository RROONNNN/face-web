import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('geofence_config')
export class GeofenceConfig {
    @PrimaryColumn({ type: 'varchar', length: 32 })
    id!: string;

    @Column({ name: 'center_lat', type: 'double precision', nullable: true })
    centerLat!: number | null;

    @Column({ name: 'center_lon', type: 'double precision', nullable: true })
    centerLon!: number | null;

    @Column({ name: 'radius_meters', type: 'int', nullable: true })
    radiusMeters!: number | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;
}
