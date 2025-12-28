-- ============================================================================
-- Migration: 009_social_features.sql
-- Description: Create/ensure social feature tables exist
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USER FOLLOWS TABLE (social features)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT user_follows_unique UNIQUE (follower_id, following_id),
    CONSTRAINT user_follows_no_self_follow CHECK (follower_id != following_id)
);

-- ============================================================================
-- 2. USER ACTIVITY FEED TABLE (social activity tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_activity_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type VARCHAR(50) NOT NULL, -- 'review', 'favorite', 'booking', 'follow', 'share'
    reference_type VARCHAR(50), -- 'business', 'review', 'user', etc.
    reference_id UUID,
    metadata JSONB DEFAULT '{}',
    
    -- Visibility
    is_public BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. USER SHARES TABLE (track shared content)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- What was shared
    share_type VARCHAR(50) NOT NULL, -- 'business', 'review', 'menu_item', etc.
    reference_id UUID NOT NULL,
    
    -- Where it was shared
    platform VARCHAR(50), -- 'facebook', 'twitter', 'copy_link', etc.
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

-- User follows indexes
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_tenant ON user_follows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON user_follows(created_at DESC);

-- User activity feed indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_feed_user_id ON user_activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_feed_tenant ON user_activity_feed(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_feed_created_at ON user_activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_feed_public ON user_activity_feed(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_feed_type ON user_activity_feed(activity_type);

-- User shares indexes
CREATE INDEX IF NOT EXISTS idx_user_shares_user_id ON user_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shares_tenant ON user_shares(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_shares_reference ON user_shares(share_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_user_shares_created_at ON user_shares(created_at DESC);

-- ============================================================================
-- 5. SAMPLE DATA (optional - for testing)
-- ============================================================================
-- Uncomment to add sample data for testing

-- INSERT INTO user_activity_feed (user_id, tenant_id, activity_type, reference_type, metadata, is_public)
-- SELECT 
--     u.id,
--     u.tenant_id,
--     'review',
--     'business',
--     '{"preview": "Great food!", "business_name": "Sample Restaurant"}'::jsonb,
--     true
-- FROM users u
-- WHERE u.account_status = 'active'
-- LIMIT 5
-- ON CONFLICT DO NOTHING;

SELECT 'Social features migration completed successfully' as status;

