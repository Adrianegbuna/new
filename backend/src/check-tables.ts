import 'reflect-metadata';
import { AppDataSource } from './config/database';

/**
 * Diagnostic Script
 * Checks what tables exist in the database
 */
async function checkTables() {
  try {
    console.log('🔄 Initializing database connection...');
    
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      console.log('✅ Database connected');
      console.log('');
      
      // Get all tables
      const tables = await queryRunner.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
      );
      
      console.log('📊 Tables in database:');
      tables.forEach((t: any) => {
        console.log(`  - ${t.tablename}`);
      });
      
      // Check if product table exists and list its columns
      const productTables = tables.filter((t: any) => t.tablename.toLowerCase().includes('product'));
      
      if (productTables.length > 0) {
        console.log('');
        console.log(`Found product table(s): ${productTables.map((t: any) => t.tablename).join(', ')}`);
        
        const tableName = productTables[0].tablename;
        console.log('');
        console.log(`📋 Columns in "${tableName}":`);
        
        const columns = await queryRunner.query(
          `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
          [tableName]
        );
        
        columns.forEach((c: any) => {
          console.log(`  - ${c.column_name} (${c.data_type})`);
        });
      }
      
    } finally {
      await queryRunner.release();
    }
    
    await AppDataSource.destroy();
    process.exit(0);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTables();
