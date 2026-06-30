import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImageUrl1782640257024 implements MigrationInterface {
    name = 'AddImageUrl1782640257024'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_events" ADD "image_url" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_events" DROP COLUMN "image_url"`);
    }

}
