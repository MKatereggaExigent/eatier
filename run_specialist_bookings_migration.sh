#!/bin/bash

# Script to run the specialist bookings migration on the server
# This fixes the missing columns in the specialist_bookings table

echo "=========================================="
echo "Running Specialist Bookings Migration"
echo "=========================================="

# Database connection details
DB_NAME="itiyum_platform"
DB_USER="postgres"
MIGRATION_FILE="backend/scripts/migrations/032_fix_specialist_bookings_columns.sql"

echo ""
echo "Migration file: $MIGRATION_FILE"
echo "Database: $DB_NAME"
echo ""

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

# Run the migration
echo "Running migration..."
sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Verifying specialist_bookings table structure..."
    sudo -u postgres psql -d "$DB_NAME" -c "\d specialist_bookings"
    echo ""
    echo "=========================================="
    echo "Next steps:"
    echo "1. Test creating a specialist booking at https://itiyum.com/specialists"
    echo "2. Check bookings at https://itiyum.com/dashboard/user/specialist-bookings"
    echo "=========================================="
else
    echo ""
    echo "❌ Migration failed!"
    exit 1
fi

