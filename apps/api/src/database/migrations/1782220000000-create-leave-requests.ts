import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLeaveRequests1782220000000 implements MigrationInterface {
  name = 'CreateLeaveRequests1782220000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."leave_request_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."leave_day_scope" AS ENUM('full_day', 'work_periods')`,
    );
    await queryRunner.query(`
      CREATE TABLE "leave_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employee_id" uuid NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "reason" text NOT NULL,
        "status" "public"."leave_request_status" NOT NULL DEFAULT 'pending',
        "reviewed_by_id" uuid,
        "reviewed_at" TIMESTAMP WITH TIME ZONE,
        "rejection_reason" text,
        "cancelled_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leave_requests" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_leave_requests_date_range" CHECK ("start_date" <= "end_date")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_leave_requests_employee_status" ON "leave_requests" ("employee_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_leave_requests_date_range" ON "leave_requests" ("start_date", "end_date")`,
    );
    await queryRunner.query(`
      CREATE TABLE "leave_request_days" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "leave_request_id" uuid NOT NULL,
        "work_date" date NOT NULL,
        "scope" "public"."leave_day_scope" NOT NULL,
        "shift_assignment_id" uuid,
        "requested_periods" jsonb NOT NULL DEFAULT '[]',
        CONSTRAINT "PK_leave_request_days" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_leave_request_days_request_date" UNIQUE ("leave_request_id", "work_date")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_leave_request_days_work_date" ON "leave_request_days" ("work_date")`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_leave_requests_employee" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_leave_requests_reviewer" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_request_days" ADD CONSTRAINT "FK_leave_request_days_request" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_request_days" ADD CONSTRAINT "FK_leave_request_days_assignment" FOREIGN KEY ("shift_assignment_id") REFERENCES "employee_shift_assignments"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "leave_request_days" DROP CONSTRAINT "FK_leave_request_days_assignment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_request_days" DROP CONSTRAINT "FK_leave_request_days_request"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_requests" DROP CONSTRAINT "FK_leave_requests_reviewer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_requests" DROP CONSTRAINT "FK_leave_requests_employee"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_leave_request_days_work_date"`,
    );
    await queryRunner.query(`DROP TABLE "leave_request_days"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_leave_requests_date_range"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_leave_requests_employee_status"`,
    );
    await queryRunner.query(`DROP TABLE "leave_requests"`);
    await queryRunner.query(`DROP TYPE "public"."leave_day_scope"`);
    await queryRunner.query(`DROP TYPE "public"."leave_request_status"`);
  }
}
