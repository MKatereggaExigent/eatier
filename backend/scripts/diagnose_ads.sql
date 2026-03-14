-- ============================================
-- AD CAMPAIGN DIAGNOSTICS
-- ============================================
-- This script helps diagnose why ad campaigns aren't showing metrics

-- 1. Check all campaigns and their current status
SELECT 
    id,
    title,
    status,
    is_active,
    start_date,
    end_date,
    total_budget,
    remaining_amount,
    impressions,
    clicks,
    spent,
    placement_id,
    tier_id,
    created_at
FROM ad_campaigns
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check which campaigns meet display criteria
SELECT 
    id,
    title,
    status,
    CASE 
        WHEN status != 'active' THEN '❌ Status not active'
        WHEN is_active != true THEN '❌ is_active is false'
        WHEN start_date > CURRENT_TIMESTAMP THEN '❌ Start date in future'
        WHEN end_date IS NOT NULL AND end_date < CURRENT_TIMESTAMP THEN '❌ End date passed'
        WHEN remaining_amount <= 0 THEN '❌ No remaining budget'
        WHEN placement_id IS NULL THEN '❌ No placement assigned'
        ELSE '✅ Should be displayed'
    END as display_status,
    start_date,
    end_date,
    remaining_amount,
    placement_id
FROM ad_campaigns
ORDER BY created_at DESC;

-- 3. Check available placements
SELECT 
    p.id,
    p.name,
    p.display_name,
    p.page_location,
    p.position,
    t.name as tier_name,
    t.display_name as tier_display_name,
    COUNT(ac.id) as active_campaigns
FROM ad_placements p
LEFT JOIN ad_space_tiers t ON p.tier_id = t.id
LEFT JOIN ad_campaigns ac ON p.id = ac.placement_id AND ac.status = 'active'
WHERE p.is_active = true
GROUP BY p.id, p.name, p.display_name, p.page_location, p.position, t.name, t.display_name
ORDER BY p.page_location, p.position;

-- 4. Check campaigns with their placement details
SELECT 
    ac.id,
    ac.title,
    ac.status,
    ac.impressions,
    ac.clicks,
    ac.spent,
    p.name as placement_name,
    p.page_location,
    p.position,
    t.name as tier_name
FROM ad_campaigns ac
LEFT JOIN ad_placements p ON ac.placement_id = p.id
LEFT JOIN ad_space_tiers t ON ac.tier_id = t.id
ORDER BY ac.created_at DESC
LIMIT 10;

-- 5. Find campaigns that should be visible but have 0 impressions
SELECT 
    ac.id,
    ac.title,
    ac.status,
    ac.impressions,
    ac.clicks,
    ac.start_date,
    ac.end_date,
    ac.remaining_amount,
    p.name as placement_name,
    p.page_location,
    p.position
FROM ad_campaigns ac
LEFT JOIN ad_placements p ON ac.placement_id = p.id
WHERE ac.status = 'active'
    AND ac.is_active = true
    AND ac.start_date <= CURRENT_TIMESTAMP
    AND (ac.end_date IS NULL OR ac.end_date >= CURRENT_TIMESTAMP)
    AND ac.remaining_amount > 0
    AND ac.impressions = 0
ORDER BY ac.created_at DESC;

-- ============================================
-- FIXES
-- ============================================

-- Fix 1: Activate all draft campaigns (CAREFUL - only run if you want to activate ALL drafts)
-- UPDATE ad_campaigns 
-- SET status = 'active', 
--     is_active = true,
--     start_date = CURRENT_TIMESTAMP,
--     end_date = NULL
-- WHERE status = 'draft';

-- Fix 2: Set placement for campaigns without one (assigns to first available placement)
-- UPDATE ad_campaigns ac
-- SET placement_id = (
--     SELECT id FROM ad_placements WHERE is_active = true LIMIT 1
-- )
-- WHERE placement_id IS NULL;

-- Fix 3: Reset remaining_amount to total_budget for campaigns with 0 remaining
-- UPDATE ad_campaigns
-- SET remaining_amount = total_budget
-- WHERE remaining_amount = 0 AND total_budget > 0;

-- Fix 4: Set default budget for campaigns with 0 budget
-- UPDATE ad_campaigns
-- SET total_budget = 100.00,
--     remaining_amount = 100.00
-- WHERE total_budget = 0 OR total_budget IS NULL;

-- ============================================
-- MANUAL FIX FOR SPECIFIC CAMPAIGNS
-- ============================================
-- Replace 'YOUR_CAMPAIGN_ID' with actual campaign ID

-- Activate a specific campaign
-- UPDATE ad_campaigns
-- SET status = 'active',
--     is_active = true,
--     start_date = CURRENT_TIMESTAMP,
--     end_date = CURRENT_TIMESTAMP + INTERVAL '30 days',
--     total_budget = 100.00,
--     remaining_amount = 100.00,
--     placement_id = (SELECT id FROM ad_placements WHERE name LIKE '%header%' LIMIT 1)
-- WHERE id = 'YOUR_CAMPAIGN_ID';

