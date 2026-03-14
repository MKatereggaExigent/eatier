#!/bin/bash

echo "========================================="
echo "AD CAMPAIGNS DATABASE INSPECTION"
echo "========================================="
echo ""

echo "1. Checking ad_campaigns table structure..."
echo "-------------------------------------------"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform << 'EOF'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ad_campaigns'
  AND column_name IN ('id', 'title', 'budget', 'total_budget', 'daily_budget', 'spent', 'spent_amount', 'remaining_amount', 'impressions', 'clicks', 'conversions', 'cpc', 'cpm', 'status', 'start_date', 'end_date')
ORDER BY column_name;
EOF

echo ""
echo "2. Checking actual campaign data..."
echo "-------------------------------------------"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform << 'EOF'
SELECT 
  id,
  title,
  status,
  budget,
  total_budget,
  daily_budget,
  spent,
  remaining_amount,
  impressions,
  clicks,
  conversions,
  cpc,
  cpm,
  start_date,
  end_date,
  created_at
FROM ad_campaigns
ORDER BY created_at DESC
LIMIT 5;
EOF

echo ""
echo "3. Checking if migrations 033 and 035 have run..."
echo "-------------------------------------------"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform << 'EOF'
SELECT version, name, applied_at
FROM schema_migrations
WHERE version IN ('033', '035')
ORDER BY version;
EOF

echo ""
echo "4. Checking ad_campaign_daily_stats table..."
echo "-------------------------------------------"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform << 'EOF'
SELECT 
  campaign_id,
  stat_date,
  impressions,
  clicks,
  conversions,
  spend,
  ctr
FROM ad_campaign_daily_stats
ORDER BY stat_date DESC
LIMIT 5;
EOF

echo ""
echo "5. Checking ad_impressions and ad_clicks..."
echo "-------------------------------------------"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform << 'EOF'
SELECT 
  'Impressions' as type,
  COUNT(*) as count
FROM ad_impressions
UNION ALL
SELECT 
  'Clicks' as type,
  COUNT(*) as count
FROM ad_clicks;
EOF

echo ""
echo "========================================="
echo "INSPECTION COMPLETE"
echo "========================================="

