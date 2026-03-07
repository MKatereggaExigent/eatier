#!/usr/bin/env bash

# Verify that the business profile fixes are deployed

echo "=========================================="
echo "🔍 VERIFY DEPLOYMENT"
echo "=========================================="
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Check if backend code has the fix"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Looking for 'city', 'state', 'zipCode' in PUT /my-business endpoint..."
docker exec itiyum-backend-prod grep -A 20 "PUT /api/business-owner/my-business" /app/routes/business-owner.js | grep -E "city|state|zipCode|postal_code"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Check git status on server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd ~/eatier
git log --oneline -5
echo ""
git status

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Check if local changes are committed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Files modified but not committed:"
git diff --name-only

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Test PUT endpoint manually"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "You can test the endpoint with:"
echo ""
echo "curl -X PUT https://itiyum.com/api/business-owner/my-business \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"phone\": \"+27123456789\", \"city\": \"Cape Town\", \"state\": \"Western Cape\"}'"
echo ""

