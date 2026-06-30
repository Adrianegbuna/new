import 'reflect-metadata';
import { AppDataSource } from './config/database';

console.log('🔄 Synchronizing database...');

AppDataSource.initialize()
  .then(async () => {
    console.log('✅ Database connected');
    
    // Drop all tables and recreate them
    await AppDataSource.synchronize(true);
    
    console.log('✅ Database synchronized successfully!');
    console.log('📊 All tables have been created');
    
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error synchronizing database:', error);
    process.exit(1);
  });
