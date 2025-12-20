#!/bin/bash
# Database Initialization Script for Itiyum Platform
# This script sets up the database schema, RBAC, and seed data

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-itiyum_platform}"
DB_USER="${DB_USER:-itiyum_user}"
DB_PASSWORD="${DB_PASSWORD:-itiyum_password}"

echo "=========================================="
echo "Itiyum Platform Database Initialization"
echo "=========================================="

# Check if we're running inside Docker or directly
if command -v docker &> /dev/null && docker ps -q -f name=itiyum-postgres &> /dev/null; then
    echo "Using Docker container..."
    PSQL_CMD="docker exec -e PGPASSWORD=$DB_PASSWORD itiyum-postgres psql -U $DB_USER -d $DB_NAME"
else
    echo "Using local psql..."
    export PGPASSWORD="$DB_PASSWORD"
    PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "Step 1: Running main schema..."
$PSQL_CMD -f "$SCRIPT_DIR/schema-with-rbac-multitenancy.sql"
echo "✅ Schema created successfully"

echo ""
echo "Step 2: Running RBAC and seed data..."
$PSQL_CMD -f "$SCRIPT_DIR/seed-rbac.sql"
echo "✅ RBAC and seed data created successfully"

echo ""
echo "=========================================="
echo "Database initialization complete!"
echo ""
echo "Summary:"
echo "  - Database: $DB_NAME"
echo "  - Tables created: $(docker exec itiyum-postgres psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo 'N/A')"
echo "  - Ad placements: $(docker exec itiyum-postgres psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM ad_placements;" 2>/dev/null || echo 'N/A')"
echo "  - Ad tiers: $(docker exec itiyum-postgres psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM ad_space_tiers;" 2>/dev/null || echo 'N/A')"
echo ""
echo "Default admin credentials:"
echo "  - Email: admin@itiyum.com"
echo "  - Password: (set via reset-admin-password.js script)"
echo ""
echo "To reset admin password, run:"
echo "  node backend/scripts/reset-admin-password.js"
echo "=========================================="

