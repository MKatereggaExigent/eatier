-- Migration 033: Add CPC and CPM columns to ad_space_tiers table
-- Date: 2026-03-13
-- Description: Adds cost_per_click and cost_per_impression columns for ad pricing

-- Add cost_per_click column (CPC - Cost Per Click)
ALTER TABLE ad_space_tiers
ADD COLUMN IF NOT EXISTS cost_per_click DECIMAL(10, 4) DEFAULT 0.50;

-- Add cost_per_impression column (CPM - Cost Per 1000 Impressions)
ALTER TABLE ad_space_tiers
ADD COLUMN IF NOT EXISTS cost_per_impression DECIMAL(10, 4) DEFAULT 10.00;

-- Add comments
COMMENT ON COLUMN ad_space_tiers.cost_per_click IS 'Cost per click (CPC) for this tier in the tier currency';
COMMENT ON COLUMN ad_space_tiers.cost_per_impression IS 'Cost per 1000 impressions (CPM) for this tier in the tier currency';

-- Update existing tiers with appropriate CPC/CPM values
UPDATE ad_space_tiers
SET 
  cost_per_click = CASE name
    WHEN 'basic' THEN 0.25      -- R0.25 per click
    WHEN 'standard' THEN 0.50   -- R0.50 per click
    WHEN 'premium' THEN 1.00    -- R1.00 per click
    WHEN 'featured' THEN 2.00   -- R2.00 per click
    ELSE 0.50
  END,
  cost_per_impression = CASE name
    WHEN 'basic' THEN 5.00      -- R5.00 per 1000 impressions
    WHEN 'standard' THEN 10.00  -- R10.00 per 1000 impressions
    WHEN 'premium' THEN 20.00   -- R20.00 per 1000 impressions
    WHEN 'featured' THEN 40.00  -- R40.00 per 1000 impressions
    ELSE 10.00
  END
WHERE name IN ('basic', 'standard', 'premium', 'featured');

