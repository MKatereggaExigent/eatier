#!/usr/bin/env bash

# Fix PostgreSQL and restart everything properly

set -e

echo "🔧 Fixing PostgreSQL and Restarting Services"
echo "============================================="
echo ""

echo "1️⃣  Stopping all containers..."
docker compose down

echo ""
echo "2️⃣  Checking PostgreSQL logs..."
docker compose logs postgres 2>/dev/null || echo "No logs available yet"

echo ""
echo "3️⃣  Starting PostgreSQL first..."
docker compose up -d postgres

echo ""
echo "4️⃣  Waiting for PostgreSQL to be healthy (this may take 30-60 seconds)..."
for i in {1..60}; do
    if docker compose ps postgres | grep -q "healthy"; then
        echo "✅ PostgreSQL is healthy!"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo ""
echo "5️⃣  Starting backend..."
docker compose up -d backend

echo ""
echo "6️⃣  Waiting for backend to be ready..."
sleep 5

echo ""
echo "7️⃣  Starting frontend..."
docker compose up -d frontend

echo ""
echo "8️⃣  Waiting for frontend to start..."
sleep 5

echo ""
echo "9️⃣  Checking container status..."
docker compose ps

echo ""
echo "🔟  Watching frontend logs (Press Ctrl+C to exit)..."
echo ""
docker logs -f itiyum-frontend

