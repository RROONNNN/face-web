import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFace1782617980913 implements MigrationInterface {
    name = 'CreateFace1782617980913'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "departments" DROP CONSTRAINT "FK_departments_default_shift"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_departments_code"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_91fddbe23e927e1e525c152baa" ON "departments"  ("code") `);
        await queryRunner.query(`ALTER TABLE "departments" ADD CONSTRAINT "FK_5dc59e85e55906662c5e96f80ab" FOREIGN KEY ("default_shift_id") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "departments" DROP CONSTRAINT "FK_5dc59e85e55906662c5e96f80ab"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_91fddbe23e927e1e525c152baa"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_departments_code" ON "departments" USING btree ("code") `);
        await queryRunner.query(`ALTER TABLE "departments" ADD CONSTRAINT "FK_departments_default_shift" FOREIGN KEY ("default_shift_id") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

}
