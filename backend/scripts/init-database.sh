#!/bin/bash
# Database Initialization Script for Itiyum Platform
# This script sets up the database schema, RBAC, migrations, and seed data
#
# Usage: ./init-database.sh [--fresh]
#   --fresh: Drop and recreate all tables (WARNING: destroys all data)

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-itiyum_platform}"
DB_USER="${DB_USER:-itiyum_user}"
DB_PASSWORD="${DB_PASSWORD:-itiyum_password}"
FRESH_INSTALL=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --fresh)
            FRESH_INSTALL=true
            shift
            ;;
    esac
done

echo "=========================================="
echo "Itiyum Platform Database Initialization"
echo "=========================================="
echo ""

# Check if we're running inside Docker or directly
if command -v docker &> /dev/null && docker ps -q -f name=itiyum-postgres &> /dev/null; then
    echo "✓ Using Docker container: itiyum-postgres"
    PSQL_CMD="docker exec -e PGPASSWORD=$DB_PASSWORD itiyum-postgres psql -U $DB_USER -d $DB_NAME"
else
    echo "✓ Using local psql"
    export PGPASSWORD="$DB_PASSWORD"
    PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$FRESH_INSTALL" = true ]; then
    echo ""
    echo "⚠️  WARNING: Fresh install will DROP all existing tables!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Aborted."
        exit 1
    fi

    echo ""
    echo "Step 1: Running main schema (fresh install)..."
    $PSQL_CMD -f "$SCRIPT_DIR/schema-with-rbac-multitenancy.sql"
    echo "✅ Schema created successfully"
else
    echo ""
    echo "Step 1: Running migrations (preserving existing data)..."
fi

echo ""
echo "Step 2: Running migrations to ensure all columns exist..."
if [ -d "$SCRIPT_DIR/migrations" ]; then
    for migration in "$SCRIPT_DIR/migrations"/*.sql; do
        if [ -f "$migration" ]; then
            echo "  → Running $(basename "$migration")..."
            $PSQL_CMD -f "$migration" 2>/dev/null || true
        fi
    done
    echo "✅ Migrations completed"
else
    echo "⚠️  No migrations directory found, skipping..."
fi

echo ""
echo "Step 3: Running RBAC and seed data..."
$PSQL_CMD -f "$SCRIPT_DIR/seed-rbac.sql" 2>/dev/null || echo "  (Some seed data may already exist, continuing...)"
echo "✅ RBAC and seed data completed"

echo ""
echo "=========================================="
echo "Database initialization complete!"
echo ""
echo "Summary:"
echo "  - Database: $DB_NAME"
echo "  - Tables: $($PSQL_CMD -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo 'N/A')"
echo "  - Ad placements: $($PSQL_CMD -t -c "SELECT COUNT(*) FROM ad_placements;" 2>/dev/null | tr -d ' ' || echo 'N/A')"
echo "  - Ad tiers: $($PSQL_CMD -t -c "SELECT COUNT(*) FROM ad_space_tiers;" 2>/dev/null | tr -d ' ' || echo 'N/A')"
echo ""
echo "Default admin credentials:"
echo "  - Email: admin@itiyum.com"
echo "  - Password: (set via reset-admin-password.js script)"
echo ""
echo "To reset admin password, run:"
echo "  node backend/scripts/reset-admin-password.js"
echo "=========================================="

