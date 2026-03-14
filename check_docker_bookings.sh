#!/bin/bash

echo "=========================================="
echo "Docker Bookings System Diagnostics"
echo "=========================================="

# Step 1: Check Docker containers status
echo ""
echo "Step 1: Docker containers status"
echo "=========================================="
docker compose ps

# Step 2: Check database connection from backend
echo ""
echo "Step 2: Backend database configuration"
echo "=========================================="
echo "Database settings from docker-compose.yml:"
echo "  DB_HOST: postgres"
echo "  DB_NAME: itiyum_platform"
echo "  DB_USER: itiyum_user"
echo ""

# Step 3: Check if database exists and has tables
echo ""
echo "Step 3: Checking database tables"
echo "=========================================="
echo "Listing all tables in itiyum_platform:"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "\dt" | grep -E "specialist_bookings|bookings|users" || echo "No tables found!"

# Step 4: Check specialist_bookings table structure
echo ""
echo "Step 4: specialist_bookings table structure"
echo "=========================================="
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "\d specialist_bookings" 2>&1 | head -40

# Step 5: Check for any bookings
echo ""
echo "Step 5: Checking for existing bookings"
echo "=========================================="
echo "Specialist bookings count:"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "SELECT COUNT(*) as total FROM specialist_bookings;"

echo ""
echo "Restaurant bookings count:"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "SELECT COUNT(*) as total FROM bookings;"

# Step 6: Check if there are any users
echo ""
echo "Step 6: Checking users in database"
echo "=========================================="
echo "Total users:"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "SELECT COUNT(*) as total_users FROM users;"

echo ""
echo "Users by role:"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "
SELECT 
    r.name as role,
    COUNT(DISTINCT u.id) as user_count
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY r.name
ORDER BY user_count DESC;
" 2>&1 || echo "Could not fetch user roles"

# Step 7: Check backend logs for errors
echo ""
echo "Step 7: Recent backend logs (last 30 lines)"
echo "=========================================="
docker logs itiyum-backend --tail 30 2>&1 | grep -v "node_modules"

# Step 8: Test database connection from backend
echo ""
echo "Step 8: Testing database connection from backend"
echo "=========================================="
docker exec itiyum-backend node -e "
const pool = require('./config/database');
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Database connected successfully!');
  console.log('   Server time:', res.rows[0].now);
  pool.end();
});
" 2>&1 || echo "❌ Could not test database connection"

# Step 9: Check if migrations have been run
echo ""
echo "Step 9: Checking migration status"
echo "=========================================="
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "
SELECT version, name, applied_at 
FROM schema_migrations 
ORDER BY applied_at DESC 
LIMIT 10;
" 2>&1 || echo "⚠️  schema_migrations table not found - migrations may not have run"

echo ""
echo "=========================================="
echo "Diagnostic Summary"
echo "=========================================="
echo ""
echo "Next steps to test bookings:"
echo ""
echo "1. Check if containers are running:"
echo "   docker compose ps"
echo ""
echo "2. View backend logs in real-time:"
echo "   docker logs -f itiyum-backend"
echo ""
echo "3. Try creating a booking at:"
echo "   https://itiyum.com/specialists"
echo ""
echo "4. Check if booking was saved:"
echo "   docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c 'SELECT * FROM specialist_bookings ORDER BY created_at DESC LIMIT 5;'"
echo ""
echo "5. View bookings at:"
echo "   https://itiyum.com/dashboard/user/specialist-bookings"
echo "   (Click 'Chef Bookings' 👨‍🍳 in sidebar)"
echo ""

