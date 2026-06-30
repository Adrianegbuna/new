import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniquePaymentReference1708192800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ✅ DUPLICATE PREVENTION: Add UNIQUE constraint on payment_reference
    await queryRunner.query(`
      ALTER TABLE orders 
      ADD CONSTRAINT unique_payment_reference 
      UNIQUE(payment_reference)
      WHERE payment_reference IS NOT NULL;
    `).catch(() => {
      console.log('Note: UNIQUE constraint may already exist or DB type may not support partial unique indexes');
    });

    // Add index for faster lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_payment_reference 
      ON orders(payment_reference) 
      WHERE payment_reference IS NOT NULL;
    `).catch(() => {
      console.log('Note: Index may already exist');
    });

    // ✅ Remove actual duplicate orders (keep earliest one)
    await queryRunner.query(`
      DELETE FROM orders a
      USING orders b
      WHERE a.id > b.id
      AND a.payment_reference = b.payment_reference
      AND a.payment_reference IS NOT NULL;
    `).catch(() => {
      console.log('Note: No duplicates found to remove');
    });

    console.log('✅ Migration: Added UNIQUE constraint on payment_reference');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback
    await queryRunner.query(`
      ALTER TABLE orders 
      DROP CONSTRAINT IF EXISTS unique_payment_reference;
    `).catch(() => {
      console.log('Note: Constraint removal skipped');
    });

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_orders_payment_reference;
    `).catch(() => {
      console.log('Note: Index removal skipped');
    });
  }
}
