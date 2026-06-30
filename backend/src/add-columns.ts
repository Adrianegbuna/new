import 'reflect-metadata';
import { AppDataSource } from './config/database';

/**
 * Add Ranking Columns Script
 * Adds product ranking columns directly using correct syntax
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
      
      const columns = [
        { name: '"impressions"', type: 'INTEGER DEFAULT 0' },
        { name: '"clicks"', type: 'INTEGER DEFAULT 0' },
        { name: '"purchases"', type: 'INTEGER DEFAULT 0' },
        { name: '"rankingScore"', type: 'NUMERIC(5,2) DEFAULT 0' },
        { name: '"lastRankedAt"', type: 'TIMESTAMP' },
        { name: '"rotationBoost"', type: 'INTEGER DEFAULT 0' },
        { name: '"lowImpressionCounter"', type: 'INTEGER DEFAULT 0' },
      ];
      
      for (const col of columns) {
        try {
          console.log(`⏳ Checking column: ${col.name}...`);
          
          const result = await queryRunner.query(
            `SELECT column_name FROM information_schema.columns 
             WHERE table_name = 'products' AND column_name = ${col.name.replace(/"/g, "'")}`
          );
          
          if (result.length > 0) {
            console.log(`   ✓ Column ${col.name} already exists`);
          } else {
            console.log(`   + Adding column ${col.name}...`);
            const sql = `ALTER TABLE products ADD COLUMN ${col.name} ${col.type}`;
            console.log(`   SQL: ${sql}`);
            await queryRunner.query(sql);
            console.log(`   ✓ Column ${col.name} added successfully`);
          }
        } catch (error: any) {
          if (error.message.includes('already exists')) {
            console.log(`   ✓ Column ${col.name} already exists`);
          } else {
            console.log(`   ⚠️ ${col.name}: ${error.message}`);
          }
        }
      }
      
      console.log('');
      console.log('🔧 Creating indexes...');
      console.log('');
      
      const indexes = [
        { name: 'idx_product_rankingScore', column: 'rankingScore' },
        { name: 'idx_product_impressions', column: 'impressions' },
        { name: 'idx_product_lastRankedAt', column: 'lastRankedAt' },
      ];
      
      for (const idx of indexes) {
        try {
          console.log(`⏳ Creating index: ${idx.name}...`);
          
          await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS ${idx.name} ON products("${idx.column}")`
          );
          console.log(`   ✓ Index ${idx.name} created successfully`);
        } catch (error: any) {
          if (error.message.includes('already exists')) {
            console.log(`   ✓ Index ${idx.name} already exists`);
          } else {
            console.log(`   ⚠️ ${idx.name}: ${error.message}`);
          }
        }
      }
      
      console.log('');
      console.log('✅ Product ranking columns setup complete!');
      
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
