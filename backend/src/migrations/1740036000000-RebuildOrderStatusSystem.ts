import { MigrationInterface, QueryRunner } from 'typeorm';

export class RebuildOrderStatusSystem1740036000000 implements MigrationInterface {
  name = 'RebuildOrderStatusSystem1740036000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] Starting order status system rebuild...');

    try {
      // Drop old status columns
      console.log('[MIGRATION] 1️⃣ Dropping old status columns...');
      
      await queryRunner.query(
        `ALTER TABLE "order" DROP COLUMN IF EXISTS "status" CASCADE`
      ).catch(() => console.log('[MIGRATION] ℹ️ status column not found (already removed)'));

      await queryRunner.query(
        `ALTER TABLE "order" DROP COLUMN IF EXISTS "shippingStatus" CASCADE`
      ).catch(() => console.log('[MIGRATION] ℹ️ shippingStatus column not found'));

      console.log('[MIGRATION] ✓ Old columns dropped');

      // Create new unified column
      console.log('[MIGRATION] 2️⃣ Creating new orderStatus column...');
      
      await queryRunner.query(
        `ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "orderStatus" VARCHAR(50) DEFAULT 'pending'`
      );
      
      console.log('[MIGRATION] ✓ orderStatus column created');

      // Create index for performance
      console.log('[MIGRATION] 3️⃣ Creating index on orderStatus...');
      
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_order_orderStatus" ON "order"("orderStatus")`
      );
      
      console.log('[MIGRATION] ✓ Index created');

      // Drop old status type if it exists
      try {
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."order_status_enum"`);
        console.log('[MIGRATION] ✓ Old enum type dropped');
      } catch (error: any) {
        console.log('[MIGRATION] ℹ️ Enum type not found or could not be dropped');
      }

      console.log('[MIGRATION] ✅ Order status system rebuild complete!');
    } catch (error: any) {
      console.error('[MIGRATION] ❌ Error during migration:', error.message);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] Rolling back order status system...');

    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_orderStatus"`);
      await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "orderStatus"`);
      console.log('[MIGRATION] ✓ Rollback complete');
    } catch (error: any) {
      console.warn('[MIGRATION] ⚠️ Rollback error:', error.message);
    }
  }
}
