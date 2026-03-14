-- ============================================
-- FIX AD CAMPAIGN TRACKING
-- ============================================
-- This script fixes common issues preventing ad campaigns from being displayed and tracked

BEGIN;

-- Step 1: Ensure all campaigns have a placement_id
-- Find campaigns without placement and assign them to a default placement
UPDATE ad_campaigns ac
SET placement_id = (
    SELECT p.id 
    FROM ad_placements p
    WHERE p.is_active = true 
    AND p.page_location = 'homepage'
    AND p.position = 'header'
    LIMIT 1
)
WHERE ac.placement_id IS NULL
AND EXISTS (
    SELECT 1 FROM ad_placements WHERE is_active = true
);

-- Step 2: Ensure campaigns have proper budget settings
UPDATE ad_campaigns
SET 
    total_budget = CASE 
        WHEN total_budget IS NULL OR total_budget = 0 THEN 100.00
        ELSE total_budget
    END,
    remaining_amount = CASE
        WHEN remaining_amount IS NULL OR remaining_amount = 0 THEN 
            CASE WHEN total_budget > 0 THEN total_budget ELSE 100.00 END
        ELSE remaining_amount
    END,
    daily_budget = CASE
        WHEN daily_budget IS NULL OR daily_budget = 0 THEN 10.00
        ELSE daily_budget
    END
WHERE status = 'active' OR status = 'draft';

-- Step 3: Set proper start and end dates
UPDATE ad_campaigns
SET 
    start_date = CASE
        WHEN start_date IS NULL OR start_date > CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP
        ELSE start_date
    END,
    end_date = CASE
        WHEN end_date IS NOT NULL AND end_date < CURRENT_TIMESTAMP THEN NULL
        ELSE end_date
    END
WHERE status = 'active';

-- Step 4: Activate campaigns that are ready
UPDATE ad_campaigns
SET 
    status = 'active',
    is_active = true
WHERE status = 'draft'
AND placement_id IS NOT NULL
AND total_budget > 0
AND remaining_amount > 0;

-- Step 5: Set default CPM and CPC if not set
UPDATE ad_campaigns
SET 
    cpm = CASE WHEN cpm IS NULL OR cpm = 0 THEN 2.00 ELSE cpm END,
    cpc = CASE WHEN cpc IS NULL OR cpc = 0 THEN 0.50 ELSE cpc END
WHERE status = 'active';

-- Step 6: Ensure tier_id is set (use basic tier as default)
UPDATE ad_campaigns ac
SET tier_id = (
    SELECT id FROM ad_space_tiers WHERE name = 'basic' LIMIT 1
)
WHERE tier_id IS NULL
AND EXISTS (SELECT 1 FROM ad_space_tiers WHERE name = 'basic');

-- Step 7: Fix any campaigns with negative remaining_amount
UPDATE ad_campaigns
SET remaining_amount = 0
WHERE remaining_amount < 0;

-- Step 8: Ensure spent amount doesn't exceed total budget
UPDATE ad_campaigns
SET spent = total_budget - remaining_amount
WHERE spent > total_budget
OR spent < 0
OR spent IS NULL;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check campaigns that should now be visible
SELECT 
    ac.id,
    ac.title,
    ac.status,
    ac.is_active,
    ac.start_date,
    ac.end_date,
    ac.total_budget,
    ac.remaining_amount,
    ac.spent,
    ac.impressions,
    ac.clicks,
    p.name as placement_name,
    p.page_location,
    p.position,
    t.name as tier_name,
    CASE 
        WHEN ac.status = 'active' 
        AND ac.is_active = true
        AND ac.start_date <= CURRENT_TIMESTAMP
        AND (ac.end_date IS NULL OR ac.end_date >= CURRENT_TIMESTAMP)
        AND ac.remaining_amount > 0
        AND ac.placement_id IS NOT NULL
        THEN '✅ VISIBLE'
        ELSE '❌ NOT VISIBLE'
    END as visibility_status
FROM ad_campaigns ac
LEFT JOIN ad_placements p ON ac.placement_id = p.id
LEFT JOIN ad_space_tiers t ON ac.tier_id = t.id
ORDER BY ac.created_at DESC;

-- Summary of changes
SELECT 
    COUNT(*) as total_campaigns,
    COUNT(*) FILTER (WHERE status = 'active') as active_campaigns,
    COUNT(*) FILTER (WHERE placement_id IS NOT NULL) as campaigns_with_placement,
    COUNT(*) FILTER (WHERE remaining_amount > 0) as campaigns_with_budget,
    COUNT(*) FILTER (
        WHERE status = 'active' 
        AND is_active = true
        AND start_date <= CURRENT_TIMESTAMP
        AND (end_date IS NULL OR end_date >= CURRENT_TIMESTAMP)
        AND remaining_amount > 0
        AND placement_id IS NOT NULL
    ) as visible_campaigns
FROM ad_campaigns;

