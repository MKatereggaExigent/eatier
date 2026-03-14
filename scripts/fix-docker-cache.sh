#!/usr/bin/env bash

# Fix Docker development environment cache issues
# This script clears Angular's build cache and restarts the frontend container

set -e

echo "🔧 Fixing Docker Development Environment Cache"
echo "=============================================="
echo ""

echo "1️⃣  Stopping containers..."
docker compose down

echo ""
echo "2️⃣  Removing Angular cache directory..."
rm -rf .angular
echo "✅ Cache cleared"

echo ""
echo "3️⃣  Starting containers..."
docker compose up -d

echo ""
echo "4️⃣  Waiting for frontend to start..."
sleep 5

echo ""
echo "5️⃣  Watching frontend logs..."
echo "   Press Ctrl+C to stop watching logs"
echo ""
docker logs -f itiyum-frontend

