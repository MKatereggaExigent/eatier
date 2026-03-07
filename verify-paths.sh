#!/usr/bin/env bash

# Verify file paths and structure

echo "🔍 Verifying File Paths"
echo "======================="
echo ""

echo "1️⃣  Business Profile Component Location:"
ls -la src/app/pages/business/profile/business-profile.component.ts
echo ""

echo "2️⃣  Environment Files:"
ls -la src/environments/
echo ""

echo "3️⃣  Relative path from component to environments:"
echo "   Component: src/app/pages/business/profile/business-profile.component.ts"
echo "   Target:    src/environments/environment.ts"
echo "   Relative:  ../../../environments/environment"
echo ""

echo "4️⃣  Testing path resolution:"
cd src/app/pages/business/profile
if [ -f "../../../environments/environment.ts" ]; then
    echo "   ✅ Path resolves correctly"
else
    echo "   ❌ Path does NOT resolve"
fi
cd - > /dev/null

echo ""
echo "5️⃣  Checking file content (first 10 lines):"
head -10 src/app/pages/business/profile/business-profile.component.ts

echo ""
echo "6️⃣  Checking inside Docker container:"
docker exec itiyum-frontend ls -la /app/src/environments/ || echo "Container not running or path not found"

echo ""
echo "7️⃣  Checking component file inside container:"
docker exec itiyum-frontend head -10 /app/src/app/pages/business/profile/business-profile.component.ts || echo "Container not running or file not found"

