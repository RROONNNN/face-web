import { MigrationInterface, QueryRunner } from "typeorm";

export class AttendanceAuditUpdatee1782223664787 implements MigrationInterface {
    name = 'AttendanceAuditUpdatee1782223664787'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_department"`);
        await queryRunner.query(`ALTER TABLE "leave_requests" DROP CONSTRAINT "FK_leave_requests_employee"`);
        await queryRunner.query(`ALTER TABLE "leave_requests" DROP CONSTRAINT "FK_leave_requests_reviewer"`);
        await queryRunner.query(`ALTER TABLE "leave_request_days" DROP CONSTRAINT "FK_leave_request_days_request"`);
        await queryRunner.query(`ALTER TABLE "leave_request_days" DROP CONSTRAINT "FK_leave_request_days_assignment"`);
        await queryRunner.query(`ALTER TABLE "leave_requests" DROP CONSTRAINT "CHK_leave_requests_date_range"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "department" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_52b4b7c7d295e204add6dbe0a09" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_218036645b39530e50b45ff3118" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_request_days" ADD CONSTRAINT "FK_b0df7a21a1dce813054b354d86d" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_request_days" ADD CONSTRAINT "FK_340e1f3834328140d14e3286884" FOREIGN KEY ("shift_assignment_id") REFERENCES "employee_shift_assignments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leave_request_days" DROP CONSTRAINT "FK_340e1f3834328140d14e3286884"`);
        await queryRunner.query(`ALTER TABLE "leave_request_days" DROP CONSTRAINT "FK_b0df7a21a1dce813054b354d86d"`);
        await queryRunner.query(`ALTER TABLE "leave_requests" DROP CONSTRAINT "FK_218036645b39530e50b45ff3118"`);
        await queryRunner.query(`ALTER TABLE "leave_requests" DROP CONSTRAINT "FK_52b4b7c7d295e204add6dbe0a09"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "department" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "leave_requests" ADD CONSTRAINT "CHK_leave_requests_date_range" CHECK ((start_date <= end_date))`);
        await queryRunner.query(`ALTER TABLE "leave_request_days" ADD CONSTRAINT "FK_leave_request_days_assignment" FOREIGN KEY ("shift_assignment_id") REFERENCES "employee_shift_assignments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_request_days" ADD CONSTRAINT "FK_leave_request_days_request" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_leave_requests_reviewer" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_leave_requests_employee" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_users_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
