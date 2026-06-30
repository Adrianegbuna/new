import 'reflect-metadata';
import { AppDataSource } from './config/database';

/**
 * Migration Runner Script
 * Runs pending migrations on the configured database
 */
async function runMigrations() {
  try {
    console.log('🔄 Initializing database connection...');
    
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    console.log('✅ Database connected');
    console.log('');
    console.log('🚀 Running pending migrations...');
    
    const migrations = await AppDataSource.runMigrations();
    
    console.log('');
    console.log(`✅ ${migrations.length} migration(s) executed successfully!`);
    
    if (migrations.length > 0) {
      migrations.forEach((mig) => {
        console.log(`  ✓ ${mig.name}`);
      });
    } else {
      console.log('  ℹ️ No pending migrations');
    }
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error running migrations:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigrations();
