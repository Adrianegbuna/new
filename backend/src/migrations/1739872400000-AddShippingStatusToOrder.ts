import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ⚠️ DEPRECATED - This migration has been superseded by 1740036000000-RebuildOrderStatusSystem.ts
 * 
 * IMPORTANT: This migration is now disabled because the order status system
 * has been completely rebuilt. The new migration (1740036000000) handles:
 * - Removing the old shippingStatus column
 * - Creating the new orderStatus column
 * - Creating proper indexes
 * 
 * This migration is kept as a no-op to avoid breaking existing migration history.
 */
export class AddShippingStatusToOrder1739872400000 implements MigrationInterface {
  name = 'AddShippingStatusToOrder1739872400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] ℹ️ Skipping old migration (replaced by 1740036000000-RebuildOrderStatusSystem)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] ℹ️ Skipping old migration rollback (replaced by 1740036000000-RebuildOrderStatusSystem)');
  }
}
