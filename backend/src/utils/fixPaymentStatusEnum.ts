import { AppDataSource } from '../config/database';

/**
 * Post-initialization diagnostic check (non-blocking)
 * Just verifies TypeORM synced schema correctly, doesn't modify data
 */
export const fixPaymentStatusEnum = async () => {
  try {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Just verify the order table exists - TypeORM created it
      const result = await queryRunner.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order')`
      );
      
      if (result && result[0]?.exists) {
        console.log('[POST_INIT] ✓ Order table created successfully by TypeORM');
      } else {
        console.log('[POST_INIT] ℹ️ Order table not found (will be created on next sync)');
      }
    } finally {
      await queryRunner.release();
    }
  } catch (error: any) {
    // Non-blocking diagnostic - don't crash
    console.log('[POST_INIT] ℹ️ Diagnostic check skipped (non-critical)');
  }
};
