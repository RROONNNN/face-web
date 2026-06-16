import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttendanceTables1781627000000 implements MigrationInterface {
  name = 'CreateAttendanceTables1781627000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."attendance_method_enum" AS ENUM('mobile', 'sync', 'manual')`,
    );
    await queryRunner.query(
      `CREATE TABLE "check_ins" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employee_id" uuid NOT NULL, "shift_id" uuid NOT NULL, "work_date" date NOT NULL, "time" TIMESTAMP WITH TIME ZONE NOT NULL, "latitude" double precision, "longitude" double precision, "method" "public"."attendance_method_enum" NOT NULL, "image_path" character varying, "is_out_of_zone" boolean NOT NULL DEFAULT false, "created_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_check_ins_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_check_ins_employee_work_date" ON "check_ins" ("employee_id", "work_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_check_ins_work_date" ON "check_ins" ("work_date")`,
    );
    await queryRunner.query(
      `CREATE TABLE "check_outs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employee_id" uuid NOT NULL, "shift_id" uuid NOT NULL, "work_date" date NOT NULL, "time" TIMESTAMP WITH TIME ZONE NOT NULL, "latitude" double precision, "longitude" double precision, "method" "public"."attendance_method_enum" NOT NULL, "image_path" character varying, "is_out_of_zone" boolean NOT NULL DEFAULT false, "created_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_check_outs_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_check_outs_employee_work_date" ON "check_outs" ("employee_id", "work_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_check_outs_work_date" ON "check_outs" ("work_date")`,
    );
    await queryRunner.query(
      `ALTER TABLE "check_ins" ADD CONSTRAINT "FK_check_ins_employee" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "check_ins" ADD CONSTRAINT "FK_check_ins_shift" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "check_ins" ADD CONSTRAINT "FK_check_ins_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "check_outs" ADD CONSTRAINT "FK_check_outs_employee" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "check_outs" ADD CONSTRAINT "FK_check_outs_shift" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "check_outs" ADD CONSTRAINT "FK_check_outs_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "check_outs" DROP CONSTRAINT "FK_check_outs_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "check_outs" DROP CONSTRAINT "FK_check_outs_shift"`,
    );
    await queryRunner.query(
      `ALTER TABLE "check_outs" DROP CONSTRAINT "FK_check_outs_employee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "check_ins" DROP CONSTRAINT "FK_check_ins_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "check_ins" DROP CONSTRAINT "FK_check_ins_shift"`,
    );
    await queryRunner.query(
      `ALTER TABLE "check_ins" DROP CONSTRAINT "FK_check_ins_employee"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_check_outs_work_date"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_check_outs_employee_work_date"`,
    );
    await queryRunner.query(`DROP TABLE "check_outs"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_check_ins_work_date"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_check_ins_employee_work_date"`,
    );
    await queryRunner.query(`DROP TABLE "check_ins"`);
    await queryRunner.query(`DROP TYPE "public"."attendance_method_enum"`);
  }
}
