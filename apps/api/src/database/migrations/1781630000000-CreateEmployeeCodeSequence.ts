import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmployeeCodeSequence1781630000000 implements MigrationInterface {
  name = 'CreateEmployeeCodeSequence1781630000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "employee_code_seq"`,
    );
    await queryRunner.query(`
      SELECT setval(
        'employee_code_seq',
        COALESCE(
          (
            SELECT MAX(SUBSTRING("employee_code" FROM 4)::integer)
            FROM "users"
            WHERE "employee_code" ~ '^EMP[0-9]+$'
          ),
          0
        ) + 1,
        false
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "employee_code_seq"`);
  }
}
