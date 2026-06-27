import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGeofenceConfig1782240000000 implements MigrationInterface {
    name = 'CreateGeofenceConfig1782240000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "geofence_config" (
                "id" character varying(32) NOT NULL,
                "center_lat" double precision,
                "center_lon" double precision,
                "radius_meters" integer,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_geofence_config" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "geofence_config"`);
    }
}
