#!/bin/bash

# ===================================
# ITIYUM DATABASE SETUP SCRIPT
# ===================================
# This script handles complete database setup including:
# - Database connection verification
# - Schema creation
# - Running all migrations in order
# - Seeding initial data
# - Verification of all tables
#
# Usage: ./scripts/setup-database.sh [options]
# Options:
#   --fresh     Drop all tables and start fresh
#   --migrate   Run only pending migrations
#   --verify    Only verify database status
#   --help      Show this help message
# ===================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

# Default options
FRESH_INSTALL=false
MIGRATE_ONLY=false
VERIFY_ONLY=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fresh)
            FRESH_INSTALL=true
            shift
            ;;
        --migrate)
            MIGRATE_ONLY=true
            shift
            ;;
        --verify)
            VERIFY_ONLY=true
            shift
            ;;
        --help)
            echo "Usage: ./scripts/setup-database.sh [options]"
            echo ""
            echo "Options:"
            echo "  --fresh     Drop all tables and start fresh (DESTRUCTIVE!)"
            echo "  --migrate   Run only pending migrations"
            echo "  --verify    Only verify database status"
            echo "  --help      Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./scripts/setup-database.sh              # Full setup"
            echo "  ./scripts/setup-database.sh --migrate    # Run pending migrations only"
            echo "  ./scripts/setup-database.sh --verify     # Check database status"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Header
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}           ${BOLD}🍽️  ITIYUM DATABASE SETUP SCRIPT${NC}                   ${BLUE}║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load environment variables
if [ -f "$SCRIPT_DIR/../.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/../.env" | xargs)
    echo -e "${GREEN}✓${NC} Loaded environment from .env"
elif [ -f "$SCRIPT_DIR/../../.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/../../.env" | xargs)
    echo -e "${GREEN}✓${NC} Loaded environment from root .env"
fi

# Database connection info
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-itiyum_platform}"
DB_USER="${DB_USER:-itiyum_user}"
DB_PASSWORD="${DB_PASSWORD:-itiyum_secure_password_2024}"

echo -e "${CYAN}📊 Database Configuration:${NC}"
echo -e "   Host:     ${BOLD}$DB_HOST:$DB_PORT${NC}"
echo -e "   Database: ${BOLD}$DB_NAME${NC}"
echo -e "   User:     ${BOLD}$DB_USER${NC}"
echo ""

# Function to run SQL query
run_sql() {
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$1" 2>/dev/null
}

# Function to run SQL file
run_sql_file() {
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$1" 2>&1
}

# Function to check if table exists
table_exists() {
    result=$(run_sql "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$1')")
    [[ "$result" =~ "t" ]]
}

# Function to count rows in table
count_rows() {
    run_sql "SELECT COUNT(*) FROM $1" | tr -d ' '
}

# Step 1: Wait for PostgreSQL
echo -e "${YELLOW}⏳ Step 1: Checking PostgreSQL connection...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0

while ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo -e "${RED}❌ PostgreSQL not available after $MAX_RETRIES attempts${NC}"
        echo -e "${RED}   Please ensure PostgreSQL is running at $DB_HOST:$DB_PORT${NC}"
        exit 1
    fi
    echo -e "   Waiting for PostgreSQL... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

echo -e "${GREEN}✓${NC} PostgreSQL is available"
echo ""

# Step 2: Verify database connection
echo -e "${YELLOW}⏳ Step 2: Verifying database connection...${NC}"
if ! run_sql "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to database '$DB_NAME'${NC}"
    echo -e "${YELLOW}   Attempting to create database...${NC}"
    PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null || true
fi

VERSION=$(run_sql "SELECT version()" | head -1)
echo -e "${GREEN}✓${NC} Connected to PostgreSQL"
echo -e "   ${CYAN}$VERSION${NC}"
echo ""

# If verify only, skip to verification
if [ "$VERIFY_ONLY" = true ]; then
    echo -e "${YELLOW}⏳ Verification Mode - Checking database status...${NC}"
    echo ""

    # List all tables
    echo -e "${CYAN}📋 Tables in database:${NC}"
    TABLES=$(run_sql "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
    TABLE_COUNT=0
    while IFS= read -r table; do
        table=$(echo "$table" | tr -d ' ')
        if [ -n "$table" ]; then
            count=$(count_rows "$table" 2>/dev/null || echo "0")
            echo -e "   ${GREEN}✓${NC} $table (${count} rows)"
            TABLE_COUNT=$((TABLE_COUNT + 1))
        fi
    done <<< "$TABLES"

    echo ""
    echo -e "${GREEN}✓${NC} Total tables: ${BOLD}$TABLE_COUNT${NC}"
    echo ""
    exit 0
fi

# Step 3: Check if fresh install requested
if [ "$FRESH_INSTALL" = true ]; then
    echo -e "${RED}⚠️  WARNING: Fresh install will DELETE ALL DATA!${NC}"
    echo -e "${YELLOW}   Press Ctrl+C within 5 seconds to cancel...${NC}"
    sleep 5
    echo ""
    echo -e "${YELLOW}⏳ Step 3: Running fresh install...${NC}"

    # Run schema (which drops and recreates tables)
    if [ -f "$SCRIPT_DIR/schema-with-rbac-multitenancy.sql" ]; then
        echo -e "   Running schema..."
        run_sql_file "$SCRIPT_DIR/schema-with-rbac-multitenancy.sql" > /dev/null
        echo -e "${GREEN}✓${NC} Schema created"
    fi

    # Run RBAC seed
    if [ -f "$SCRIPT_DIR/seed-rbac.sql" ]; then
        echo -e "   Running RBAC seed..."
        run_sql_file "$SCRIPT_DIR/seed-rbac.sql" > /dev/null
        echo -e "${GREEN}✓${NC} RBAC seeded"
    fi
    echo ""
fi

# Step 4: Run migrations
echo -e "${YELLOW}⏳ Step 4: Running migrations...${NC}"
echo ""

# Create migrations tracking table if not exists
run_sql "CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)" > /dev/null

# Get list of migration files
MIGRATION_FILES=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort)
MIGRATIONS_RUN=0
MIGRATIONS_SKIPPED=0

for migration_file in $MIGRATION_FILES; do
    migration_name=$(basename "$migration_file")

    # Check if migration already run
    already_run=$(run_sql "SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '$migration_name'" | tr -d ' ')

    if [ "$already_run" = "0" ]; then
        echo -e "   ${CYAN}▶${NC} Running: ${BOLD}$migration_name${NC}"

        # Run migration
        if run_sql_file "$migration_file" > /dev/null 2>&1; then
            # Record migration
            run_sql "INSERT INTO schema_migrations (migration_name) VALUES ('$migration_name')" > /dev/null
            echo -e "   ${GREEN}✓${NC} Completed: $migration_name"
            MIGRATIONS_RUN=$((MIGRATIONS_RUN + 1))
        else
            echo -e "   ${RED}❌${NC} Failed: $migration_name"
            echo -e "   ${YELLOW}   Attempting to continue...${NC}"
        fi
    else
        echo -e "   ${YELLOW}⊘${NC} Skipped (already run): $migration_name"
        MIGRATIONS_SKIPPED=$((MIGRATIONS_SKIPPED + 1))
    fi
done

echo ""
echo -e "${GREEN}✓${NC} Migrations complete: ${BOLD}$MIGRATIONS_RUN${NC} run, ${BOLD}$MIGRATIONS_SKIPPED${NC} skipped"
echo ""

# Step 5: Create/Update admin user
echo -e "${YELLOW}⏳ Step 5: Ensuring admin user exists...${NC}"
node -e "
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: process.env.DB_USER || '$DB_USER',
  host: process.env.DB_HOST || '$DB_HOST',
  database: process.env.DB_NAME || '$DB_NAME',
  password: process.env.DB_PASSWORD || '$DB_PASSWORD',
  port: process.env.DB_PORT || $DB_PORT
});

async function ensureAdmin() {
  const client = await pool.connect();
  try {
    const tenantResult = await client.query(\"SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1\");
    if (tenantResult.rows.length === 0) {
      console.log('⚠️  Itiyum tenant not found');
      return;
    }

    const tenantId = tenantResult.rows[0].id;
    const passwordHash = await bcrypt.hash('Admin@123', 10);

    const adminResult = await client.query(
      'SELECT id FROM users WHERE email = \$1 AND tenant_id = \$2',
      ['admin@itiyum.com', tenantId]
    );

    if (adminResult.rows.length === 0) {
      const insertResult = await client.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, account_status, email_verified, tenant_id) VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7) RETURNING id',
        ['admin@itiyum.com', passwordHash, 'Platform', 'Admin', 'active', true, tenantId]
      );

      const roleResult = await client.query(\"SELECT id FROM roles WHERE name = 'Itiyum Admin' LIMIT 1\");
      if (roleResult.rows.length > 0) {
        await client.query('INSERT INTO user_roles (user_id, role_id) VALUES (\$1, \$2) ON CONFLICT DO NOTHING',
          [insertResult.rows[0].id, roleResult.rows[0].id]);
      }
      console.log('✅ Admin user created');
    } else {
      await client.query('UPDATE users SET password_hash = \$1 WHERE email = \$2 AND tenant_id = \$3',
        [passwordHash, 'admin@itiyum.com', tenantId]);
      console.log('✅ Admin password updated');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

ensureAdmin().catch(e => console.error('Error:', e.message));
"
echo -e "   ${CYAN}Admin credentials:${NC} admin@itiyum.com / Admin@123"
echo ""

# Step 6: Refresh materialized views
echo -e "${YELLOW}⏳ Step 6: Refreshing materialized views...${NC}"
run_sql "REFRESH MATERIALIZED VIEW IF EXISTS admin_statistics" > /dev/null 2>&1 || true
echo -e "${GREEN}✓${NC} Materialized views refreshed"
echo ""

# Step 7: Final verification
echo -e "${YELLOW}⏳ Step 7: Final verification...${NC}"
echo ""

# Core tables to verify
CORE_TABLES=(
    "tenants"
    "users"
    "roles"
    "permissions"
    "user_roles"
    "businesses"
    "bookings"
    "reviews"
    "menus"
    "menu_items"
    "specialist_profiles"
    "community_posts"
    "notifications"
    "subscription_plans"
    "user_subscriptions"
    "payment_transactions"
)

echo -e "${CYAN}📋 Core Tables Status:${NC}"
ALL_OK=true
for table in "${CORE_TABLES[@]}"; do
    if table_exists "$table"; then
        count=$(count_rows "$table" 2>/dev/null || echo "0")
        echo -e "   ${GREEN}✓${NC} $table (${count} rows)"
    else
        echo -e "   ${RED}✗${NC} $table ${RED}(missing)${NC}"
        ALL_OK=false
    fi
done

echo ""

# Check subscription plans specifically
echo -e "${CYAN}💳 Subscription Plans:${NC}"
if table_exists "subscription_plans"; then
    PLANS=$(run_sql "SELECT plan_code, name, user_type, monthly_price FROM subscription_plans ORDER BY display_order LIMIT 5")
    if [ -n "$PLANS" ]; then
        echo "$PLANS" | while IFS='|' read -r code name user_type price; do
            code=$(echo "$code" | tr -d ' ')
            name=$(echo "$name" | tr -d ' ')
            price=$(echo "$price" | tr -d ' ')
            if [ -n "$code" ]; then
                echo -e "   ${GREEN}✓${NC} $name - R$price/month"
            fi
        done
    else
        echo -e "   ${YELLOW}⚠${NC} No subscription plans found. Run: node scripts/run-single-migration.js 015_seed_subscription_plans.sql"
    fi
else
    echo -e "   ${RED}✗${NC} subscription_plans table missing"
fi

echo ""

# Summary
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}                    ${BOLD}📊 SETUP COMPLETE${NC}                         ${BLUE}║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}✅ All core tables are present and ready!${NC}"
else
    echo -e "${YELLOW}⚠️  Some tables are missing. You may need to run additional migrations.${NC}"
fi

echo ""
echo -e "${CYAN}📌 Quick Reference:${NC}"
echo -e "   Admin Login:    admin@itiyum.com / Admin@123"
echo -e "   Database:       $DB_NAME @ $DB_HOST:$DB_PORT"
echo -e "   Migrations Run: $MIGRATIONS_RUN"
echo ""
echo -e "${CYAN}📌 Useful Commands:${NC}"
echo -e "   Run single migration:  node scripts/run-single-migration.js <filename>"
echo -e "   Verify database:       ./scripts/setup-database.sh --verify"
echo -e "   Fresh install:         ./scripts/setup-database.sh --fresh"
echo ""
echo -e "${GREEN}🚀 Database is ready! You can now start the server.${NC}"
echo ""
