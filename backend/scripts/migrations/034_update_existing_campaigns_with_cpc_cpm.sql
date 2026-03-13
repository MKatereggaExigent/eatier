-- Migration 034: Update existing ad campaigns with CPC/CPM from their tiers
-- Date: 2026-03-13
-- Description: Backfills cpc and cpm values for existing campaigns based on their tier

-- Update existing campaigns to inherit CPC/CPM from their tier
UPDATE ad_campaigns ac
SET 
  cpc = t.cost_per_click,
  cpm = t.cost_per_impression
FROM ad_space_tiers t
WHERE ac.tier_id = t.id
  AND (ac.cpc IS NULL OR ac.cpm IS NULL);

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % campaigns with CPC/CPM values from their tiers', updated_count;
END $$;

