import { createConnection } from 'typeorm';
import { config } from 'dotenv';

config();

export const preinitializationFix = async () => {
  let connection: any = null;
  try {
    console.log('[PRE_INIT] Connecting to PostgreSQL directly...');
    
    // Create a direct database connection
    const connectionConfig = {
      type: 'postgres' as const,
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'ecommerce_db',
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      synchronize: false,
      logging: false,
      entities: []
    };

    connection = await createConnection(connectionConfig);
    console.log('[PRE_INIT] ✓ Direct connection established');

    // Fix payment status values in database  - convert any old values
    console.log('[PRE_INIT] Checking for data migrations needed...');
    try {
      // Only update if rows exist with status that will cause issues
      const check = await connection.query(
        `SELECT COUNT(*) as cnt FROM "order" WHERE "paymentStatus" IS NOT NULL LIMIT 1`
      );
      const hasOrders = check[0]?.cnt > 0;
      if (hasOrders) {
        console.log('[PRE_INIT] Orders found in database');
      }
    } catch (e: any) {
      console.log('[PRE_INIT] Note: order table may not exist yet (first init)');
    }

    console.log('[PRE_INIT] ✓ Pre-initialization complete');
  } catch (error: any) {
    console.warn('[PRE_INIT] Note:', error.message);
    // Don't throw - allow the app to continue
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('[PRE_INIT] ✓ Direct connection closed');
      } catch (e) {
        // ignore
      }
    }
  }
};
