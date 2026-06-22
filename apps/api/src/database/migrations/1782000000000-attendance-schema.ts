import { MigrationInterface, QueryRunner } from "typeorm";

export class AttendanceSchema1782000000000 implements MigrationInterface {
    name = 'AttendanceSchema1782000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enums
        await queryRunner.query(`CREATE TYPE "public"."shift_assignment_source" AS ENUM('department_default', 'admin_manual')`);
        await queryRunner.query(`CREATE TYPE "public"."attendance_status" AS ENUM('pending', 'checked_in', 'completed', 'missing_check_out', 'absent', 'on_leave', 'invalid')`);
        await queryRunner.query(`CREATE TYPE "public"."attendance_source" AS ENUM('mobile_face_recognition', 'admin_manual', 'fingerprint_device')`);
        await queryRunner.query(`CREATE TYPE "public"."attendance_event_type" AS ENUM('check_in', 'check_out')`);

        // employee_shift_assignments
        await queryRunner.query(`
            CREATE TABLE "employee_shift_assignments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "employee_id" uuid NOT NULL,
                "shift_id" uuid NOT NULL,
                "work_date" date NOT NULL,
                "source" "public"."shift_assignment_source" NOT NULL DEFAULT 'department_default',
                "assigned_by_user_id" uuid,
                "note" text,
                "leave_shift_work_period_ids" json NOT NULL DEFAULT '[]',
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_employee_shift_assignments" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "FK_esa_employee" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "FK_esa_shift" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE RESTRICT`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "FK_esa_assigned_by" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL`);

        // attendance_records
        await queryRunner.query(`
            CREATE TABLE "attendance_records" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "employee_id" uuid NOT NULL,
                "shift_assignment_id" uuid NOT NULL,
                "work_date" date NOT NULL,
                "status" "public"."attendance_status" NOT NULL DEFAULT 'pending',
                "expected_check_in_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "expected_check_out_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "checked_in_at" TIMESTAMP WITH TIME ZONE,
                "checked_out_at" TIMESTAMP WITH TIME ZONE,
                "audit_check_in" json NOT NULL DEFAULT '[]',
                "audit_check_out" json NOT NULL DEFAULT '[]',
                "check_in_source" "public"."attendance_source",
                "check_out_source" "public"."attendance_source",
                "late_minutes" integer NOT NULL DEFAULT 0,
                CONSTRAINT "PK_attendance_records" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_ar_employee" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_ar_shift_assignment" FOREIGN KEY ("shift_assignment_id") REFERENCES "employee_shift_assignments"("id") ON DELETE RESTRICT`);
        await queryRunner.query(`CREATE INDEX "IDX_ar_employee_work_date" ON "attendance_records" ("employee_id", "work_date")`);
        await queryRunner.query(`CREATE INDEX "IDX_ar_work_date_status" ON "attendance_records" ("work_date", "status")`);

        // attendance_events
        await queryRunner.query(`
            CREATE TABLE "attendance_events" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "attendance_record_id" uuid NOT NULL,
                "type" "public"."attendance_event_type" NOT NULL,
                "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "source" "public"."attendance_source" NOT NULL,
                "face_similarity" double precision,
                "latitude" double precision,
                "longitude" double precision,
                "is_out_of_zone" boolean,
                "device_id" character varying,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_attendance_events" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_ae_attendance_record" ON "attendance_events" ("attendance_record_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_ae_attendance_record"`);
        await queryRunner.query(`DROP TABLE "attendance_events"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_ar_work_date_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ar_employee_work_date"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_ar_shift_assignment"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_ar_employee"`);
        await queryRunner.query(`DROP TABLE "attendance_records"`);

        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" DROP CONSTRAINT "FK_esa_assigned_by"`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" DROP CONSTRAINT "FK_esa_shift"`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" DROP CONSTRAINT "FK_esa_employee"`);
        await queryRunner.query(`DROP TABLE "employee_shift_assignments"`);

        await queryRunner.query(`DROP TYPE "public"."attendance_event_type"`);
        await queryRunner.query(`DROP TYPE "public"."attendance_source"`);
        await queryRunner.query(`DROP TYPE "public"."attendance_status"`);
        await queryRunner.query(`DROP TYPE "public"."shift_assignment_source"`);
    }
}
