#!/bin/bash

echo "=========================================="
echo "Creating Itiyum Platform Database"
echo "=========================================="

DB_NAME="itiyum_platform"

# Step 1: Create the database
echo ""
echo "Step 1: Creating database '$DB_NAME'..."
sudo -u postgres createdb $DB_NAME

if [ $? -eq 0 ]; then
    echo "✅ Database '$DB_NAME' created successfully!"
else
    echo "⚠️  Database might already exist or creation failed"
    echo "Checking if database exists..."
    DB_EXISTS=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w $DB_NAME | wc -l)
    if [ $DB_EXISTS -eq 1 ]; then
        echo "✅ Database '$DB_NAME' already exists, continuing..."
    else
        echo "❌ Failed to create database!"
        exit 1
    fi
fi

# Step 2: Enable UUID extension
echo ""
echo "Step 2: Enabling UUID extension..."
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# Step 3: Run the main schema file
echo ""
echo "Step 3: Setting up database schema..."
echo "This will create all tables, indexes, and constraints..."
if [ -f "backend/scripts/schema-with-rbac-multitenancy.sql" ]; then
    sudo -u postgres psql -d $DB_NAME -f backend/scripts/schema-with-rbac-multitenancy.sql
    if [ $? -eq 0 ]; then
        echo "✅ Schema created successfully!"
    else
        echo "⚠️  Schema creation had some warnings (this is usually OK)"
    fi
else
    echo "❌ Schema file not found: backend/scripts/schema-with-rbac-multitenancy.sql"
    exit 1
fi

# Step 4: Run all migrations in order
echo ""
echo "Step 4: Running database migrations..."
echo "=========================================="

MIGRATION_DIR="backend/scripts/migrations"
if [ -d "$MIGRATION_DIR" ]; then
    # Run migrations in order
    for migration in $(ls $MIGRATION_DIR/*.sql | sort); do
        echo "Running: $(basename $migration)"
        sudo -u postgres psql -d $DB_NAME -f "$migration" 2>&1 | grep -v "WARNING" | grep -v "NOTICE" | head -5
    done
    echo "✅ All migrations completed!"
else
    echo "⚠️  Migrations directory not found, skipping..."
fi

# Step 5: Verify the specialist_bookings table
echo ""
echo "Step 5: Verifying specialist_bookings table..."
echo "=========================================="
sudo -u postgres psql -d $DB_NAME -c "\d specialist_bookings" 2>&1 | head -50

# Step 6: Check table counts
echo ""
echo "Step 6: Checking database tables..."
echo "=========================================="
sudo -u postgres psql -d $DB_NAME -c "SELECT 
    schemaname,
    tablename
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;" | head -30

echo ""
echo "Step 7: Checking specialist_bookings data..."
echo "=========================================="
sudo -u postgres psql -d $DB_NAME -c "SELECT COUNT(*) as total_specialist_bookings FROM specialist_bookings;"

echo ""
echo "=========================================="
echo "✅ DATABASE SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "Database: $DB_NAME"
echo "Status: Ready for use"
echo ""
echo "Next steps:"
echo "1. Update backend/.env to use database: $DB_NAME"
echo "2. Restart the backend: pm2 restart backend"
echo "3. Test specialist booking at: https://itiyum.com/specialists"
echo "4. View bookings at: https://itiyum.com/dashboard/user/specialist-bookings"
echo ""

