import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateShiftTables1781987330524 implements MigrationInterface {
    name = 'CreateShiftTables1781987330524'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "shift_work_periods" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "shift_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "is_cross_midnight" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_7364b8821fcdf41e6b36c4d3f65" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "shifts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "late_grace_minutes" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_84d692e367e4d6cdf045828768c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "shift_work_periods" ADD CONSTRAINT "FK_7331098ac106537424254887257" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shift_work_periods" DROP CONSTRAINT "FK_7331098ac106537424254887257"`);
        await queryRunner.query(`DROP TABLE "shifts"`);
        await queryRunner.query(`DROP TABLE "shift_work_periods"`);
    }

}
