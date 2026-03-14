#!/bin/bash

echo "========================================="
echo "AD CAMPAIGNS DATABASE INSPECTION"
echo "========================================="

echo ""
echo "1. Table columns:"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'ad_campaigns' AND column_name IN ('budget', 'total_budget', 'daily_budget', 'spent', 'spent_amount', 'remaining_amount', 'impressions', 'clicks') ORDER BY column_name;"

echo ""
echo "2. Campaign count:"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -t -c "SELECT COUNT(*) FROM ad_campaigns;"

echo ""
echo "3. Campaign data:"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -x -c "SELECT id, title, status, budget, total_budget, daily_budget, spent, remaining_amount, impressions, clicks, start_date, end_date FROM ad_campaigns LIMIT 1;"

echo ""
echo "4. Migrations status:"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -t -c "SELECT version || ' - ' || name FROM schema_migrations WHERE version IN ('032', '033', '035') ORDER BY version;"

echo ""
echo "========================================="

