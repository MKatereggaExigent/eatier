#!/bin/bash

# Script to run the digital card customization migration
# Usage: ./run_migration.sh

echo "Running digital card customization migration..."

# Try to find psql in common locations
PSQL_CMD=""
if command -v psql &> /dev/null; then
    PSQL_CMD="psql"
elif [ -f "/usr/local/bin/psql" ]; then
    PSQL_CMD="/usr/local/bin/psql"
elif [ -f "/opt/homebrew/bin/psql" ]; then
    PSQL_CMD="/opt/homebrew/bin/psql"
elif [ -f "/usr/bin/psql" ]; then
    PSQL_CMD="/usr/bin/psql"
elif [ -f "/Applications/Postgres.app/Contents/Versions/latest/bin/psql" ]; then
    PSQL_CMD="/Applications/Postgres.app/Contents/Versions/latest/bin/psql"
fi

if [ -z "$PSQL_CMD" ]; then
    echo "❌ psql command not found. Please install PostgreSQL client tools or use Node.js migration instead."
    echo ""
    echo "Alternative: Run the Node.js migration script:"
    echo "  node run_migration.js"
    exit 1
fi

# Set database credentials (adjust as needed)
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-itiyum_db}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Try connection without host first (Unix socket)
echo "Attempting to connect to database..."
PGPASSWORD="${DB_PASSWORD:-postgres}" $PSQL_CMD -U "$DB_USER" -d "$DB_NAME" -f add_digital_card_customization.sql 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    exit 0
fi

# If that fails, try with localhost
echo "Retrying with TCP connection..."
PGPASSWORD="${DB_PASSWORD:-postgres}" $PSQL_CMD -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -f add_digital_card_customization.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed. Please check the error messages above."
    echo ""
    echo "Alternative: Run the Node.js migration script:"
    echo "  node run_migration.js"
    exit 1
fi

