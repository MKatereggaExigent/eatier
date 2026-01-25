#!/usr/bin/env node

/**
 * ===================================
 * ITIYUM DATABASE SETUP SCRIPT
 * ===================================
 * This script handles complete database setup including:
 * - Database connection verification
 * - Schema creation
 * - Running all migrations in order
 * - Seeding initial data
 * - Verification of all tables
 *
 * Usage: node scripts/setup-database.js [options]
 * Options:
 *   --fresh     Drop all tables and start fresh
 *   --migrate   Run only pending migrations
 *   --verify    Only verify database status
 *   --help      Show this help message
 * ===================================
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (num, msg) => console.log(`\n${colors.yellow}⏳ Step ${num}: ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.blue}${colors.bold}${msg}${colors.reset}`),
  table: (name, count) => console.log(`   ${colors.green}✓${colors.reset} ${name} (${count} rows)`),
  tableMissing: (name) => console.log(`   ${colors.red}✗${colors.reset} ${name} ${colors.red}(missing)${colors.reset}`)
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  fresh: args.includes('--fresh'),
  migrate: args.includes('--migrate'),
  verify: args.includes('--verify'),
  help: args.includes('--help'),
  reset: args.find(a => a.startsWith('--reset='))?.split('=')[1]
};

if (options.help) {
  console.log(`
${colors.bold}ITIYUM DATABASE SETUP SCRIPT${colors.reset}

Usage: node scripts/setup-database.js [options]

Options:
  --fresh              Drop all tables and start fresh (DESTRUCTIVE!)
  --migrate            Run only pending migrations
  --verify             Only verify database status
  --reset=<migration>  Reset a specific migration to re-run it
  --help               Show this help message

Examples:
  node scripts/setup-database.js                            # Full setup
  node scripts/setup-database.js --migrate                  # Run pending migrations only
  node scripts/setup-database.js --verify                   # Check database status
  node scripts/setup-database.js --reset=003_create_indexes.sql  # Reset and re-run migration 003
`);
  process.exit(0);
}

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'itiyum_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'itiyum_platform',
  password: process.env.DB_PASSWORD || 'itiyum_secure_password_2024',
  port: parseInt(process.env.DB_PORT) || 5432
};

const pool = new Pool(dbConfig);
const SCRIPT_DIR = __dirname;
const MIGRATIONS_DIR = path.join(SCRIPT_DIR, 'migrations');

// Core tables to verify
const CORE_TABLES = [
  'tenants', 'users', 'roles', 'permissions', 'user_roles',
  'businesses', 'bookings', 'reviews', 'menus', 'menu_items',
  'specialist_profiles', 'community_posts', 'notifications',
  'subscription_plans', 'user_subscriptions', 'payment_transactions'
];

async function tableExists(client, tableName) {
  const result = await client.query(
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
    [tableName]
  );
  return result.rows[0].exists;
}

async function countRows(client, tableName) {
  try {
    const result = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
    return parseInt(result.rows[0].count);
  } catch {
    return 0;
  }
}

async function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
  return files;
}

async function isMigrationRun(client, migrationName) {
  try {
    const result = await client.query(
      'SELECT COUNT(*) FROM schema_migrations WHERE migration_name = $1',
      [migrationName]
    );
    return parseInt(result.rows[0].count) > 0;
  } catch {
    return false;
  }
}

async function recordMigration(client, migrationName) {
  await client.query(
    'INSERT INTO schema_migrations (migration_name) VALUES ($1) ON CONFLICT DO NOTHING',
    [migrationName]
  );
}

async function runMigration(client, migrationFile) {
  const filePath = path.join(MIGRATIONS_DIR, migrationFile);
  const sql = fs.readFileSync(filePath, 'utf8');
  await client.query(sql);
}

async function ensureAdmin(client) {
  const tenantResult = await client.query("SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1");
  if (tenantResult.rows.length === 0) {
    log.warning('Itiyum tenant not found');
    return;
  }

  const tenantId = tenantResult.rows[0].id;
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const adminResult = await client.query(
    'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
    ['admin@itiyum.com', tenantId]
  );

  if (adminResult.rows.length === 0) {
    const insertResult = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, account_status, email_verified, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      ['admin@itiyum.com', passwordHash, 'Platform', 'Admin', 'active', true, tenantId]
    );

    const roleResult = await client.query("SELECT id FROM roles WHERE name = 'Itiyum Admin' LIMIT 1");
    if (roleResult.rows.length > 0) {
      await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [insertResult.rows[0].id, roleResult.rows[0].id]
      );
    }
    log.success('Admin user created');
  } else {
    await client.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 AND tenant_id = $3',
      [passwordHash, 'admin@itiyum.com', tenantId]
    );
    log.success('Admin password updated');
  }
}

async function verifyDatabase(client) {
  log.header('📋 Database Verification');

  let allOk = true;
  for (const table of CORE_TABLES) {
    if (await tableExists(client, table)) {
      const count = await countRows(client, table);
      log.table(table, count);
    } else {
      log.tableMissing(table);
      allOk = false;
    }
  }

  // Check subscription plans
  console.log(`\n${colors.cyan}💳 Subscription Plans:${colors.reset}`);
  if (await tableExists(client, 'subscription_plans')) {
    const plans = await client.query(
      'SELECT plan_code, name, user_type, monthly_price FROM subscription_plans ORDER BY display_order LIMIT 5'
    );
    if (plans.rows.length > 0) {
      plans.rows.forEach(p => {
        console.log(`   ${colors.green}✓${colors.reset} ${p.name} - R${p.monthly_price}/month`);
      });
    } else {
      log.warning('No subscription plans found. Run: node scripts/run-single-migration.js 015_seed_subscription_plans.sql');
    }
  }

  return allOk;
}

async function main() {
  console.log(`
${colors.blue}╔══════════════════════════════════════════════════════════════╗${colors.reset}
${colors.blue}║${colors.reset}           ${colors.bold}🍽️  ITIYUM DATABASE SETUP SCRIPT${colors.reset}                   ${colors.blue}║${colors.reset}
${colors.blue}╚══════════════════════════════════════════════════════════════╝${colors.reset}
`);

  console.log(`${colors.cyan}📊 Database Configuration:${colors.reset}`);
  console.log(`   Host:     ${colors.bold}${dbConfig.host}:${dbConfig.port}${colors.reset}`);
  console.log(`   Database: ${colors.bold}${dbConfig.database}${colors.reset}`);
  console.log(`   User:     ${colors.bold}${dbConfig.user}${colors.reset}`);

  const client = await pool.connect();

  try {
    // Step 1: Test connection
    log.step(1, 'Testing database connection...');
    const versionResult = await client.query('SELECT version()');
    log.success(`Connected to PostgreSQL`);
    console.log(`   ${colors.cyan}${versionResult.rows[0].version.split(',')[0]}${colors.reset}`);

    // Verify only mode
    if (options.verify) {
      await verifyDatabase(client);
      return;
    }

    // Reset specific migration (if requested)
    if (options.reset) {
      log.step(2, `Resetting migration: ${options.reset}`);
      await client.query(
        'DELETE FROM schema_migrations WHERE migration_name = $1',
        [options.reset]
      );
      log.success(`Migration ${options.reset} has been reset and will be re-run`);
    }

    // Step 2: Fresh install (if requested)
    if (options.fresh) {
      log.step(2, 'Running fresh install...');
      console.log(`${colors.red}⚠️  WARNING: This will DELETE ALL DATA!${colors.reset}`);

      const schemaPath = path.join(SCRIPT_DIR, 'schema-with-rbac-multitenancy.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schemaSql);
        log.success('Schema created');
      }

      const rbacPath = path.join(SCRIPT_DIR, 'seed-rbac.sql');
      if (fs.existsSync(rbacPath)) {
        const rbacSql = fs.readFileSync(rbacPath, 'utf8');
        await client.query(rbacSql);
        log.success('RBAC seeded');
      }
    }

    // Step 3: Create migrations tracking table
    log.step(3, 'Setting up migrations tracking...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    log.success('Migrations tracking table ready');

    // Step 4: Run migrations
    log.step(4, 'Running migrations...');
    const migrationFiles = await getMigrationFiles();
    let migrationsRun = 0;
    let migrationsSkipped = 0;

    for (const migrationFile of migrationFiles) {
      const alreadyRun = await isMigrationRun(client, migrationFile);

      if (!alreadyRun) {
        console.log(`   ${colors.cyan}▶${colors.reset} Running: ${colors.bold}${migrationFile}${colors.reset}`);
        try {
          await client.query('BEGIN');
          await runMigration(client, migrationFile);
          await recordMigration(client, migrationFile);
          await client.query('COMMIT');
          console.log(`   ${colors.green}✓${colors.reset} Completed: ${migrationFile}`);
          migrationsRun++;
        } catch (err) {
          await client.query('ROLLBACK');
          console.log(`   ${colors.red}✗${colors.reset} Failed: ${migrationFile} - ${err.message}`);
        }
      } else {
        console.log(`   ${colors.yellow}⊘${colors.reset} Skipped (already run): ${migrationFile}`);
        migrationsSkipped++;
      }
    }

    log.success(`Migrations complete: ${migrationsRun} run, ${migrationsSkipped} skipped`);

    // Step 5: Ensure admin user
    log.step(5, 'Ensuring admin user exists...');
    await ensureAdmin(client);
    console.log(`   ${colors.cyan}Admin credentials:${colors.reset} admin@itiyum.com / Admin@123`);

    // Step 6: Refresh materialized views
    log.step(6, 'Refreshing materialized views...');
    try {
      await client.query('REFRESH MATERIALIZED VIEW IF EXISTS admin_statistics');
      log.success('Materialized views refreshed');
    } catch {
      log.warning('Could not refresh materialized views (may not exist yet)');
    }

    // Step 7: Final verification
    log.step(7, 'Final verification...');
    const allOk = await verifyDatabase(client);

    // Summary
    console.log(`
${colors.blue}╔══════════════════════════════════════════════════════════════╗${colors.reset}
${colors.blue}║${colors.reset}                    ${colors.bold}📊 SETUP COMPLETE${colors.reset}                         ${colors.blue}║${colors.reset}
${colors.blue}╚══════════════════════════════════════════════════════════════╝${colors.reset}
`);

    if (allOk) {
      console.log(`${colors.green}✅ All core tables are present and ready!${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️  Some tables are missing. Check the output above.${colors.reset}`);
    }

    console.log(`
${colors.cyan}📌 Quick Reference:${colors.reset}
   Admin Login:    admin@itiyum.com / Admin@123
   Database:       ${dbConfig.database} @ ${dbConfig.host}:${dbConfig.port}
   Migrations Run: ${migrationsRun}

${colors.cyan}📌 Useful Commands:${colors.reset}
   Run single migration:  node scripts/run-single-migration.js <filename>
   Verify database:       node scripts/setup-database.js --verify
   Fresh install:         node scripts/setup-database.js --fresh

${colors.green}🚀 Database is ready! You can now start the server.${colors.reset}
`);

  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

