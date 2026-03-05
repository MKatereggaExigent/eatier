#!/bin/bash

# Script to run the digital card customization migration
# Usage: ./run_migration.sh

echo "Running digital card customization migration..."

# Set database credentials (adjust as needed)
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-itiyum_db}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Run the migration
PGPASSWORD="${DB_PASSWORD:-postgres}" psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -f add_digital_card_customization.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi

