-- Migration: 015_seed_subscription_plans
-- Description: Seed subscription plans with pricing for all user types
-- Created: 2026-01-25

-- ============================================
-- BUSINESS OWNER PLANS (Most Expensive)
-- ============================================

-- Business Owner - Basic (Free)
INSERT INTO subscription_plans (tenant_id, plan_code, user_type, name, description, monthly_price, yearly_price, max_menu_items, max_images, max_locations, advertising_credits, trial_days, is_popular, display_order, features)
SELECT t.id, 'business_owner_free', 'business_owner', 'Starter', 
'Get started with basic features', 0.00, 0.00, 10, 5, 1, 0, 0, false, 1,
'{"analyticsAccess": false, "prioritySupport": false, "customBranding": false, "advancedAnalytics": false, "multiLocation": false, "apiAccess": false, "whiteLabel": false, "dedicatedManager": false, "customIntegrations": false, "seoOptimization": false, "socialMediaIntegration": false, "onlineOrdering": false, "reservationSystem": true, "loyaltyProgram": false, "emailMarketing": false, "reviewManagement": true, "competitorAnalysis": false}'::jsonb
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT (tenant_id, plan_code) DO NOTHING;

-- Business Owner - Professional
INSERT INTO subscription_plans (tenant_id, plan_code, user_type, name, description, monthly_price, yearly_price, max_menu_items, max_images, max_locations, advertising_credits, trial_days, is_popular, display_order, features)
SELECT t.id, 'business_owner_pro', 'business_owner', 'Professional', 
'Perfect for growing restaurants', 799.00, 7990.00, 100, 50, 3, 200, 14, true, 2,
'{"analyticsAccess": true, "prioritySupport": true, "customBranding": true, "advancedAnalytics": true, "multiLocation": true, "apiAccess": false, "whiteLabel": false, "dedicatedManager": false, "customIntegrations": false, "seoOptimization": true, "socialMediaIntegration": true, "onlineOrdering": true, "reservationSystem": true, "loyaltyProgram": true, "emailMarketing": true, "reviewManagement": true, "competitorAnalysis": false}'::jsonb
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT (tenant_id, plan_code) DO NOTHING;

-- Business Owner - Enterprise
INSERT INTO subscription_plans (tenant_id, plan_code, user_type, name, description, monthly_price, yearly_price, max_menu_items, max_images, max_locations, advertising_credits, trial_days, is_popular, display_order, features)
SELECT t.id, 'business_owner_enterprise', 'business_owner', 'Enterprise', 
'Full-featured solution for multi-location businesses', 1999.00, 19990.00, -1, -1, -1, 1000, 30, false, 3,
'{"analyticsAccess": true, "prioritySupport": true, "customBranding": true, "advancedAnalytics": true, "multiLocation": true, "apiAccess": true, "whiteLabel": true, "dedicatedManager": true, "customIntegrations": true, "seoOptimization": true, "socialMediaIntegration": true, "onlineOrdering": true, "reservationSystem": true, "loyaltyProgram": true, "emailMarketing": true, "reviewManagement": true, "competitorAnalysis": true}'::jsonb
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT (tenant_id, plan_code) DO NOTHING;

-- ============================================
-- SPECIALIST PLANS (Mid-Tier)
-- ============================================

-- Specialist - Basic (Free)
INSERT INTO subscription_plans (tenant_id, plan_code, user_type, name, description, monthly_price, yearly_price, max_menu_items, max_images, max_locations, advertising_credits, trial_days, is_popular, display_order, features)
SELECT t.id, 'specialist_free', 'specialist', 'Basic', 
'Start your specialist profile', 0.00, 0.00, 5, 3, 1, 0, 0, false, 1,
'{"analyticsAccess": false, "prioritySupport": false, "customBranding": false, "advancedAnalytics": false, "multiLocation": false, "apiAccess": false, "whiteLabel": false, "dedicatedManager": false, "customIntegrations": false, "seoOptimization": false, "socialMediaIntegration": false, "onlineOrdering": false, "reservationSystem": true, "loyaltyProgram": false, "emailMarketing": false, "reviewManagement": true, "competitorAnalysis": false}'::jsonb
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT (tenant_id, plan_code) DO NOTHING;

-- Specialist - Professional
INSERT INTO subscription_plans (tenant_id, plan_code, user_type, name, description, monthly_price, yearly_price, max_menu_items, max_images, max_locations, advertising_credits, trial_days, is_popular, display_order, features)
SELECT t.id, 'specialist_pro', 'specialist', 'Professional', 
'Grow your private chef or catering business', 399.00, 3990.00, 50, 25, 2, 100, 14, true, 2,
'{"analyticsAccess": true, "prioritySupport": true, "customBranding": true, "advancedAnalytics": true, "multiLocation": true, "apiAccess": false, "whiteLabel": false, "dedicatedManager": false, "customIntegrations": false, "seoOptimization": true, "socialMediaIntegration": true, "onlineOrdering": false, "reservationSystem": true, "loyaltyProgram": false, "emailMarketing": true, "reviewManagement": true, "competitorAnalysis": false}'::jsonb
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT (tenant_id, plan_code) DO NOTHING;

-- Specialist - Premium
INSERT INTO subscription_plans (tenant_id, plan_code, user_type, name, description, monthly_price, yearly_price, max_menu_items, max_images, max_locations, advertising_credits, trial_days, is_popular, display_order, features)
SELECT t.id, 'specialist_premium', 'specialist', 'Premium', 
'Maximum visibility and features for top specialists', 799.00, 7990.00, -1, -1, 5, 500, 14, false, 3,
'{"analyticsAccess": true, "prioritySupport": true, "customBranding": true, "advancedAnalytics": true, "multiLocation": true, "apiAccess": true, "whiteLabel": false, "dedicatedManager": true, "customIntegrations": false, "seoOptimization": true, "socialMediaIntegration": true, "onlineOrdering": false, "reservationSystem": true, "loyaltyProgram": false, "emailMarketing": true, "reviewManagement": true, "competitorAnalysis": true}'::jsonb
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT (tenant_id, plan_code) DO NOTHING;

-- ============================================
-- FOOD ENTHUSIAST PLANS (Lower-Tier)
-- ============================================

-- Food Enthusiast - Free
INSERT INTO subscription_plans (tenant_id, plan_code, user_type, name, description, monthly_price, yearly_price, max_menu_items, max_images, max_locations, advertising_credits, trial_days, is_popular, display_order, features)
SELECT t.id, 'food_enthusiast_free', 'food_enthusiast', 'Explorer', 
'Discover restaurants and share your experiences', 0.00, 0.00, 0, 0, 0, 0, 0, false, 1,
'{"analyticsAccess": false, "prioritySupport": false, "customBranding": false, "advancedAnalytics": false, "multiLocation": false, "apiAccess": false, "whiteLabel": false, "dedicatedManager": false, "customIntegrations": false, "seoOptimization": false, "socialMediaIntegration": false, "onlineOrdering": false, "reservationSystem": false, "loyaltyProgram": false, "emailMarketing": false, "reviewManagement": false, "competitorAnalysis": false}'::jsonb
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT (tenant_id, plan_code) DO NOTHING;

-- Food Enthusiast - Premium
INSERT INTO subscription_plans (tenant_id, plan_code, user_type, name, description, monthly_price, yearly_price, max_menu_items, max_images, max_locations, advertising_credits, trial_days, is_popular, display_order, features)
SELECT t.id, 'food_enthusiast_premium', 'food_enthusiast', 'Gourmet', 
'Premium perks for serious foodies', 99.00, 990.00, 0, 0, 0, 0, 7, true, 2,
'{"analyticsAccess": false, "prioritySupport": true, "customBranding": false, "advancedAnalytics": false, "multiLocation": false, "apiAccess": false, "whiteLabel": false, "dedicatedManager": false, "customIntegrations": false, "seoOptimization": false, "socialMediaIntegration": true, "onlineOrdering": false, "reservationSystem": false, "loyaltyProgram": true, "emailMarketing": false, "reviewManagement": true, "competitorAnalysis": false}'::jsonb
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT (tenant_id, plan_code) DO NOTHING;

-- ============================================
-- NORMAL USER PLANS (Basic/Free)
-- ============================================

-- Normal User - Free (Default)
INSERT INTO subscription_plans (tenant_id, plan_code, user_type, name, description, monthly_price, yearly_price, max_menu_items, max_images, max_locations, advertising_credits, trial_days, is_popular, display_order, features)
SELECT t.id, 'normal_user_free', 'normal_user', 'Free', 
'Browse restaurants and make bookings', 0.00, 0.00, 0, 0, 0, 0, 0, true, 1,
'{"analyticsAccess": false, "prioritySupport": false, "customBranding": false, "advancedAnalytics": false, "multiLocation": false, "apiAccess": false, "whiteLabel": false, "dedicatedManager": false, "customIntegrations": false, "seoOptimization": false, "socialMediaIntegration": false, "onlineOrdering": false, "reservationSystem": false, "loyaltyProgram": false, "emailMarketing": false, "reviewManagement": false, "competitorAnalysis": false}'::jsonb
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT (tenant_id, plan_code) DO NOTHING;

-- Normal User - Plus
INSERT INTO subscription_plans (tenant_id, plan_code, user_type, name, description, monthly_price, yearly_price, max_menu_items, max_images, max_locations, advertising_credits, trial_days, is_popular, display_order, features)
SELECT t.id, 'normal_user_plus', 'normal_user', 'Plus', 
'Priority bookings and exclusive deals', 49.00, 490.00, 0, 0, 0, 0, 7, false, 2,
'{"analyticsAccess": false, "prioritySupport": true, "customBranding": false, "advancedAnalytics": false, "multiLocation": false, "apiAccess": false, "whiteLabel": false, "dedicatedManager": false, "customIntegrations": false, "seoOptimization": false, "socialMediaIntegration": false, "onlineOrdering": false, "reservationSystem": false, "loyaltyProgram": true, "emailMarketing": false, "reviewManagement": false, "competitorAnalysis": false}'::jsonb
FROM tenants t WHERE t.slug = 'itiyum' ON CONFLICT (tenant_id, plan_code) DO NOTHING;

