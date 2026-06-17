import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('geo_configs')
export class GeoConfig {
  @PrimaryColumn({ type: 'varchar', length: 32, default: 'company' })
  id!: string;

  @Column({ name: 'center_lat', type: 'double precision' })
  centerLat!: number;

  @Column({ name: 'center_lon', type: 'double precision' })
  centerLon!: number;

  @Column({ name: 'radius_meters', type: 'integer' })
  radiusMeters!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
