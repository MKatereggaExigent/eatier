#!/usr/bin/env bash

# Itiyum Latest CapRover Deployment Script
# This script:
# 1. Pulls latest code from git
# 2. Rebuilds and restarts Docker containers
# 3. Runs database migrations INSIDE the Docker container
# 4. Builds and deploys frontend to CapRover

set -e  # Exit on any error

echo ""
echo "=========================================="
echo "   🚀 ITIYUM DEPLOYMENT"
echo "=========================================="
echo "📍 Server: $(hostname)"
echo "📅 $(date)"
echo ""

# Step 1: Pull latest code
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 STEP 1: Pulling latest code"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd ~/eatier
git pull origin development-v2

# Step 2: Rebuild and restart Docker containers
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 STEP 2: Rebuilding Docker containers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
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

# Step 4: Run migrations INSIDE the Docker container
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  STEP 4: Running database migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec itiyum-backend npm run migrate

# Step 5: Build frontend
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏗️  STEP 5: Building frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd ~/eatier
npm run build

# Step 6: Deploy frontend to CapRover
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 STEP 6: Deploying to CapRover"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./scripts/deploy_to_caprover_v2.sh

echo ""
echo "=========================================="
echo "   ✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo "🌐 Frontend: https://itiyum.com"
echo "🔧 Backend: https://itiyum.com/api"
echo ""
echo "📊 Check status:"
echo "   docker compose ps"
echo "   docker logs itiyum-backend-prod --tail 50"
echo ""

