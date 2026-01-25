-- Migration: 014_subscription_plans
-- Description: Create subscription plans and user subscriptions tables for Paystack integration
-- Created: 2026-01-25

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SUBSCRIPTION_PLANS TABLE
-- Stores pricing plans for all user types
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Plan identification
    plan_code VARCHAR(50) NOT NULL, -- unique code like 'business_owner_pro', 'specialist_basic'
    user_type VARCHAR(50) NOT NULL, -- 'business_owner', 'specialist', 'food_enthusiast', 'normal_user'
    
    -- Display info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Pricing (in ZAR - South African Rand)
    monthly_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    yearly_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Features stored as JSONB (matches PlanFeatures interface)
    features JSONB DEFAULT '{}',
    
    -- Plan limits
    max_menu_items INTEGER DEFAULT 10,
    max_images INTEGER DEFAULT 5,
    max_locations INTEGER DEFAULT 1,
    advertising_credits DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Display options
    is_popular BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    
    -- Trial
    trial_days INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(tenant_id, plan_code)
);

-- ============================================
-- USER_SUBSCRIPTIONS TABLE
-- Tracks active subscriptions for each user
-- ============================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    
    -- Subscription status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, active, cancelled, expired, past_due, suspended
    
    -- Billing cycle
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, yearly
    
    -- Current pricing
    current_price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'ZAR',
    
    -- Dates
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    trial_end_date TIMESTAMP WITH TIME ZONE,
    next_billing_date TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Payment tracking
    payment_reference VARCHAR(100), -- Last successful payment reference
    paystack_customer_code VARCHAR(100), -- Paystack customer code for recurring billing
    paystack_subscription_code VARCHAR(100), -- Paystack subscription code
    
    -- Flags
    auto_renew BOOLEAN DEFAULT true,
    is_grandfathered BOOLEAN DEFAULT false, -- Legacy pricing protection
    
    -- Discount info
    discount_code VARCHAR(50),
    discount_percentage DECIMAL(5, 2),
    discount_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(user_id) -- One active subscription per user
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_subscription_plans_user_type ON subscription_plans(user_type);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tenant_active ON subscription_plans(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_next_billing ON user_subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_paystack ON user_subscriptions(paystack_subscription_code);

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER trigger_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_plans_updated_at();

CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER trigger_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_subscriptions_updated_at();

-- Comments
COMMENT ON TABLE subscription_plans IS 'Stores subscription pricing plans for all user types';
COMMENT ON TABLE user_subscriptions IS 'Tracks user subscription status and billing';

