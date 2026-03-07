#!/usr/bin/env bash

# Debug script for business profile data persistence issues

echo "=========================================="
echo "🔍 BUSINESS PROFILE DEBUG SCRIPT"
echo "=========================================="
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Checking Docker containers status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker ps | grep itiyum

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Backend logs (last 100 lines)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker logs itiyum-backend-prod --tail 100

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  PostgreSQL logs (last 50 lines)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker logs itiyum-postgres-prod --tail 50

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Test database connection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec itiyum-backend-prod node -e "const pool = require('./config/database'); pool.query('SELECT NOW()').then(r => console.log('✅ DB Connected:', r.rows[0])).catch(e => console.error('❌ DB Error:', e.message));"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Check businesses table structure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec itiyum-postgres-prod psql -U itiyum -d itiyum -c "\d businesses" | head -50

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Check recent business updates"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec itiyum-postgres-prod psql -U itiyum -d itiyum -c "SELECT id, business_name, phone, city, state, postal_code, website, updated_at FROM businesses ORDER BY updated_at DESC LIMIT 3;"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  Watch backend logs in real-time"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Run this command to watch logs while testing:"
echo "  docker logs -f itiyum-backend-prod"
echo ""
echo "Then try saving the business profile and watch for:"
echo "  - PUT /api/business-owner/my-business requests"
echo "  - Any SQL errors"
echo "  - Any validation errors"
echo ""

