const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const createTableSQL = `
CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid,
  "role" character varying(50) NOT NULL,
  "message" text NOT NULL,
  "sessionId" character varying(100),
  "conversationId" uuid,
  "channel" character varying(20) DEFAULT 'web',
  "sentiment" character varying(20),
  "category" character varying(50),
  "context" jsonb,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_chat_messages_userId" ON "chat_messages" ("userId");
CREATE INDEX IF NOT EXISTS "IDX_chat_messages_sessionId" ON "chat_messages" ("sessionId");
CREATE INDEX IF NOT EXISTS "IDX_chat_messages_conversationId" ON "chat_messages" ("conversationId");
CREATE INDEX IF NOT EXISTS "IDX_chat_messages_createdAt" ON "chat_messages" ("createdAt");

CREATE TABLE IF NOT EXISTS "chat_conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid,
  "sessionId" character varying(100),
  "status" character varying(20) NOT NULL DEFAULT 'ai',
  "channel" character varying(20) NOT NULL DEFAULT 'web',
  "phone" character varying(32),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IDX_chat_conversations_userId" ON "chat_conversations" ("userId");
CREATE INDEX IF NOT EXISTS "IDX_chat_conversations_sessionId" ON "chat_conversations" ("sessionId");

ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "conversationId" uuid;
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "channel" character varying(20) DEFAULT 'web';
ALTER TABLE "chat_conversations" ADD COLUMN IF NOT EXISTS "channel" character varying(20) NOT NULL DEFAULT 'web';
ALTER TABLE "chat_conversations" ADD COLUMN IF NOT EXISTS "phone" character varying(32);
`;

async function createTable() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Creating chat_messages table...');
    await client.query(createTableSQL);
    
    console.log('✅ chat_messages table created successfully!');
    await client.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    process.exit(1);
  }
}

createTable();
