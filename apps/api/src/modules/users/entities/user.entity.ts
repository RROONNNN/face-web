import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AccountRole } from "../../auth/account-role.enum";

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index({ unique: true })
    @Column({ name: 'employee_code', type: 'varchar', length: 32 })
    employeeCode!: string;
    @Column({ type: 'varchar', length: 120 })
    name!: string;
    @Column({ name: 'password_hash', type: 'varchar' })
    passwordHash!: string;
    @Column({
        name: 'account_role',
        type: 'enum',
        enum: AccountRole,
        default: AccountRole.Employee,
    })
    accountRole!: AccountRole;
    @Column({ type: 'varchar', length: 120, nullable: true })
    department!: string | null;
    @Column({ name: 'job_title', type: 'varchar', length: 120, nullable: true })
    jobTitle!: string | null;

    @Column({ type: 'varchar', length: 32, nullable: true })
    phone!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    email!: string | null;

    @Column({ name: 'date_of_birth', type: 'date', nullable: true })
    dateOfBirth!: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;
}
