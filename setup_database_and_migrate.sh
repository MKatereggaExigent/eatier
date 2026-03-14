#!/bin/bash

echo "=========================================="
echo "Database Setup and Migration"
echo "=========================================="

# Step 1: List existing databases
echo ""
echo "Step 1: Checking existing databases..."
echo "=========================================="
sudo -u postgres psql -c "\l" | grep -E "Name|itiyum|eatier"

echo ""
echo "Step 2: Checking if itiyum_platform database exists..."
DB_EXISTS=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w itiyum_platform | wc -l)

if [ $DB_EXISTS -eq 0 ]; then
    echo "❌ Database 'itiyum_platform' does not exist!"
    echo ""
    echo "Let me check for similar databases..."
    sudo -u postgres psql -c "\l" | grep -i itiyum
    
    echo ""
    echo "Available databases:"
    sudo -u postgres psql -c "\l" | grep -v "template" | grep -v "postgres" | head -20
    
    echo ""
    echo "=========================================="
    echo "PLEASE PROVIDE THE CORRECT DATABASE NAME"
    echo "=========================================="
    echo ""
    echo "Options:"
    echo "1. If you see a database like 'eatier' or 'itiyum', we can use that"
    echo "2. We can create a new 'itiyum_platform' database"
    echo "3. We can restore from a backup"
    echo ""
    read -p "Enter the database name to use (or 'create' to create itiyum_platform): " DB_NAME
    
    if [ "$DB_NAME" = "create" ]; then
        echo ""
        echo "Creating itiyum_platform database..."
        sudo -u postgres createdb itiyum_platform
        
        if [ $? -eq 0 ]; then
            echo "✅ Database created successfully!"
            echo ""
            echo "Now we need to set up the schema..."
            echo "Do you have a schema file or backup to restore?"
            echo ""
            echo "Available schema files:"
            ls -lh backend/scripts/*.sql 2>/dev/null
            ls -lh backend/scripts/migrations/*.sql 2>/dev/null | head -5
            echo ""
            read -p "Enter schema file path (or 'skip' to just run the migration): " SCHEMA_FILE
            
            if [ "$SCHEMA_FILE" != "skip" ] && [ -f "$SCHEMA_FILE" ]; then
                echo "Running schema file: $SCHEMA_FILE"
                sudo -u postgres psql -d itiyum_platform -f "$SCHEMA_FILE"
            fi
        else
            echo "❌ Failed to create database!"
            exit 1
        fi
        DB_NAME="itiyum_platform"
    fi
else
    echo "✅ Database 'itiyum_platform' exists!"
    DB_NAME="itiyum_platform"
fi

echo ""
echo "Step 3: Running migration on database: $DB_NAME"
echo "=========================================="
sudo -u postgres psql -d "$DB_NAME" -f backend/scripts/migrations/032_fix_specialist_bookings_columns.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Step 4: Verifying specialist_bookings table..."
    echo "=========================================="
    sudo -u postgres psql -d "$DB_NAME" -c "\d specialist_bookings"
    
    echo ""
    echo "Step 5: Checking existing bookings..."
    echo "=========================================="
    sudo -u postgres psql -d "$DB_NAME" -c "SELECT COUNT(*) as total_bookings FROM specialist_bookings;"
    
    echo ""
    echo "=========================================="
    echo "✅ ALL DONE!"
    echo "=========================================="
else
    echo ""
    echo "❌ Migration failed!"
    echo ""
    echo "Checking if specialist_bookings table exists..."
    sudo -u postgres psql -d "$DB_NAME" -c "\dt" | grep specialist
    
    echo ""
    echo "If the table doesn't exist, you may need to run the main schema file first:"
    echo "sudo -u postgres psql -d $DB_NAME -f backend/scripts/schema-with-rbac-multitenancy.sql"
fi

