#!/bin/bash

# =============================================================================
# Check Notifications Script
# =============================================================================
# Quick diagnostic script to check notification system status
# =============================================================================

set -e

echo "🔍 Notification System Diagnostic"
echo "=================================="
echo ""

# Detect environment
if command -v docker &> /dev/null && docker ps | grep -q "itiyum-postgres"; then
    echo "🐳 Using Docker PostgreSQL container"
    PSQL_CMD="docker exec -i itiyum-postgres psql -U itiyum_user -d itiyum_platform"
elif command -v psql &> /dev/null; then
    echo "💻 Using local PostgreSQL"
    PSQL_CMD="psql -U itiyum_user -d itiyum_platform"
else
    echo "❌ Error: Neither Docker nor local PostgreSQL found"
    exit 1
fi

echo ""
echo "1️⃣  Checking if notifications table exists..."
TABLE_EXISTS=$($PSQL_CMD -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications');" | tr -d ' ')

if [ "$TABLE_EXISTS" = "t" ]; then
    echo "   ✅ notifications table exists"
else
    echo "   ❌ notifications table does NOT exist"
    echo "   Run migrations: ./run_all_migrations.sh --docker"
    exit 1
fi

echo ""
echo "2️⃣  Checking total notifications count..."
TOTAL_NOTIFICATIONS=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM notifications;" | tr -d ' ')
echo "   Total notifications in database: $TOTAL_NOTIFICATIONS"

echo ""
echo "3️⃣  Checking notifications per user..."
$PSQL_CMD <<EOF
SELECT 
    u.email,
    u.role,
    COUNT(n.id) as total,
    SUM(CASE WHEN n.is_read = false THEN 1 ELSE 0 END) as unread,
    SUM(CASE WHEN n.is_read = true THEN 1 ELSE 0 END) as read
FROM users u
LEFT JOIN notifications n ON u.id = n.user_id
GROUP BY u.email, u.role
ORDER BY u.created_at DESC;
EOF

echo ""
echo "4️⃣  Checking recent notifications..."
$PSQL_CMD <<EOF
SELECT 
    u.email,
    n.type,
    n.title,
    n.is_read,
    AGE(NOW(), n.created_at) as age
FROM notifications n
JOIN users u ON n.user_id = u.id
ORDER BY n.created_at DESC
LIMIT 10;
EOF

echo ""
echo "5️⃣  Checking notification types distribution..."
$PSQL_CMD <<EOF
SELECT 
    type,
    COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY count DESC;
EOF

echo ""
echo "6️⃣  Summary"
echo "   =========="

USERS_WITH_NOTIFICATIONS=$($PSQL_CMD -t -c "SELECT COUNT(DISTINCT user_id) FROM notifications;" | tr -d ' ')
TOTAL_USERS=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
UNREAD_NOTIFICATIONS=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM notifications WHERE is_read = false;" | tr -d ' ')

echo "   Total users: $TOTAL_USERS"
echo "   Users with notifications: $USERS_WITH_NOTIFICATIONS"
echo "   Total notifications: $TOTAL_NOTIFICATIONS"
echo "   Unread notifications: $UNREAD_NOTIFICATIONS"

echo ""

if [ "$TOTAL_NOTIFICATIONS" -eq "0" ]; then
    echo "⚠️  WARNING: No notifications found!"
    echo "   Run: ./scripts/seed_notifications.sh"
elif [ "$USERS_WITH_NOTIFICATIONS" -lt "$TOTAL_USERS" ]; then
    echo "⚠️  WARNING: Some users don't have notifications"
    echo "   Run: ./scripts/seed_notifications.sh"
else
    echo "✅ All checks passed! Notification system is ready."
fi

echo ""
