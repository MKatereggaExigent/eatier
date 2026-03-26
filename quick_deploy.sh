#!/usr/bin/env bash

# ============================================
# QUICK DEPLOYMENT SCRIPT
# Rebuilds backend and frontend without migrations
# ============================================

set -e

echo ""
echo "=========================================="
echo "   🚀 QUICK DEPLOYMENT"
echo "=========================================="
echo "📍 Server: $(hostname)"
echo "📅 $(date)"
echo ""

cd ~/eatier

# Step 1: Rebuild backend
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 STEP 1: Rebuilding Backend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker compose down
docker compose up --build -d
docker network connect captain-overlay-network itiyum-backend 2>/dev/null || echo "Already connected to network"

echo ""
echo "⏳ Waiting for backend to start..."
sleep 10

# Step 2: Build frontend
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚛️  STEP 2: Building Frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm run build

# Step 3: Deploy frontend to CapRover
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 STEP 3: Deploying Frontend to CapRover"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd dist/eatier/browser
tar -czf ../../../deploy.tar.gz *
cd ../../..

echo "Deploying to CapRover..."
caprover deploy -t deploy.tar.gz -a itiyum

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Frontend: https://itiyum.com"
echo "🔧 Backend: https://itiyum.com/api"
echo ""

