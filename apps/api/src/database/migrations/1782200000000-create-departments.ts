import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDepartments1782200000000 implements MigrationInterface {
    name = 'CreateDepartments1782200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create departments table with required default_shift_id FK
        await queryRunner.query(`
            CREATE TABLE "departments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "code" character varying(32) NOT NULL,
                "name" character varying(150) NOT NULL,
                "description" text,
                "is_active" boolean NOT NULL DEFAULT true,
                "default_shift_id" uuid NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_departments" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_departments_code" ON "departments" ("code")
        `);

        await queryRunner.query(`
            ALTER TABLE "departments"
                ADD CONSTRAINT "FK_departments_default_shift"
                FOREIGN KEY ("default_shift_id")
                REFERENCES "shifts"("id")
                ON DELETE RESTRICT
                ON UPDATE NO ACTION
        `);

        // Add department_id FK column to users (nullable — not all users are assigned yet)
        await queryRunner.query(`
            ALTER TABLE "users" ADD COLUMN "department_id" uuid
        `);

        await queryRunner.query(`
            ALTER TABLE "users"
                ADD CONSTRAINT "FK_users_department"
                FOREIGN KEY ("department_id")
                REFERENCES "departments"("id")
                ON DELETE SET NULL
                ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_department"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "department_id"`);
        await queryRunner.query(`ALTER TABLE "departments" DROP CONSTRAINT "FK_departments_default_shift"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_departments_code"`);
        await queryRunner.query(`DROP TABLE "departments"`);
    }
}
