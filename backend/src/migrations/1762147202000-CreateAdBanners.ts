import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdBanners1762147202000 implements MigrationInterface {
  name = 'CreateAdBanners1762147202000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] Creating ad_banners table...');

    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ad_banners" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "title" varchar(200) NOT NULL,
        "mediaUrl" text NOT NULL,
        "mediaType" varchar(20) NOT NULL,
        "linkUrl" varchar(500),
        "ctaText" varchar(100),
        "durationSeconds" integer,
        "displayOrder" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "startAt" timestamp,
        "endAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ad_banners_active_order"
      ON "ad_banners" ("isActive", "displayOrder")
    `);

    console.log('[MIGRATION] ad_banners table created');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] Dropping ad_banners table...');
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ad_banners_active_order"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ad_banners"`);
  }
}
