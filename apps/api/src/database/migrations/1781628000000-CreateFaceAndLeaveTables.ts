import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFaceAndLeaveTables1781628000000 implements MigrationInterface {
  name = 'CreateFaceAndLeaveTables1781628000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "face_data" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employee_id" uuid NOT NULL, "list_face_embedding" jsonb NOT NULL, "image_url" character varying NOT NULL, "updated_time" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_face_data_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_face_data_employee_id_unique" ON "face_data" ("employee_id")`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."leave_request_status_enum" AS ENUM('pending', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "leave_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employee_id" uuid NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "reason" text NOT NULL, "status" "public"."leave_request_status_enum" NOT NULL DEFAULT 'pending', "reviewed_by_id" uuid, "reviewed_at" TIMESTAMP WITH TIME ZONE, "rejection_reason" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_leave_requests_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_leave_requests_employee_dates" ON "leave_requests" ("employee_id", "start_date", "end_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_leave_requests_status" ON "leave_requests" ("status")`,
    );
    await queryRunner.query(
      `ALTER TABLE "face_data" ADD CONSTRAINT "FK_face_data_employee" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_leave_requests_employee" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_leave_requests_reviewed_by" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "leave_requests" DROP CONSTRAINT "FK_leave_requests_reviewed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_requests" DROP CONSTRAINT "FK_leave_requests_employee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "face_data" DROP CONSTRAINT "FK_face_data_employee"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_leave_requests_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_leave_requests_employee_dates"`,
    );
    await queryRunner.query(`DROP TABLE "leave_requests"`);
    await queryRunner.query(`DROP TYPE "public"."leave_request_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_face_data_employee_id_unique"`,
    );
    await queryRunner.query(`DROP TABLE "face_data"`);
  }
}
