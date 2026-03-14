#!/bin/bash

echo "=========================================="
echo "Starting PostgreSQL and Running Migration"
echo "=========================================="

# Step 1: Check PostgreSQL status
echo ""
echo "Step 1: Checking PostgreSQL status..."
sudo systemctl status postgresql --no-pager | head -5

# Step 2: Start PostgreSQL if not running
echo ""
echo "Step 2: Starting PostgreSQL..."
sudo systemctl start postgresql

# Wait a moment for PostgreSQL to start
sleep 2

# Step 3: Verify PostgreSQL is running
echo ""
echo "Step 3: Verifying PostgreSQL is running..."
sudo systemctl status postgresql --no-pager | head -5

# Step 4: Run the migration
echo ""
echo "Step 4: Running specialist bookings migration..."
echo "=========================================="
sudo -u postgres psql -d itiyum_platform -f backend/scripts/migrations/032_fix_specialist_bookings_columns.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Step 5: Verifying table structure..."
    echo "=========================================="
    sudo -u postgres psql -d itiyum_platform -c "\d specialist_bookings"
    
    echo ""
    echo "Step 6: Checking existing bookings..."
    echo "=========================================="
    sudo -u postgres psql -d itiyum_platform -c "SELECT COUNT(*) as total_bookings FROM specialist_bookings;"
    
    echo ""
    echo "Step 7: Checking recent bookings (if any)..."
    echo "=========================================="
    sudo -u postgres psql -d itiyum_platform -c "SELECT id, booking_reference, client_id, specialist_id, booking_date, status, created_at FROM specialist_bookings ORDER BY created_at DESC LIMIT 5;"
    
    echo ""
    echo "=========================================="
    echo "✅ ALL DONE!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Test creating a booking at https://itiyum.com/specialists"
    echo "2. View bookings at https://itiyum.com/dashboard/user/specialist-bookings"
    echo "   (NOT /dashboard/user/bookings - that's for restaurants!)"
    echo "3. Click 'Chef Bookings' (👨‍🍳) in the sidebar"
    echo ""
else
    echo ""
    echo "❌ Migration failed!"
    echo "Check the error messages above."
    exit 1
fi

