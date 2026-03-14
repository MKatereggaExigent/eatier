#!/bin/bash

# Script to verify database tables exist
# Run this on the server to check if all required tables are present

echo "🔍 Verifying Database Tables for Food Enthusiast Dashboard"
echo "==========================================================="
echo ""

# Check if page_view_events table exists
echo "1️⃣  Checking if 'page_view_events' table exists..."
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "\dt page_view_events"
echo ""

# Check if business_analytics_daily table exists
echo "2️⃣  Checking if 'business_analytics_daily' table exists..."
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "\dt business_analytics_daily"
echo ""

# Check if analytics_events table exists
echo "3️⃣  Checking if 'analytics_events' table exists..."
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "\dt analytics_events"
echo ""

# Check migration status
echo "4️⃣  Checking migration status..."
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "SELECT version, name, applied_at FROM schema_migrations ORDER BY version DESC LIMIT 10;"
echo ""

# Count page views for a user (if table exists)
echo "5️⃣  Checking page view data..."
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "SELECT COUNT(*) as total_page_views FROM page_view_events;" 2>/dev/null || echo "❌ Table does not exist"
echo ""

# Check if reviews exist
echo "6️⃣  Checking reviews data..."
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "SELECT COUNT(*) as total_reviews FROM reviews WHERE status = 'published';"
echo ""

# Check if bookings exist
echo "7️⃣  Checking bookings data..."
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "SELECT COUNT(*) as total_bookings FROM bookings;"
echo ""

# Check if favorites exist
echo "8️⃣  Checking favorites data..."
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "SELECT COUNT(*) as total_favorites FROM favorites;"
echo ""

# Check if businesses exist
echo "9️⃣  Checking businesses data..."
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "SELECT COUNT(*) as total_businesses FROM businesses WHERE account_status = 'active';"
echo ""

echo "✅ Database verification completed!"
echo ""
echo "📝 If 'page_view_events' table doesn't exist, run:"
echo "   docker exec itiyum-backend npm run migrate"

