import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInterestedInPaySmallSmallToUsers1760000000000 implements MigrationInterface {
  name = 'AddInterestedInPaySmallSmallToUsers1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "interestedInPaySmallSmall" boolean NOT NULL DEFAULT false`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "interestedInPaySmallSmall"`
    );
  }
}

