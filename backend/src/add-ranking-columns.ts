import 'reflect-metadata';
import { AppDataSource } from './config/database';

/**
 * Direct SQL Migration Script
 * Adds product ranking columns directly via raw SQL
 */
async function addRankingColumns() {
  try {
    console.log('🔄 Initializing database connection...');
    
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      console.log('✅ Database connected');
      console.log('');
      console.log('🚀 Adding product ranking columns...');
      console.log('');
      
      // List of columns to add with their definitions
      const columns = [
        { name: 'impressions', type: 'INTEGER DEFAULT 0' },
        { name: 'clicks', type: 'INTEGER DEFAULT 0' },
        { name: 'purchases', type: 'INTEGER DEFAULT 0' },
        { name: 'rankingScore', type: 'NUMERIC(5,2) DEFAULT 0' },
        { name: 'lastRankedAt', type: 'TIMESTAMP' },
        { name: 'rotationBoost', type: 'INTEGER DEFAULT 0' },
        { name: 'lowImpressionCounter', type: 'INTEGER DEFAULT 0' },
      ];
      
      let addedCount = 0;
      
      for (const col of columns) {
        try {
          console.log(`⏳ Checking column: ${col.name}...`);
          
          const result = await queryRunner.query(
            `SELECT column_name FROM information_schema.columns 
             WHERE table_name = 'product' AND column_name = '${col.name}'`
          );
          
          if (result.length > 0) {
            console.log(`   ✓ Column '${col.name}' already exists`);
          } else {
            console.log(`   + Adding column '${col.name}'...`);
            await queryRunner.query(
              `ALTER TABLE "product" ADD COLUMN "${col.name}" ${col.type}`
            );
            console.log(`   ✓ Column '${col.name}' added successfully`);
            addedCount++;
          }
        } catch (error: any) {
          console.log(`   ℹ️ ${col.name}: ${error.message || 'Already exists or skipped'}`);
        }
      }
      
      console.log('');
      console.log('🔧 Creating indexes...');
      console.log('');
      
      // Create indexes
      const indexes = [
        { name: 'idx_product_rankingScore', column: 'rankingScore' },
        { name: 'idx_product_impressions', column: 'impressions' },
        { name: 'idx_product_lastRankedAt', column: 'lastRankedAt' },
      ];
      
      for (const idx of indexes) {
        try {
          console.log(`⏳ Creating index: ${idx.name}...`);
          
          // Check if index exists
          const exists = await queryRunner.query(
            `SELECT 1 FROM pg_indexes 
             WHERE tablename = 'product' AND indexname = '${idx.name}'`
          );
          
          if (exists.length > 0) {
            console.log(`   ✓ Index '${idx.name}' already exists`);
          } else {
            console.log(`   + Creating index...`);
            await queryRunner.query(
              `CREATE INDEX "${idx.name}" ON "product"("${idx.column}")`
            );
            console.log(`   ✓ Index '${idx.name}' created successfully`);
          }
        } catch (error: any) {
          console.log(`   ℹ️ ${idx.name}: ${error.message || 'Already exists or skipped'}`);
        }
      }
      
      console.log('');
      console.log(`✅ Product ranking columns setup complete!`);
      console.log(`   Added/Verified ${addedCount + indexes.length} items`);
      
    } finally {
      await queryRunner.release();
    }
    
    await AppDataSource.destroy();
    process.exit(0);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addRankingColumns();
