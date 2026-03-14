#!/bin/bash

echo "========================================="
echo "TESTING ADS API ENDPOINT"
echo "========================================="

# Get the user ID from the database
USER_ID=$(docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -t -c "SELECT user_id FROM ad_campaigns LIMIT 1;" | xargs)

echo "User ID: $USER_ID"
echo ""

# Test the API endpoint
echo "1. Testing: GET /api/ads/campaigns/$USER_ID"
echo "-------------------------------------------"
curl -s "http://localhost:3001/api/ads/campaigns/$USER_ID"

echo ""
echo ""
echo "2. Testing: GET /api/business-ads/my-ads?userId=$USER_ID"
echo "-------------------------------------------"
curl -s "http://localhost:3001/api/business-ads/my-ads?userId=$USER_ID"

echo ""
echo ""
echo "========================================="

