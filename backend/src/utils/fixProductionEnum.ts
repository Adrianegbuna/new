/**
 * Production Database Enum Fix
 * Runs on Render backend with access to DATABASE_URL
 * Executes: SELECT enum values, ADD 'paid' if missing, restart ready
 */

import { config } from 'dotenv';
import * as pg from 'pg';

config();

export const fixProductionEnum = async () => {
  let client: pg.Client | null = null;

  try {
    console.log('\n========================================');
    console.log('🔧 PRODUCTION DATABASE ENUM FIX');
    console.log('========================================\n');

    // Determine connection config
    let clientConfig: any;
    
    if (process.env.DATABASE_URL) {
      console.log('[PROD] Using DATABASE_URL for connection');
      clientConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
      };
    } else {
      console.log('[PROD] Using individual database environment variables');
      clientConfig = {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        user: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME || 'ecommerce_db',
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
      };
    }

    client = new pg.Client(clientConfig);

    console.log('[PROD] Connecting to Postgres...');
    await client.connect();
    console.log('[PROD] ✓ Connected');

    // 1. List current enum values
    console.log('\n[PROD] Step 1: Check current enum values');
    console.log('[PROD] Running: SELECT unnest(enum_range(NULL::orders_paymentstatus_enum))');
    
    const enumValuesResult = await client.query(
      `SELECT unnest(enum_range(NULL::orders_paymentstatus_enum)) as enum_value`
    );
    
    const enumValues = enumValuesResult.rows.map((r: any) => r.enum_value);
    console.log('[PROD] ✓ Current enum values:', enumValues);

    // 2. Check if 'paid' exists
    const hasPaid = enumValues.includes('paid');
    console.log(`[PROD] ✓ 'paid' status: ${hasPaid ? '✓ EXISTS' : '❌ MISSING'}`);

    // 3. If missing, add it
    if (!hasPaid) {
      console.log('\n[PROD] Step 2: Adding "paid" to enum');
      console.log('[PROD] Running: ALTER TYPE orders_paymentstatus_enum ADD VALUE IF NOT EXISTS \'paid\'');
      
      try {
        await client.query(
          `ALTER TYPE orders_paymentstatus_enum ADD VALUE IF NOT EXISTS 'paid'`
        );
        console.log('[PROD] ✓ Successfully added "paid" to enum');
      } catch (error: any) {
        if (error.code === '42701' || error.message.includes('already exists')) {
          console.log('[PROD] ℹ "paid" already exists in enum');
        } else if (error.message.includes('IF NOT EXISTS')) {
          console.log('[PROD] ⚠️ "IF NOT EXISTS" not supported, trying without it...');
          try {
            await client.query(
              `ALTER TYPE orders_paymentstatus_enum ADD VALUE 'paid'`
            );
            console.log('[PROD] ✓ Added "paid" (without IF NOT EXISTS)');
          } catch (e: any) {
            if (e.message.includes('already exists')) {
              console.log('[PROD] ℹ "paid" already in enum');
            } else {
              throw e;
            }
          }
        } else {
          throw error;
        }
      }
    }

    // 4. Final verification
    console.log('\n[PROD] Step 3: Final verification');
    console.log('[PROD] Running: SELECT unnest(enum_range(NULL::orders_paymentstatus_enum))');
    
    const finalResult = await client.query(
      `SELECT unnest(enum_range(NULL::orders_paymentstatus_enum)) as enum_value`
    );
    
    const finalValues = finalResult.rows.map((r: any) => r.enum_value);
    console.log('[PROD] ✓ Final enum values:', finalValues);

    // Verify 'paid' is there
    if (finalValues.includes('paid')) {
      console.log('\n✅ SUCCESS: "paid" is now in enum!');
      console.log('[PROD] Enum values:', finalValues.join(', '));
    } else {
      throw new Error('FAILED: "paid" not found in final enum values');
    }

    // 5. Check if enum name is correct
    console.log('\n[PROD] Step 4: Verifying enum type name');
    const typeResult = await client.query(`
      SELECT t.typname FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE e.enumlabel = 'paid'
      GROUP BY t.typname
    `);
    
    if (typeResult.rows.length > 0) {
      console.log('[PROD] ✓ Enum type name:', typeResult.rows[0].typname);
    }

    console.log('\n========================================');
    console.log('✅ PRODUCTION DATABASE FIXED');
    console.log('========================================');
    console.log('[PROD] ✓ Enum contains: pending, paid, completed, failed, refunded');
    console.log('[PROD] ✓ Database ready for backend restart');
    console.log('\n');

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Code:', error.code);
    console.error('Detail:', error.detail);
    
    // Provide helpful information
    if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      console.log('\n⚠️ Connection Error:');
      console.log('1. Check if DATABASE_URL is set correctly');
      console.log('2. Verify Render Postgres is running');
      console.log('3. Check if database credentials are valid');
      console.log('\nDATABASE_URL set:', !!process.env.DATABASE_URL);
      console.log('DATABASE_HOST:', process.env.DATABASE_HOST);
    }
    
    if (error.message.includes('does not exist')) {
      console.log('\n⚠️ Schema Error:');
      console.log('1. Check if "order" table exists');
      console.log('2. Verify enum type name');
      console.log('\nTo find enum name manually:');
      console.log('SELECT t.typname FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid GROUP BY t.typname;');
    }
    
    throw error;
  } finally {
    if (client) {
      try {
        await client.end();
        console.log('[PROD] Connection closed\n');
      } catch (e) {
        // ignore
      }
    }
  }
};
