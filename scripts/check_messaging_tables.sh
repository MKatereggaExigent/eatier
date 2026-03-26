#!/bin/bash

# Script to check if messaging tables exist and debug the 400 error

echo "🔍 Checking Messaging Tables and Debugging 400 Error"
echo "======================================================"
echo ""

# Check if chat_requests table exists
echo "1️⃣  Checking if 'chat_requests' table exists..."
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "\d chat_requests" 2>&1
echo ""

# Check if chat_conversations table exists
echo "2️⃣  Checking if 'chat_conversations' table exists..."
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "\d chat_conversations" 2>&1
echo ""

# Check if user_follows table exists
echo "3️⃣  Checking if 'user_follows' table exists..."
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "\d user_follows" 2>&1
echo ""

# Check migration status for migration 037
echo "4️⃣  Checking if migration 037 has been applied..."
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "SELECT version, name, applied_at FROM schema_migrations WHERE version = '037' OR name LIKE '%social%' OR name LIKE '%messaging%';" 2>&1
echo ""

# Check recent backend logs for messaging errors
echo "5️⃣  Checking recent backend logs for messaging errors..."
docker logs itiyum-backend --tail=50 2>&1 | grep -i "messaging\|chat\|request\|400" || echo "No messaging-related errors found in recent logs"
echo ""

# Check if there are any existing chat requests
echo "6️⃣  Checking existing chat requests..."
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "SELECT COUNT(*) as total_requests, status, COUNT(*) FROM chat_requests GROUP BY status;" 2>&1 || echo "❌ chat_requests table does not exist"
echo ""

echo "✅ Check complete!"
echo ""
echo "If tables don't exist, run:"
echo "  ./run_all_migrations.sh --docker"

