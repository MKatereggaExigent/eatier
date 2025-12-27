-- ============================================================================
-- Migration 005: Wallet Enhancements
-- Adds production-ready features to the wallet system
-- ============================================================================

-- Add referral tracking to user_wallets
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS referral_earnings DECIMAL(10,2) DEFAULT 0;

-- Add pending balance (for cashback that hasn't been confirmed yet)
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS pending_cashback DECIMAL(10,2) DEFAULT 0;
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS pending_points INTEGER DEFAULT 0;

-- Add wallet tier/status
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'bronze';
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS tier_progress INTEGER DEFAULT 0;

-- Add lifetime value tracking
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS lifetime_spend DECIMAL(12,2) DEFAULT 0;

-- Add status for wallet (active, frozen, etc.)
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Add expiry tracking for points
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS points_expiry_date TIMESTAMP WITH TIME ZONE;

-- Create referral_rewards table for tracking referral bonuses
CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Reward details
    referrer_reward DECIMAL(10,2) DEFAULT 5.00,
    referred_reward DECIMAL(10,2) DEFAULT 5.00,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, expired
    referrer_credited BOOLEAN DEFAULT FALSE,
    referred_credited BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(referrer_id, referred_id)
);

-- Create wallet_tiers configuration table
CREATE TABLE IF NOT EXISTS wallet_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    tier_name VARCHAR(30) NOT NULL,
    tier_order INTEGER NOT NULL,
    min_spend DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Benefits
    cashback_rate DECIMAL(5,2) DEFAULT 2.00, -- percentage
    points_multiplier DECIMAL(3,1) DEFAULT 1.0,
    free_delivery BOOLEAN DEFAULT FALSE,
    priority_support BOOLEAN DEFAULT FALSE,
    exclusive_deals BOOLEAN DEFAULT FALSE,
    
    -- Visual
    badge_color VARCHAR(20),
    badge_icon VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, tier_name)
);

-- Add metadata to wallet_transactions for richer transaction history
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed';
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_user_wallets_referral_code ON user_wallets(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_wallets_tier ON user_wallets(tier);
CREATE INDEX IF NOT EXISTS idx_user_wallets_status ON user_wallets(status);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON referral_rewards(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);

-- Insert default wallet tiers for the default tenant
INSERT INTO wallet_tiers (tenant_id, tier_name, tier_order, min_spend, cashback_rate, points_multiplier, free_delivery, priority_support, exclusive_deals, badge_color, badge_icon)
SELECT 
    t.id,
    tier.tier_name,
    tier.tier_order,
    tier.min_spend,
    tier.cashback_rate,
    tier.points_multiplier,
    tier.free_delivery,
    tier.priority_support,
    tier.exclusive_deals,
    tier.badge_color,
    tier.badge_icon
FROM tenants t
CROSS JOIN (VALUES 
    ('bronze', 1, 0, 2.00, 1.0, FALSE, FALSE, FALSE, '#CD7F32', '🥉'),
    ('silver', 2, 500, 3.00, 1.5, FALSE, FALSE, TRUE, '#C0C0C0', '🥈'),
    ('gold', 3, 2000, 5.00, 2.0, TRUE, TRUE, TRUE, '#FFD700', '🥇'),
    ('platinum', 4, 5000, 7.00, 3.0, TRUE, TRUE, TRUE, '#E5E4E2', '💎')
) AS tier(tier_name, tier_order, min_spend, cashback_rate, points_multiplier, free_delivery, priority_support, exclusive_deals, badge_color, badge_icon)
WHERE NOT EXISTS (
    SELECT 1 FROM wallet_tiers wt WHERE wt.tenant_id = t.id AND wt.tier_name = tier.tier_name
);

-- Generate referral codes for existing wallets that don't have one
UPDATE user_wallets 
SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 8));
        SELECT EXISTS(SELECT 1 FROM user_wallets WHERE referral_code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate referral code for new wallets
CREATE OR REPLACE FUNCTION set_wallet_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_wallet_referral_code ON user_wallets;
CREATE TRIGGER trigger_wallet_referral_code
    BEFORE INSERT ON user_wallets
    FOR EACH ROW
    EXECUTE FUNCTION set_wallet_referral_code();

COMMENT ON TABLE user_wallets IS 'User wallet for cashback, loyalty points, and rewards';
COMMENT ON TABLE wallet_transactions IS 'Transaction history for wallet credits and debits';
COMMENT ON TABLE referral_rewards IS 'Tracks referral bonuses between users';
COMMENT ON TABLE wallet_tiers IS 'Configuration for wallet membership tiers';

