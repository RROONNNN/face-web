import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateShiftTable1781626096248 implements MigrationInterface {
    name = 'CreateShiftTable1781626096248'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "shifts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "is_active" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_84d692e367e4d6cdf045828768c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_shifts_active_unique" ON "shifts"  ("is_active") WHERE "is_active" = true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_shifts_active_unique"`);
        await queryRunner.query(`DROP TABLE "shifts"`);
    }

}
