#!/usr/bin/env node

/**
 * Database Migration Runner
 *
 * This script automatically runs all pending database migrations in order.
 * It tracks which migrations have been applied using the schema_migrations table.
 *
 * Usage:
 *   node db-migrate.js [options]
 *
 * Options:
 *   --status    Show migration status without running anything
 *   --rollback  Rollback the last migration (if rollback file exists)
 *   --force     Force re-run a specific migration (dangerous!)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables from .env file (production)
// This will be overridden by database.js if .env.local exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log('📄 Loaded .env file');
}

// Use the existing database config
const pool = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Calculate SHA256 checksum of a file
function calculateChecksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Get all migration files sorted by version
function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && /^\d{3}_/.test(f))
    .sort((a, b) => {
      const versionA = parseInt(a.split('_')[0]);
      const versionB = parseInt(b.split('_')[0]);
      return versionA - versionB;
    });
  return files;
}

// Ensure schema_migrations table exists
async function ensureMigrationsTable(client) {
  const createTableSQL = fs.readFileSync(
    path.join(MIGRATIONS_DIR, '000_create_migrations_table.sql'),
    'utf8'
  );
  await client.query(createTableSQL);
}

// Get applied migrations from database
async function getAppliedMigrations(client) {
  const result = await client.query(
    'SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version'
  );
  return result.rows;
}

// Run a single migration
async function runMigration(client, filename) {
  const version = filename.split('_')[0];
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  const checksum = calculateChecksum(content);
  
  const startTime = Date.now();
  
  try {
    await client.query('BEGIN');
    await client.query(content);
    
    // Record the migration
    await client.query(
      `INSERT INTO schema_migrations (version, name, checksum, execution_time_ms)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (version) DO UPDATE SET
         applied_at = CURRENT_TIMESTAMP,
         execution_time_ms = $4,
         checksum = $3`,
      [version, filename, checksum, Date.now() - startTime]
    );
    
    await client.query('COMMIT');
    return { success: true, time: Date.now() - startTime };
  } catch (error) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message };
  }
}

// Show migration status
async function showStatus(client) {
  const applied = await getAppliedMigrations(client);
  const files = getMigrationFiles();
  const appliedVersions = new Set(applied.map(m => m.version));
  
  console.log('\n📊 Migration Status\n');
  console.log('─'.repeat(80));
  console.log(`${'Version'.padEnd(10)} ${'Name'.padEnd(45)} ${'Status'.padEnd(12)} Applied At`);
  console.log('─'.repeat(80));
  
  for (const file of files) {
    const version = file.split('_')[0];
    const name = file.substring(0, 45);
    const isApplied = appliedVersions.has(version);
    const status = isApplied ? '✅ Applied' : '⏳ Pending';
    const appliedAt = applied.find(m => m.version === version)?.applied_at || '';
    const dateStr = appliedAt ? new Date(appliedAt).toLocaleString() : '';
    console.log(`${version.padEnd(10)} ${name.padEnd(45)} ${status.padEnd(12)} ${dateStr}`);
  }
  
  console.log('─'.repeat(80));
  const pendingCount = files.length - appliedVersions.size;
  console.log(`\nTotal: ${files.length} migrations, ${appliedVersions.size} applied, ${pendingCount} pending\n`);
  
  return pendingCount;
}

// Main migration runner
async function runMigrations(options = {}) {
  const client = await pool.connect();
  
  try {
    console.log('\n🚀 Database Migration Runner\n');
    console.log(`📁 Migrations directory: ${MIGRATIONS_DIR}`);
    console.log(`🔌 Database: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'itiyum_platform'}\n`);
    
    // Ensure migrations table exists
    await ensureMigrationsTable(client);
    
    // If status only, show and exit
    if (options.status) {
      await showStatus(client);
      return;
    }
    
    // Get current state
    const applied = await getAppliedMigrations(client);
    const appliedVersions = new Set(applied.map(m => m.version));
    const files = getMigrationFiles();
    
    // Filter to pending migrations (skip 000 as it's the migrations table itself)
    const pending = files.filter(f => {
      const version = f.split('_')[0];
      return version !== '000' && !appliedVersions.has(version);
    });
    
    if (pending.length === 0) {
      console.log('✅ Database is up to date! No pending migrations.\n');
      await showStatus(client);
      return;
    }
    
    console.log(`📋 Found ${pending.length} pending migration(s):\n`);
    pending.forEach(f => console.log(`   - ${f}`));
    console.log('');

    // Run each pending migration
    let successCount = 0;
    let failCount = 0;

    for (const file of pending) {
      process.stdout.write(`⏳ Running ${file}... `);
      const result = await runMigration(client, file);

      if (result.success) {
        console.log(`✅ Done (${result.time}ms)`);
        successCount++;
      } else {
        console.log(`❌ Failed`);
        console.error(`   Error: ${result.error}`);
        failCount++;

        // Stop on first failure unless force mode
        if (!options.force) {
          console.log('\n⚠️  Stopping due to migration failure. Fix the issue and re-run.\n');
          break;
        }
      }
    }

    console.log('\n' + '─'.repeat(60));
    console.log(`📊 Results: ${successCount} succeeded, ${failCount} failed`);

    if (failCount === 0) {
      console.log('🎉 All migrations completed successfully!\n');
    }

    // Show final status
    await showStatus(client);

  } catch (error) {
    console.error('\n❌ Migration runner error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  status: args.includes('--status'),
  force: args.includes('--force'),
  help: args.includes('--help') || args.includes('-h')
};

if (options.help) {
  console.log(`
Database Migration Runner

Usage:
  node db-migrate.js [options]

Options:
  --status    Show migration status without running anything
  --force     Continue running migrations even if one fails
  --help, -h  Show this help message

Examples:
  node db-migrate.js              # Run all pending migrations
  node db-migrate.js --status     # Show migration status
  `);
  process.exit(0);
}

// Run migrations
console.log('Starting migration runner...');
runMigrations(options)
  .then(() => {
    console.log('Migration runner completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

