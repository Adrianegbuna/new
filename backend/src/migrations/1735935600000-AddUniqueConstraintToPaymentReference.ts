import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintToPaymentReference1735935600000
  implements MigrationInterface {
  name = 'AddUniqueConstraintToPaymentReference1735935600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, clean up duplicate payment references by keeping only the earliest order for each reference
    console.log('[MIGRATION] 🧹 Cleaning up duplicate payment references...');

    // Delete duplicate orders (keep only the first one for each reference)
    await queryRunner.query(`
      DELETE FROM "order_items" 
      WHERE "orderId" IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY "paymentReference" ORDER BY "createdAt" ASC) as rn
          FROM "order"
          WHERE "paymentReference" IS NOT NULL
        ) t
        WHERE rn > 1
      )
    `);

    await queryRunner.query(`
      DELETE FROM "order"
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY "paymentReference" ORDER BY "createdAt" ASC) as rn
          FROM "order"
          WHERE "paymentReference" IS NOT NULL
        ) t
        WHERE rn > 1
      )
    `);

    console.log('[MIGRATION] ✓ Duplicate cleanup complete');

    // Now add unique constraints
    console.log('[MIGRATION] Adding UNIQUE constraints...');

    // Add unique constraint for paymentReference
    try {
      await queryRunner.query(
        `ALTER TABLE "order" ADD CONSTRAINT "UQ_payment_reference" UNIQUE ("paymentReference")`
      );
      console.log('[MIGRATION] ✓ UNIQUE constraint added for paymentReference');
    } catch (error: any) {
      console.warn('[MIGRATION] ⚠️ Constraint may already exist:', error.message);
    }

    // Add unique constraint for paystackReference
    try {
      await queryRunner.query(
        `ALTER TABLE "order" ADD CONSTRAINT "UQ_paystack_reference" UNIQUE ("paystackReference")`
      );
      console.log('[MIGRATION] ✓ UNIQUE constraint added for paystackReference');
    } catch (error: any) {
      console.warn('[MIGRATION] ⚠️ Constraint may already exist:', error.message);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] Rolling back unique constraints...');

    try {
      await queryRunner.query(
        `ALTER TABLE "order" DROP CONSTRAINT "UQ_payment_reference"`
      );
    } catch (error: any) {
      console.warn('[MIGRATION] ⚠️ Constraint may not exist:', error.message);
    }

    try {
      await queryRunner.query(
        `ALTER TABLE "order" DROP CONSTRAINT "UQ_paystack_reference"`
      );
    } catch (error: any) {
      console.warn('[MIGRATION] ⚠️ Constraint may not exist:', error.message);
    }

    console.log('[MIGRATION] ✓ Rollback complete');
  }
}
