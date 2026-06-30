import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add product ranking and discovery system columns
 * These columns support the Temu-style feed ranking algorithm
 */
export class AddProductRankingColumns1740518400000 implements MigrationInterface {
  name = 'AddProductRankingColumns1740518400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] 🚀 Adding product ranking columns for Temu-style feed...');

    try {
      // Add impressions column
      console.log('[MIGRATION] 1️⃣ Adding impressions column...');
      await queryRunner.query(
        `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "impressions" INTEGER DEFAULT 0`
      );
      console.log('[MIGRATION] ✓ impressions column added');

      // Add clicks column
      console.log('[MIGRATION] 2️⃣ Adding clicks column...');
      await queryRunner.query(
        `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "clicks" INTEGER DEFAULT 0`
      );
      console.log('[MIGRATION] ✓ clicks column added');

      // Add purchases column
      console.log('[MIGRATION] 3️⃣ Adding purchases column...');
      await queryRunner.query(
        `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "purchases" INTEGER DEFAULT 0`
      );
      console.log('[MIGRATION] ✓ purchases column added');

      // Add rankingScore column
      console.log('[MIGRATION] 4️⃣ Adding rankingScore column...');
      await queryRunner.query(
        `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "rankingScore" NUMERIC(5,2) DEFAULT 0`
      );
      console.log('[MIGRATION] ✓ rankingScore column added');

      // Add lastRankedAt column
      console.log('[MIGRATION] 5️⃣ Adding lastRankedAt column...');
      await queryRunner.query(
        `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "lastRankedAt" TIMESTAMP`
      );
      console.log('[MIGRATION] ✓ lastRankedAt column added');

      // Add rotationBoost column
      console.log('[MIGRATION] 6️⃣ Adding rotationBoost column...');
      await queryRunner.query(
        `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "rotationBoost" INTEGER DEFAULT 0`
      );
      console.log('[MIGRATION] ✓ rotationBoost column added');

      // Add lowImpressionCounter column
      console.log('[MIGRATION] 7️⃣ Adding lowImpressionCounter column...');
      await queryRunner.query(
        `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "lowImpressionCounter" INTEGER DEFAULT 0`
      );
      console.log('[MIGRATION] ✓ lowImpressionCounter column added');

      // Create indexes for performance
      console.log('[MIGRATION] 8️⃣ Creating indexes...');
      
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_product_rankingScore" ON "product"("rankingScore" DESC)`
      );
      console.log('[MIGRATION] ✓ rankingScore index created');

      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_product_impressions" ON "product"("impressions")`
      );
      console.log('[MIGRATION] ✓ impressions index created');

      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_product_lastRankedAt" ON "product"("lastRankedAt")`
      );
      console.log('[MIGRATION] ✓ lastRankedAt index created');

      console.log('[MIGRATION] ✅ Product ranking columns added successfully!');
    } catch (error: any) {
      console.error('[MIGRATION] ❌ Error during migration:', error.message);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] 🔙 Rolling back product ranking columns...');

    try {
      // Drop indexes first
      console.log('[MIGRATION] 1️⃣ Dropping indexes...');
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_product_rankingScore"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_product_impressions"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_product_lastRankedAt"`);
      console.log('[MIGRATION] ✓ Indexes dropped');

      // Drop columns
      console.log('[MIGRATION] 2️⃣ Dropping columns...');
      await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "impressions"`);
      await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "clicks"`);
      await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "purchases"`);
      await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "rankingScore"`);
      await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "lastRankedAt"`);
      await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "rotationBoost"`);
      await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "lowImpressionCounter"`);
      console.log('[MIGRATION] ✓ Columns dropped');

      console.log('[MIGRATION] ✅ Rollback complete');
    } catch (error: any) {
      console.warn('[MIGRATION] ⚠️ Rollback error:', error.message);
    }
  }
}
