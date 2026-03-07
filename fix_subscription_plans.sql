-- Fix Subscription Plans for Paystack Integration
-- This script ensures subscription plans exist with the correct IDs

-- First, check if subscription_plans table exists
-- Run this on the server:
-- docker exec -it itiyum-backend-prod psql -U itiyum_prod -d itiyum_production -f fix_subscription_plans.sql

-- Get the tenant ID for 'itiyum'
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Get tenant ID
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'itiyum' LIMIT 1;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant "itiyum" not found. Please create tenant first.';
  END IF;

  RAISE NOTICE 'Using tenant ID: %', v_tenant_id;

  -- Delete existing plans to avoid conflicts
  DELETE FROM subscription_plans WHERE tenant_id = v_tenant_id;

  -- Insert subscription plans with string IDs (not UUIDs)
  -- This matches what the frontend is sending
  INSERT INTO subscription_plans (
    tenant_id,
    id,
    name,
    description,
    monthly_price,
    yearly_price,
    features,
    is_active,
    created_at,
    updated_at
  ) VALUES
    -- Free Plan
    (
      v_tenant_id,
      'free',
      'Free',
      'Basic features for getting started',
      0.00,
      0.00,
      '{"max_menu_items": 10, "max_photos": 5, "analytics": false, "priority_support": false}',
      true,
      NOW(),
      NOW()
    ),
    -- Basic Plan
    (
      v_tenant_id,
      'basic',
      'Basic',
      'Essential features for small businesses',
      29.99,
      299.99,
      '{"max_menu_items": 50, "max_photos": 20, "analytics": true, "priority_support": false}',
      true,
      NOW(),
      NOW()
    ),
    -- Professional Plan
    (
      v_tenant_id,
      'professional',
      'Professional',
      'Advanced features for growing businesses',
      79.99,
      799.99,
      '{"max_menu_items": 200, "max_photos": 100, "analytics": true, "priority_support": true}',
      true,
      NOW(),
      NOW()
    ),
    -- Enterprise Plan
    (
      v_tenant_id,
      'enterprise',
      'Enterprise',
      'Full features for large businesses',
      199.99,
      1999.99,
      '{"max_menu_items": -1, "max_photos": -1, "analytics": true, "priority_support": true, "custom_domain": true}',
      true,
      NOW(),
      NOW()
    )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    monthly_price = EXCLUDED.monthly_price,
    yearly_price = EXCLUDED.yearly_price,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

  RAISE NOTICE 'Subscription plans created/updated successfully!';
END $$;

-- Verify the plans were created
SELECT id, name, monthly_price, yearly_price, is_active 
FROM subscription_plans 
ORDER BY monthly_price;

