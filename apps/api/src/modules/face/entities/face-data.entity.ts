import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('face_data')
export class FaceData {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_face_data_employee_id_unique', { unique: true })
  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee!: User;

  @Column({ name: 'list_face_embedding', type: 'jsonb' })
  listFaceEmbedding!: number[][];

  @Column({ name: 'image_url', type: 'varchar' })
  imageUrl!: string;

  @Column({ name: 'updated_time', type: 'timestamptz' })
  updatedTime!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
