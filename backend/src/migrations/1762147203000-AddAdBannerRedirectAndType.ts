import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdBannerRedirectAndType1762147203000 implements MigrationInterface {
  name = 'AddAdBannerRedirectAndType1762147203000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ad_banners" ADD COLUMN IF NOT EXISTS "redirectUrl" varchar(500)`);
    await queryRunner.query(`ALTER TABLE "ad_banners" ADD COLUMN IF NOT EXISTS "type" varchar(50)`);
    await queryRunner.query(`ALTER TABLE "ad_banners" ADD COLUMN IF NOT EXISTS "image" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ad_banners" DROP COLUMN IF EXISTS "image"`);
    await queryRunner.query(`ALTER TABLE "ad_banners" DROP COLUMN IF EXISTS "type"`);
    await queryRunner.query(`ALTER TABLE "ad_banners" DROP COLUMN IF EXISTS "redirectUrl"`);
  }
}
