#!/bin/bash

echo "========================================="
echo "CHECKING DEPLOYMENT STATUS"
echo "========================================="

echo ""
echo "1. Check if frontend was rebuilt:"
echo "-------------------------------------------"
ls -lh dist/browser/main*.js | head -1

echo ""
echo "2. Check CapRover deployment timestamp:"
echo "-------------------------------------------"
docker ps --filter "name=captain-itiyum" --format "{{.CreatedAt}}" | head -1

echo ""
echo "3. Check backend container timestamp:"
echo "-------------------------------------------"
docker ps --filter "name=itiyum-backend" --format "{{.CreatedAt}}" | head -1

echo ""
echo "4. Test API endpoint directly:"
echo "-------------------------------------------"
USER_ID=$(docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -t -c "SELECT user_id FROM ad_campaigns LIMIT 1;" | xargs)
echo "User ID: $USER_ID"
curl -s "http://localhost:3001/api/ads/campaigns/$USER_ID" | jq '.campaigns[0] | {total_budget, daily_budget, spent, remaining_amount, impressions, clicks}'

echo ""
echo "========================================="

