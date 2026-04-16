#!/bin/bash

# ====================================
# Cleanup Test Notifications
# Removes all test notifications
# ====================================

set -e

echo "🗑️  Cleaning up Test Notifications"
echo "==================================="

# Database connection details
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-itiyum_platform}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📡 Connecting to database...${NC}"

# Count before deletion
BEFORE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM notifications WHERE message LIKE '%[TEST]%';")

echo -e "${BLUE}Found $BEFORE_COUNT test notifications${NC}"

# Delete test notifications
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "DELETE FROM notifications WHERE message LIKE '%[TEST]%';"

# Count after deletion
AFTER_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM notifications WHERE message LIKE '%[TEST]%';")

echo -e "${GREEN}✅ Deleted $(($BEFORE_COUNT - $AFTER_COUNT)) test notifications${NC}"
echo -e "${GREEN}✅ Remaining test notifications: $AFTER_COUNT${NC}"
