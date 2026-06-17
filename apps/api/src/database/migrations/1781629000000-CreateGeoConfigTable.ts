import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGeoConfigTable1781629000000 implements MigrationInterface {
  name = 'CreateGeoConfigTable1781629000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "geo_configs" ("id" character varying(32) NOT NULL DEFAULT 'company', "center_lat" double precision NOT NULL, "center_lon" double precision NOT NULL, "radius_meters" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_geo_configs" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "geo_configs"`);
  }
}
