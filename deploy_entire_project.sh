#!/usr/bin/env bash

# ============================================
# ITIYUM COMPLETE DEPLOYMENT SCRIPT
# ============================================
# This script does EVERYTHING needed to deploy:
# 1. Pull latest code from git
# 2. Rebuild and restart Docker containers
# 3. Run ALL database migrations comprehensively
# 4. Build Angular frontend for production
# 5. Deploy frontend to CapRover
# ============================================

set -e  # Exit on any error

echo ""
echo "=========================================="
echo "   🚀 ITIYUM COMPLETE DEPLOYMENT"
echo "=========================================="
echo "📍 Server: $(hostname)"
echo "📅 $(date)"
echo ""

# Step 1: Pull latest code
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 STEP 1: Pulling latest code"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd ~/Documents/Github/eatier
git pull origin development-v2

# Step 2: Rebuild and restart Docker containers
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 STEP 2: Rebuilding Docker containers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker compose down --remove-orphans 2>/dev/null || true
docker compose up --build -d

# Step 3: Wait for PostgreSQL to be ready
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏳ STEP 3: Waiting for PostgreSQL..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 10

# Check if PostgreSQL is ready
for i in {1..30}; do
    if docker exec itiyum-postgres pg_isready -U itiyum_user > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️  PostgreSQL is still starting. Continuing anyway..."
    fi
    echo "   Waiting... ($i/30)"
    sleep 2
done

# Step 4: Connect backend to CapRover network
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔗 STEP 4: Connecting backend to CapRover network"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker network connect captain-overlay-network itiyum-backend 2>/dev/null || echo "   Already connected to captain network"

# Step 5: Run ALL migrations comprehensively INSIDE the Docker container
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  STEP 5: Running ALL database migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec itiyum-backend npm run migrate

# Step 6: Build frontend for production
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏗️  STEP 6: Building frontend for production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd ~/Documents/Github/eatier
npm run build

# Step 7: Deploy frontend to CapRover
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 STEP 7: Deploying to CapRover"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./scripts/deploy_to_caprover_v2.sh

echo ""
echo "=========================================="
echo "   ✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo "🌐 Frontend: https://itiyum.com"
echo "🔧 Backend:  https://itiyum.com/api"
echo ""
echo "📊 Check status:"
echo "   docker compose ps"
echo "   docker logs itiyum-backend --tail 50"
echo ""
