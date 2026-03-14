#!/bin/bash

echo "=========================================="
echo "Backend Database Connection Diagnostics"
echo "=========================================="

# Step 1: Check backend .env configuration
echo ""
echo "Step 1: Backend .env database configuration:"
echo "=========================================="
if [ -f "backend/.env" ]; then
    echo "Database settings:"
    cat backend/.env | grep -E "DB_|DATABASE" | grep -v PASSWORD
    echo ""
    DB_NAME=$(cat backend/.env | grep "DB_NAME=" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    echo "Detected DB_NAME: $DB_NAME"
else
    echo "❌ backend/.env file not found!"
    exit 1
fi

# Step 2: Check if that database exists
echo ""
echo "Step 2: Checking if database '$DB_NAME' exists..."
echo "=========================================="
DB_EXISTS=$(sudo -u postgres psql -lqt 2>&1 | grep -v "WARNING" | cut -d \| -f 1 | grep -w "$DB_NAME" | wc -l)

if [ $DB_EXISTS -eq 1 ]; then
    echo "✅ Database '$DB_NAME' exists!"
else
    echo "❌ Database '$DB_NAME' does NOT exist!"
    echo ""
    echo "Available databases:"
    sudo -u postgres psql -lqt 2>&1 | grep -v "WARNING" | cut -d \| -f 1 | grep -v "template" | grep -v "^$" | head -10
    echo ""
    echo "ACTION REQUIRED: Update backend/.env to use 'itiyum_platform' or create the database"
    exit 1
fi

# Step 3: Check specialist_bookings table structure
echo ""
echo "Step 3: Checking specialist_bookings table in '$DB_NAME'..."
echo "=========================================="
sudo -u postgres psql -d "$DB_NAME" -c "\d specialist_bookings" 2>&1 | grep -v "WARNING" | head -35

# Step 4: Check for any existing bookings
echo ""
echo "Step 4: Checking for existing bookings..."
echo "=========================================="
echo "Specialist bookings:"
sudo -u postgres psql -d "$DB_NAME" -c "SELECT COUNT(*) as specialist_bookings FROM specialist_bookings;" 2>&1 | grep -v "WARNING"

echo ""
echo "Restaurant bookings:"
sudo -u postgres psql -d "$DB_NAME" -c "SELECT COUNT(*) as restaurant_bookings FROM bookings;" 2>&1 | grep -v "WARNING"

# Step 5: Check backend process status
echo ""
echo "Step 5: Backend process status:"
echo "=========================================="
pm2 list | grep backend

# Step 6: Check recent backend logs for database errors
echo ""
echo "Step 6: Recent backend logs (last 20 lines):"
echo "=========================================="
pm2 logs backend --lines 20 --nostream 2>&1 | tail -25

echo ""
echo "=========================================="
echo "Diagnostic Summary"
echo "=========================================="
echo ""
echo "✓ Check if DB_NAME in backend/.env matches 'itiyum_platform'"
echo "✓ Check if backend process is running (pm2 status)"
echo "✓ Check backend logs for connection errors (pm2 logs backend)"
echo ""
echo "If DB_NAME is wrong, run:"
echo "  nano backend/.env"
echo "  # Change DB_NAME to: itiyum_platform"
echo "  pm2 restart backend"
echo ""

