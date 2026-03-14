#!/usr/bin/env bash

# Eatier/Itiyum Full Deployment Script
# Run this ON THE SERVER after git pull
# This starts backend AND deploys frontend to CapRover
#
# IMPORTANT: Run WITHOUT sudo for CapRover deployment to work:
#   ./deploy_all.sh
#
# If you need sudo for Docker, add your user to docker group:
#   sudo usermod -aG docker $USER

set -e

echo ""
echo "=========================================="
echo "   🚀 ITIYUM FULL DEPLOYMENT"
echo "=========================================="
echo "📍 Running on server: $(hostname)"
echo "📅 $(date)"
echo ""

# Check if running as root/sudo - warn about CapRover issues
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  WARNING: Running as root/sudo."
    echo "   CapRover config is in user's home directory."
    echo "   Frontend deployment may fail."
    echo ""
    echo "   Recommended: Run without sudo:"
    echo "   ./deploy_all.sh"
    echo ""
    read -p "Press Enter to continue anyway, or Ctrl+C to cancel..."
fi

# Get script directory and navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Ensure we're in the project root
if [ ! -f "angular.json" ] || [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: Please run this script from the project root."
    exit 1
fi

# ===========================================
# STEP 1: Start Backend
# ===========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 STEP 1: Starting Backend Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check/create .env file
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.production .env
    echo ""
    echo "📝 IMPORTANT: Update .env with your production values!"
    echo "   nano .env"
    echo ""
    read -p "Press Enter after updating .env, or Ctrl+C to cancel..."
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Build and start
echo "🐳 Building and starting backend containers..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for backend
echo "⏳ Waiting for backend to be ready..."
for i in {1..60}; do
    if curl -s http://localhost:3002/api/auth/status > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "⚠️  Backend is still starting. Continuing with frontend deployment..."
    fi
    sleep 1
done

echo ""
docker-compose -f docker-compose.prod.yml ps

# ===========================================
# STEP 2: Build & Deploy Frontend to CapRover
# ===========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎨 STEP 2: Building & Deploying Frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run frontend deployment script (use user's home for CapRover config)
if [ "$EUID" -eq 0 ] && [ -n "$SUDO_USER" ]; then
    echo "📝 Running CapRover deployment as $SUDO_USER..."
    sudo -u "$SUDO_USER" ./scripts/deploy_to_caprover.sh
else
    ./scripts/deploy_to_caprover.sh
fi

# ===========================================
# STEP 3: Final Summary
# ===========================================
echo ""
echo "=========================================="
echo "   ✅ FULL DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "🌐 Access URLs:"
echo "   • Frontend:  https://itiyum.aidocumines.com"
echo "   • Backend:   http://41.76.109.131:3002/api"
echo ""
echo "🔐 Admin Login:"
echo "   • Email:    admin@itiyum.com"
echo "   • Password: Admin@123"
echo ""
echo "📝 Useful Commands:"
echo "   • Backend logs:  docker-compose -f docker-compose.prod.yml logs -f"
echo "   • Stop backend:  docker-compose -f docker-compose.prod.yml down"
echo "   • CapRover logs: Check CapRover dashboard"
echo ""
echo "=========================================="
echo ""

