#!/usr/bin/env bash

# Complete fix for frontend Docker cache issues

set -e

echo "🔧 Complete Frontend Cache Fix"
echo "==============================="
echo ""

echo "1️⃣  Stopping frontend container..."
docker compose stop frontend

echo ""
echo "2️⃣  Removing Angular cache..."
rm -rf .angular
echo "✅ Local cache cleared"

echo ""
echo "3️⃣  Removing cache inside container..."
docker compose run --rm frontend rm -rf /app/.angular || true
echo "✅ Container cache cleared"

echo ""
echo "4️⃣  Starting frontend container..."
docker compose up -d frontend

echo ""
echo "5️⃣  Waiting for Angular to start..."
sleep 5

echo ""
echo "6️⃣  Watching logs (Press Ctrl+C to exit)..."
echo ""
docker logs -f itiyum-frontend

