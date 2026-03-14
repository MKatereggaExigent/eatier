#!/usr/bin/env bash

# Test business profile update

echo "=========================================="
echo "🧪 TEST BUSINESS PROFILE"
echo "=========================================="
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Build and deploy frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd ~/eatier
npm run build
./scripts/deploy_to_caprover_v2.sh

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Watch backend logs for PUT requests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Now go to: https://itiyum.com/business/profile"
echo "Update any field and click 'Save Changes'"
echo ""
echo "Watching logs for PUT /api/business-owner/my-business..."
echo "Press Ctrl+C to stop"
echo ""
docker logs -f itiyum-backend | grep --line-buffered -E "PUT.*my-business|Error|business_name|phone|city"

