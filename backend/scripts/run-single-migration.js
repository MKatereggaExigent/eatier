/**
 * Run a single migration file
 * 
 * Usage: node scripts/run-single-migration.js <migration-file>
 * Example: node scripts/run-single-migration.js 008_activity_log.sql
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'itiyum_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'itiyum_platform',
  password: process.env.DB_PASSWORD || 'itiyum_secure_password_2024',
  port: process.env.DB_PORT || 5432,
});

async function runMigration(migrationFile) {
  const client = await pool.connect();
  
  try {
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }
    
    console.log(`🚀 Running migration: ${migrationFile}`);
    console.log(`📁 Path: ${migrationPath}`);
    console.log(`🔌 Database: ${process.env.DB_NAME || 'itiyum_platform'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}\n`);
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    
    // Verify table was created if this is activity_log
    if (migrationFile.includes('activity_log')) {
      const result = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'activity_log'
        ORDER BY ordinal_position
      `);
      
      if (result.rows.length > 0) {
        console.log('\n📋 activity_log table columns:');
        result.rows.forEach(row => {
          console.log(`   - ${row.column_name}: ${row.data_type}`);
        });
      }
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Get migration file from command line
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.log('Usage: node scripts/run-single-migration.js <migration-file>');
  console.log('Example: node scripts/run-single-migration.js 008_activity_log.sql');
  console.log('\nAvailable migrations:');
  
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  files.forEach(f => console.log(`  - ${f}`));
  
  process.exit(1);
}

runMigration(migrationFile)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFatal error:', error);
    process.exit(1);
  });

