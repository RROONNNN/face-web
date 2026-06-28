import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFace21782619862711 implements MigrationInterface {
    name = 'CreateFace21782619862711'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "face_data" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employee_id" uuid NOT NULL, "list_face_embedding" jsonb NOT NULL, "image_url" character varying NOT NULL, "updated_time" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_5537156f2f68ec1b5a2ba2334e" UNIQUE ("employee_id"), CONSTRAINT "PK_b5ef87b9bf5f84448d578a247ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_face_data_employee_id_unique" ON "face_data"  ("employee_id") `);
        await queryRunner.query(`ALTER TABLE "face_data" ADD CONSTRAINT "FK_5537156f2f68ec1b5a2ba2334e8" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "face_data" DROP CONSTRAINT "FK_5537156f2f68ec1b5a2ba2334e8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_face_data_employee_id_unique"`);
        await queryRunner.query(`DROP TABLE "face_data"`);
    }

}
