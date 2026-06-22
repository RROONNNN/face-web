import { MigrationInterface, QueryRunner } from "typeorm";

export class Attendance1782138347660 implements MigrationInterface {
    name = 'Attendance1782138347660'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" DROP CONSTRAINT "FK_esa_employee"`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" DROP CONSTRAINT "FK_esa_shift"`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" DROP CONSTRAINT "FK_esa_assigned_by"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_ar_employee"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_ar_shift_assignment"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ae_attendance_record"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ar_employee_work_date"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ar_work_date_status"`);
        await queryRunner.query(`ALTER TABLE "shifts" ADD "flexible_window_minutes" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "attendance_events" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "attendance_events" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" ALTER COLUMN "leave_shift_work_period_ids" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "UQ_ab47359780873d709d81b8f1da4" UNIQUE ("employee_id", "work_date")`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "FK_1dcd8603c898d7a12fab61756d7" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "FK_2f55d21c44c8931bdbcac5de6a3" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "FK_946254745468236879e4ec1fd7c" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_f97d7be854091ef9ab5d75c0de3" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_dd858450c156b221a69cd764f06" FOREIGN KEY ("shift_assignment_id") REFERENCES "employee_shift_assignments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_dd858450c156b221a69cd764f06"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_f97d7be854091ef9ab5d75c0de3"`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" DROP CONSTRAINT "FK_946254745468236879e4ec1fd7c"`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" DROP CONSTRAINT "FK_2f55d21c44c8931bdbcac5de6a3"`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" DROP CONSTRAINT "FK_1dcd8603c898d7a12fab61756d7"`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" DROP CONSTRAINT "UQ_ab47359780873d709d81b8f1da4"`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" ALTER COLUMN "leave_shift_work_period_ids" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "attendance_events" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "attendance_events" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "shifts" DROP COLUMN "flexible_window_minutes"`);
        await queryRunner.query(`CREATE INDEX "IDX_ar_work_date_status" ON "attendance_records" USING btree ("work_date", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_ar_employee_work_date" ON "attendance_records" USING btree ("employee_id", "work_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_ae_attendance_record" ON "attendance_events" USING btree ("attendance_record_id") `);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_ar_shift_assignment" FOREIGN KEY ("shift_assignment_id") REFERENCES "employee_shift_assignments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_ar_employee" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "FK_esa_assigned_by" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "FK_esa_shift" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "FK_esa_employee" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

}
