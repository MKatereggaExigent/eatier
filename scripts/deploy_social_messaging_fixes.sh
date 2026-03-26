#!/bin/bash

# Script to deploy social and messaging fixes
# This script runs migrations and deploys the frontend

set -e  # Exit on error

echo "🚀 Deploying Social & Messaging Fixes"
echo "======================================"
echo ""

# Step 1: Check if we're on the production server
echo "1️⃣  Checking environment..."
if ! docker ps | grep -q "itiyum-postgres"; then
    echo "❌ Error: itiyum-postgres container not found!"
    echo "   This script must be run on the production server (41.76.109.131)"
    exit 1
fi
echo "✅ Production environment detected"
echo ""

# Step 2: Run database migrations
echo "2️⃣  Running database migrations..."
if [ -f "./run_all_migrations.sh" ]; then
    ./run_all_migrations.sh --docker
else
    echo "⚠️  run_all_migrations.sh not found, running migrations manually..."
    
    # Run migration 037
    if [ -f "backend/scripts/migrations/037_social_and_messaging_system.sql" ]; then
        echo "   Running migration 037..."
        docker exec -i itiyum-postgres psql -U itiyum_user -d itiyum_platform < backend/scripts/migrations/037_social_and_messaging_system.sql
    fi
    
    # Run migration 038
    if [ -f "backend/scripts/migrations/038_presence_and_enhanced_messaging.sql" ]; then
        echo "   Running migration 038..."
        docker exec -i itiyum-postgres psql -U itiyum_user -d itiyum_platform < backend/scripts/migrations/038_presence_and_enhanced_messaging.sql
    fi
fi
echo ""

# Step 3: Verify tables exist
echo "3️⃣  Verifying database tables..."
TABLES_EXIST=true

for table in chat_requests chat_conversations chat_participants chat_messages user_follows; do
    if docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "\dt $table" 2>&1 | grep -q "Did not find"; then
        echo "   ❌ Table '$table' does not exist"
        TABLES_EXIST=false
    else
        echo "   ✅ Table '$table' exists"
    fi
done

if [ "$TABLES_EXIST" = false ]; then
    echo ""
    echo "❌ Error: Some required tables are missing!"
    echo "   Please check the migration logs above."
    exit 1
fi
echo ""

# Step 4: Restart backend
echo "4️⃣  Restarting backend container..."
docker restart itiyum-backend
echo "   Waiting for backend to start..."
sleep 5
echo "✅ Backend restarted"
echo ""

# Step 5: Build and deploy frontend
echo "5️⃣  Building and deploying frontend..."
if [ -f "package.json" ]; then
    echo "   Building frontend..."
    npm run build
    
    echo "   Deploying to CapRover..."
    if [ -f "./scripts/deploy_to_caprover_v2.sh" ]; then
        ./scripts/deploy_to_caprover_v2.sh
    else
        echo "   ⚠️  deploy_to_caprover_v2.sh not found, skipping deployment"
    fi
else
    echo "   ⚠️  package.json not found, skipping frontend build"
fi
echo ""

# Step 6: Final verification
echo "6️⃣  Final verification..."
echo "   Checking backend logs for errors..."
docker logs itiyum-backend --tail=20 2>&1 | grep -i "error\|fail" || echo "   ✅ No errors found in recent logs"
echo ""

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Test the social page: https://itiyum.com/dashboard/specialist/social"
echo "   2. Try starting a chat with a user"
echo "   3. Check the browser console for any errors"
echo ""
echo "🐛 If you still see errors, run:"
echo "   ./scripts/check_messaging_tables.sh"

