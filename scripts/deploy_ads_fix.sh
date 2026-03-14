#!/bin/bash

# Deploy Ad Dashboard Fix
# This script rebuilds and deploys the frontend with the ad metrics fix

set -e  # Exit on error

echo "🚀 Deploying Ad Dashboard Fix..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Step 1: Installing dependencies...${NC}"
npm install

echo ""
echo -e "${BLUE}🔨 Step 2: Building the frontend...${NC}"
npm run build

echo ""
echo -e "${BLUE}📊 Step 3: Verifying the fix...${NC}"
if grep -q "parseFloat(c.spent)" "src/app/pages/ads/ad-management/ad-management.component.ts"; then
    echo -e "${GREEN}✅ Fix verified in source code${NC}"
else
    echo -e "${RED}❌ Warning: Fix not found in source code${NC}"
fi

echo ""
echo -e "${BLUE}🔄 Step 4: Deploying...${NC}"

# Check which deployment method to use
if command -v pm2 &> /dev/null; then
    echo "Using PM2..."
    pm2 restart itiyum-frontend || pm2 restart all
    echo -e "${GREEN}✅ PM2 restart complete${NC}"
elif [ -f "docker-compose.yml" ]; then
    echo "Using Docker Compose..."
    docker-compose restart frontend
    echo -e "${GREEN}✅ Docker restart complete${NC}"
elif command -v systemctl &> /dev/null; then
    echo "Using systemd..."
    sudo systemctl restart itiyum-frontend
    echo -e "${GREEN}✅ Systemd restart complete${NC}"
else
    echo -e "${RED}⚠️  Could not detect deployment method${NC}"
    echo "Please manually restart your frontend server"
fi

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
echo "2. Navigate to https://itiyum.com/business/ads"
echo "3. Verify that budgets and metrics are now showing correctly"
echo ""
echo "Expected results:"
echo "  - Budgets should show R100.00 - R120.00"
echo "  - Spent amounts should show actual values (not R0.00)"
echo "  - Impressions and clicks should display correctly"
echo "  - Currency symbol should be 'R' (South African Rand)"
echo ""
echo "📚 For troubleshooting, see: FIX_APPLIED_ADS_DASHBOARD.md"

