#!/usr/bin/env bash

# Debug script for deployment issues

echo "🔍 Checking container status..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "🔍 PostgreSQL logs:"
docker-compose -f docker-compose.prod.yml logs --tail=50 postgres

echo ""
echo "🔍 Backend logs (if running):"
docker-compose -f docker-compose.prod.yml logs --tail=50 backend 2>/dev/null || echo "Backend container not running"

echo ""
echo "🔍 Checking PostgreSQL health manually..."
docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U itiyum -d itiyum 2>&1 || echo "PostgreSQL not ready or not running"

echo ""
echo "🔍 Checking if .env file exists..."
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo "Contents (sensitive values masked):"
    cat .env | sed 's/=.*/=***HIDDEN***/'
else
    echo "❌ .env file NOT found"
fi

