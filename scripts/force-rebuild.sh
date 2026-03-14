#!/usr/bin/env bash

# Force Docker to pick up file changes by touching the file and restarting

echo "🔄 Forcing Docker to pick up file changes..."
echo ""

echo "1️⃣  Touching the file to update timestamp..."
touch src/app/pages/business/profile/business-profile.component.ts

echo ""
echo "2️⃣  Restarting frontend container..."
docker compose restart frontend

echo ""
echo "3️⃣  Waiting for restart..."
sleep 3

echo ""
echo "4️⃣  Watching logs..."
docker logs -f itiyum-frontend

