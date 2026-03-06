-- Migration: 028_add_simple_plan_codes
-- Description: Add subscription plans with simple plan codes (basic, professional, enterprise) for Paystack integration
-- Created: 2026-03-06

-- ============================================
-- SIMPLE PLAN CODES FOR PAYSTACK INTEGRATION
-- ============================================
-- These plans use simple plan_code values that match what the frontend sends
-- (e.g., "basic", "professional", "enterprise" instead of "business_owner_pro")

-- Basic Plan
INSERT INTO subscription_plans (
  tenant_id, 
  plan_code, 
  user_type, 
  name, 
  description, 
  monthly_price, 
  yearly_price, 
  max_menu_items, 
  max_images, 
  max_locations, 
  advertising_credits, 
  trial_days, 
  is_popular, 
  display_order, 
  features
)
SELECT 
  t.id, 
  'basic', 
  'business_owner', 
  'Basic', 
  'Essential features for small businesses',
  29.99,
  299.99,
  50,
  20,
  1,
  50,
  7,
  true,
  2,
  '{"analyticsAccess": true, "prioritySupport": false, "customBranding": false, "advancedAnalytics": false, "multiLocation": false, "apiAccess": false, "whiteLabel": false, "dedicatedManager": false, "customIntegrations": false, "seoOptimization": true, "socialMediaIntegration": true, "onlineOrdering": true, "reservationSystem": true, "loyaltyProgram": true, "emailMarketing": false, "reviewManagement": true, "competitorAnalysis": false}'::jsonb
FROM tenants t 
WHERE t.slug = 'itiyum' 
ON CONFLICT (tenant_id, plan_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  max_menu_items = EXCLUDED.max_menu_items,
  max_images = EXCLUDED.max_images,
  features = EXCLUDED.features,
  updated_at = CURRENT_TIMESTAMP;

-- Professional Plan
INSERT INTO subscription_plans (
  tenant_id, 
  plan_code, 
  user_type, 
  name, 
  description, 
  monthly_price, 
  yearly_price, 
  max_menu_items, 
  max_images, 
  max_locations, 
  advertising_credits, 
  trial_days, 
  is_popular, 
  display_order, 
  features
)
SELECT 
  t.id, 
  'professional', 
  'business_owner', 
  'Professional', 
  'Advanced features for growing businesses',
  79.99,
  799.99,
  200,
  100,
  3,
  200,
  14,
  false,
  3,
  '{"analyticsAccess": true, "prioritySupport": true, "customBranding": true, "advancedAnalytics": true, "multiLocation": true, "apiAccess": false, "whiteLabel": false, "dedicatedManager": false, "customIntegrations": false, "seoOptimization": true, "socialMediaIntegration": true, "onlineOrdering": true, "reservationSystem": true, "loyaltyProgram": true, "emailMarketing": true, "reviewManagement": true, "competitorAnalysis": true}'::jsonb
FROM tenants t 
WHERE t.slug = 'itiyum' 
ON CONFLICT (tenant_id, plan_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  max_menu_items = EXCLUDED.max_menu_items,
  max_images = EXCLUDED.max_images,
  features = EXCLUDED.features,
  updated_at = CURRENT_TIMESTAMP;

-- Enterprise Plan
INSERT INTO subscription_plans (
  tenant_id, 
  plan_code, 
  user_type, 
  name, 
  description, 
  monthly_price, 
  yearly_price, 
  max_menu_items, 
  max_images, 
  max_locations, 
  advertising_credits, 
  trial_days, 
  is_popular, 
  display_order, 
  features
)
SELECT 
  t.id, 
  'enterprise', 
  'business_owner', 
  'Enterprise', 
  'Full features for large businesses',
  199.99,
  1999.99,
  -1,
  -1,
  -1,
  1000,
  30,
  false,
  4,
  '{"analyticsAccess": true, "prioritySupport": true, "customBranding": true, "advancedAnalytics": true, "multiLocation": true, "apiAccess": true, "whiteLabel": true, "dedicatedManager": true, "customIntegrations": true, "seoOptimization": true, "socialMediaIntegration": true, "onlineOrdering": true, "reservationSystem": true, "loyaltyProgram": true, "emailMarketing": true, "reviewManagement": true, "competitorAnalysis": true}'::jsonb
FROM tenants t 
WHERE t.slug = 'itiyum' 
ON CONFLICT (tenant_id, plan_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  max_menu_items = EXCLUDED.max_menu_items,
  max_images = EXCLUDED.max_images,
  features = EXCLUDED.features,
  updated_at = CURRENT_TIMESTAMP;

