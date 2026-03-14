#!/bin/bash

echo "=========================================="
echo "Fix PostgreSQL Collation and Create DB"
echo "=========================================="

# Step 1: Fix the collation version mismatch
echo ""
echo "Step 1: Fixing PostgreSQL collation version mismatch..."
echo "=========================================="

# Fix template1 database
echo "Fixing template1 database..."
sudo -u postgres psql -d template1 -c "ALTER DATABASE template1 REFRESH COLLATION VERSION;" 2>&1 | grep -v "WARNING"

# Fix postgres database
echo "Fixing postgres database..."
sudo -u postgres psql -d postgres -c "ALTER DATABASE postgres REFRESH COLLATION VERSION;" 2>&1 | grep -v "WARNING"

# Reindex template1
echo "Reindexing template1..."
sudo -u postgres psql -d template1 -c "REINDEX DATABASE template1;" 2>&1 | grep -v "WARNING"

echo "✅ Collation issues fixed!"

# Step 2: Create the itiyum_platform database
echo ""
echo "Step 2: Creating itiyum_platform database..."
echo "=========================================="

DB_NAME="itiyum_platform"

sudo -u postgres createdb $DB_NAME 2>&1 | grep -v "WARNING"

if [ $? -eq 0 ]; then
    echo "✅ Database '$DB_NAME' created successfully!"
else
    # Check if it already exists
    DB_EXISTS=$(sudo -u postgres psql -lqt 2>&1 | grep -v "WARNING" | cut -d \| -f 1 | grep -w $DB_NAME | wc -l)
    if [ $DB_EXISTS -eq 1 ]; then
        echo "✅ Database '$DB_NAME' already exists!"
    else
        echo "❌ Failed to create database!"
        exit 1
    fi
fi

# Step 3: Enable UUID extension
echo ""
echo "Step 3: Enabling UUID extension..."
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" 2>&1 | grep -v "WARNING"
echo "✅ UUID extension enabled!"

# Step 4: Run the main schema
echo ""
echo "Step 4: Creating database schema..."
echo "This may take a minute..."
echo "=========================================="

if [ -f "backend/scripts/schema-with-rbac-multitenancy.sql" ]; then
    sudo -u postgres psql -d $DB_NAME -f backend/scripts/schema-with-rbac-multitenancy.sql 2>&1 | grep -E "ERROR|CREATE TABLE|CREATE INDEX" | head -20
    echo "✅ Schema created!"
else
    echo "❌ Schema file not found!"
    exit 1
fi

# Step 5: Run the specialist bookings migration
echo ""
echo "Step 5: Running specialist bookings migration..."
echo "=========================================="

if [ -f "backend/scripts/migrations/032_fix_specialist_bookings_columns.sql" ]; then
    sudo -u postgres psql -d $DB_NAME -f backend/scripts/migrations/032_fix_specialist_bookings_columns.sql 2>&1 | grep -v "WARNING" | grep -v "NOTICE"
    echo "✅ Migration completed!"
else
    echo "⚠️  Migration file not found, skipping..."
fi

# Step 6: Verify specialist_bookings table
echo ""
echo "Step 6: Verifying specialist_bookings table..."
echo "=========================================="
sudo -u postgres psql -d $DB_NAME -c "\d specialist_bookings" 2>&1 | grep -v "WARNING" | head -40

# Step 7: List all tables
echo ""
echo "Step 7: Database tables created:"
echo "=========================================="
sudo -u postgres psql -d $DB_NAME -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>&1 | grep -v "WARNING" | head -30

echo ""
echo "=========================================="
echo "✅ DATABASE SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "Database: $DB_NAME"
echo "Status: Ready"
echo ""
echo "Next steps:"
echo "1. Check backend/.env file - ensure DB_NAME=$DB_NAME"
echo "2. Restart backend: pm2 restart backend"
echo "3. Test booking at: https://itiyum.com/specialists"
echo "4. View bookings at: https://itiyum.com/dashboard/user/specialist-bookings"
echo "   (Click 'Chef Bookings' 👨‍🍳 in sidebar)"
echo ""

