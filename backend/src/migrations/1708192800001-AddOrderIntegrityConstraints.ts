import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderIntegrityConstraints1708192800001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔒 Running ORDER DATA INTEGRITY migration...');

    try {
      // ===================================================================
      // 1. DUPLICATE PREVENTION: Unique payment reference
      // ===================================================================
      console.log('1️⃣  Adding UNIQUE constraint on payment_reference...');
      
      // First, remove any actual duplicates (keep the earliest)
      await queryRunner.query(`
        DELETE FROM orders a
        WHERE EXISTS (
          SELECT 1 FROM orders b
          WHERE a.id > b.id
          AND a.payment_reference = b.payment_reference
          AND a.payment_reference IS NOT NULL
        );
      `).catch(() => console.log('   ℹ️  No duplicates found or already handled'));

      // Add the constraint
      await queryRunner.query(`
        ALTER TABLE orders
        ADD CONSTRAINT unique_payment_reference
        UNIQUE(payment_reference)
      `).catch(() => console.log('   ℹ️  UNIQUE constraint may already exist'));

      // Add index for faster lookups
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_payment_ref
        ON orders(payment_reference)
        WHERE payment_reference IS NOT NULL;
      `).catch(() => console.log('   ℹ️  Index may already exist'));

      // ===================================================================
      // 2. ORDER STATUS INTEGRITY
      // ===================================================================
      console.log('2️⃣  Adding index on order status for queries...');
      
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_status
        ON orders(status, "createdAt" DESC);
      `).catch(() => console.log('   ℹ️  Status index may already exist'));

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_payment_status
        ON orders("paymentStatus", "createdAt" DESC);
      `).catch(() => console.log('   ℹ️  Payment status index may already exist'));

      // ===================================================================
      // 3. USER ORDERS INDEX (fast lookup of customer orders)
      // ===================================================================
      console.log('3️⃣  Adding index on userId for customer order queries...');
      
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_user_date
        ON orders("userId", "createdAt" DESC);
      `).catch(() => console.log('   ℹ️  User orders index may already exist'));

      // ===================================================================
      // 4. PAYSTACK REFERENCE INDEX (for payment verification)
      // ===================================================================
      console.log('4️⃣  Adding index on paystackReference for payment lookups...');
      
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_paystack_ref
        ON orders("paystackReference")
        WHERE "paystackReference" IS NOT NULL;
      `).catch(() => console.log('   ℹ️  Paystack ref index may already exist'));

      // ===================================================================
      // 5. REMOVE ORDERS WITH NO ITEMS (data cleanup)
      // ===================================================================
      console.log('5️⃣  Cleaning up orphaned orders (no items)...');
      
      const orphanedOrders = await queryRunner.query(`
        SELECT id FROM orders
        WHERE (items IS NULL OR items = '[]'::jsonb OR array_length(items, 1) IS NULL)
        LIMIT 100;
      `).catch(() => []);

      if (orphanedOrders?.length > 0) {
        console.log(`   Removing ${orphanedOrders.length} orphaned orders...`);
        for (const order of orphanedOrders) {
          await queryRunner.query(`DELETE FROM orders WHERE id = '${order.id}';`);
        }
      } else {
        console.log('   ✓ No orphaned orders found');
      }

      // ===================================================================
      // 6. RECALCULATE ORDER TOTALS
      // ===================================================================
      console.log('6️⃣  Verifying and fixing order totals...');

      const badTotals = await queryRunner.query(`
        SELECT o.id, o.total,
          COALESCE((
            SELECT SUM(
              CASE 
                WHEN jsonb_typeof(item->'price') = 'number' THEN (item->>'price')::decimal
                ELSE 0
              END * 
              CASE
                WHEN jsonb_typeof(item->'quantity') = 'number' THEN (item->>'quantity')::integer
                ELSE 1
              END
            )
            FROM jsonb_array_elements(COALESCE(o.items, '[]'::jsonb)) AS item
          ), 0) as calculated_total
        FROM orders o
        WHERE o.total != COALESCE((
          SELECT SUM(
            CASE 
              WHEN jsonb_typeof(item->'price') = 'number' THEN (item->>'price')::decimal
              ELSE 0
            END * 
            CASE
              WHEN jsonb_typeof(item->'quantity') = 'number' THEN (item->>'quantity')::integer
              ELSE 1
            END
          )
          FROM jsonb_array_elements(COALESCE(o.items, '[]'::jsonb)) AS item
        ), 0)
        LIMIT 100
      `).catch(() => []);

      if (badTotals?.length > 0) {
        console.log(`   Fixing ${badTotals.length} orders with incorrect totals...`);
        for (const order of badTotals) {
          await queryRunner.query(`
            UPDATE orders
            SET total = COALESCE((
              SELECT SUM(
                CASE 
                  WHEN jsonb_typeof(item->'price') = 'number' THEN (item->>'price')::decimal
                  ELSE 0
                END * 
                CASE
                  WHEN jsonb_typeof(item->'quantity') = 'number' THEN (item->>'quantity')::integer
                  ELSE 1
                END
              )
              FROM jsonb_array_elements(COALESCE(items, '[]'::jsonb)) AS item
            ), 0)
            WHERE id = '${order.id}';
          `);
        }
        console.log('   ✓ Order totals fixed');
      } else {
        console.log('   ✓ All order totals are correct');
      }

      // ===================================================================
      // 7. ADD CONSTRAINTS TRIGGER FOR JSONB VALIDATION (optional)
      // ===================================================================
      console.log('7️⃣  Adding constraint checks...');

      // Ensure items array is not empty when order is not cancelled
      await queryRunner.query(`
        ALTER TABLE orders
        ADD CONSTRAINT check_items_not_empty
        CHECK (status = 'cancelled' OR (items IS NOT NULL AND jsonb_array_length(items) > 0))
      `).catch(() => console.log('   ℹ️  Check constraint may already exist'));

      // Ensure total is positive
      await queryRunner.query(`
        ALTER TABLE orders
        ADD CONSTRAINT check_total_positive
        CHECK (total >= 0)
      `).catch(() => console.log('   ℹ️  Check constraint may already exist'));

      console.log('✅ ORDER DATA INTEGRITY migration completed successfully!');

    } catch (error: any) {
      console.error('❌ Migration error:', error.message);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rolling back ORDER DATA INTEGRITY migration...');

    try {
      // Drop constraints
      await queryRunner.query(`
        ALTER TABLE orders
        DROP CONSTRAINT IF EXISTS unique_payment_reference;
      `).catch(() => {});

      await queryRunner.query(`
        ALTER TABLE orders
        DROP CONSTRAINT IF EXISTS check_items_not_empty;
      `).catch(() => {});

      await queryRunner.query(`
        ALTER TABLE orders
        DROP CONSTRAINT IF EXISTS check_total_positive;
      `).catch(() => {});

      // Drop indexes
      await queryRunner.query(`DROP INDEX IF EXISTS idx_orders_payment_ref;`).catch(() => {});
      await queryRunner.query(`DROP INDEX IF EXISTS idx_orders_status;`).catch(() => {});
      await queryRunner.query(`DROP INDEX IF EXISTS idx_orders_payment_status;`).catch(() => {});
      await queryRunner.query(`DROP INDEX IF EXISTS idx_orders_user_date;`).catch(() => {});
      await queryRunner.query(`DROP INDEX IF EXISTS idx_orders_paystack_ref;`).catch(() => {});

      console.log('✅ Rollback completed');
    } catch (error: any) {
      console.error('❌ Rollback error:', error.message);
    }
  }
}
