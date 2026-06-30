import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config({ path: process.cwd() + '/.env' });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || '127.0.0.1',
  port: Number(process.env.DATABASE_PORT || 5432),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'ecommerce_db',
  synchronize: true,
  logging: true,
  entities: [
    process.cwd() + '/src/modules/**/*.entity.{ts,js}',
  ],
});

async function run() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected. Synchronizing schema...');
    // synchronize is already true, but call it explicitly for clarity
    await AppDataSource.synchronize();
    console.log('Schema synchronized successfully.');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (err) {
    console.error('Schema sync failed:', err);
    process.exit(1);
  }
}

run();  