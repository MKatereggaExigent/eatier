const { Pool } = require('pg');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

// Load environment variables:
// - Production (Vercel): Uses Vercel's environment variables directly (no dotenv needed)
// - Development (Local): Load from .env.local file
if (!isProduction) {
  try {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
    console.log('💻 Loaded .env.local for development');
  } catch (err) {
    console.log('⚠️ Could not load .env.local:', err.message);
  }
}

// Log environment for debugging (mask sensitive data)
console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
console.log('🔧 DATABASE_URL exists:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  // Log just the host part for debugging
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log('🔧 DATABASE_URL host:', url.host);
  } catch (e) {
    console.log('🔧 DATABASE_URL parse error:', e.message);
  }
}

// Configuration:
// - Production (Vercel): Use DATABASE_URL environment variable (Neon)
// - Development (Local): Use local PostgreSQL
let connectionConfig;
let pool;

try {
  if (process.env.DATABASE_URL) {
    // Clean the DATABASE_URL - remove any trailing newlines or whitespace
    const cleanDbUrl = process.env.DATABASE_URL.trim();
    console.log(isProduction ? '🌐 Using Neon production database' : '💻 Using local DATABASE_URL');
    connectionConfig = {
      connectionString: cleanDbUrl,
      ssl: isProduction ? { rejectUnauthorized: false } : false
    };
  } else {
    // Fallback: Use individual DB_* environment variables (local development only)
    console.log('💻 Using local development database (individual vars)');
    connectionConfig = {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'itiyum_db',
      password: process.env.DB_PASSWORD || 'password',
      port: parseInt(process.env.DB_PORT) || 5432,
      ssl: false
    };
  }

  pool = new Pool(connectionConfig);

  pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('❌ Database connection error:', err.message);
    // In serverless, don't exit the process
    if (!isProduction) {
      process.exit(-1);
    }
  });
} catch (err) {
  console.error('❌ Failed to create database pool:', err.message);
  // Create a dummy pool that will throw on use
  pool = {
    query: async () => { throw new Error('Database not configured'); },
    connect: async () => { throw new Error('Database not configured'); },
    end: async () => {}
  };
}

module.exports = pool;
