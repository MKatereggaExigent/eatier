#!/usr/bin/env bash

# Eatier/Itiyum Backend Startup Script
# Run this ON THE SERVER after git pull
# This starts the backend with docker-compose

set -e

echo ""
echo "🚀 Eatier/Itiyum Backend Startup"
echo "================================="
echo "📍 Running on server"
echo ""

# Get script directory and navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Step 1: Ensure we're in the project root
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: docker-compose.prod.yml not found."
    exit 1
fi

# Step 2: Check/create .env file
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.production .env
    echo ""
    echo "📝 IMPORTANT: Update .env with your production values!"
    echo "   nano .env"
    echo ""
    echo "   Required changes:"
    echo "   - DB_PASSWORD (change from default)"
    echo "   - JWT_SECRET (generate with: openssl rand -base64 64)"
    echo ""
    read -p "Press Enter after updating .env, or Ctrl+C to cancel..."
fi

# Step 3: Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Step 4: Build and start containers
echo "🐳 Building and starting containers..."
docker-compose -f docker-compose.prod.yml up -d --build

# Step 5: Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Check PostgreSQL
echo "🔍 Checking PostgreSQL..."
for i in {1..30}; do
    if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U itiyum > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL failed to start"
        docker-compose -f docker-compose.prod.yml logs postgres
        exit 1
    fi
    sleep 1
done

# Check Backend
echo "🔍 Checking Backend..."
for i in {1..30}; do
    if curl -s http://localhost:3002/api/auth/status > /dev/null 2>&1; then
        echo "✅ Backend is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️  Backend may still be starting. Check logs:"
        echo "   docker-compose -f docker-compose.prod.yml logs backend"
    fi
    sleep 1
done

# Step 6: Show status
echo ""
echo "📊 Container Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "=========================================="
echo "   ✅ BACKEND STARTED SUCCESSFULLY"
echo "=========================================="
echo ""
echo "🌐 Backend API: http://41.76.109.131:3002/api"
echo "🗄️  Database:   PostgreSQL on port 5466 (host) -> 5432 (container)"
echo ""
echo "📝 Useful commands:"
echo "   Logs:    docker-compose -f docker-compose.prod.yml logs -f"
echo "   Stop:    docker-compose -f docker-compose.prod.yml down"
echo "   Restart: docker-compose -f docker-compose.prod.yml restart"
echo ""

