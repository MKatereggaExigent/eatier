-- Migration 004: User Engagement Features
-- Creates tables for user preferences, orders, promotions, booking incentives, and social features
-- All tables include tenant_id for multi-tenancy and proper indexes for RBAC

-- ============================================================================
-- 1. USER PREFERENCES TABLE (for personalized recommendations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Cuisine preferences
    cuisine_preferences TEXT[] DEFAULT '{}',
    dietary_restrictions TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',

    -- Price and distance preferences
    price_range_min DECIMAL(10,2) DEFAULT 0,
    price_range_max DECIMAL(10,2) DEFAULT 1000,
    max_distance_km INTEGER DEFAULT 25,

    -- Location preferences
    preferred_location_lat DECIMAL(10,8),
    preferred_location_lng DECIMAL(11,8),
    preferred_city VARCHAR(100),
    preferred_country VARCHAR(100),

    -- Notification preferences
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    notification_frequency VARCHAR(20) DEFAULT 'daily', -- instant, daily, weekly

    -- Adventurousness level
    adventurousness VARCHAR(20) DEFAULT 'moderate', -- conservative, moderate, adventurous

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, tenant_id)
);

-- ============================================================================
-- 2. ORDERS TABLE (for order history and re-ordering)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Order details
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(30) DEFAULT 'pending', -- pending, confirmed, preparing, ready, delivered, cancelled
    order_type VARCHAR(20) DEFAULT 'delivery', -- delivery, pickup, dine_in

    -- Items (stored as JSONB for flexibility)
    items JSONB NOT NULL DEFAULT '[]',

    -- Pricing
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,

    -- Promotion/discount applied
    promotion_id UUID,
    promotion_code VARCHAR(50),

    -- Delivery information
    delivery_address JSONB,
    delivery_instructions TEXT,
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    actual_delivery_time TIMESTAMP WITH TIME ZONE,

    -- Payment
    payment_method VARCHAR(30),
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, refunded, failed
    payment_reference VARCHAR(100),

    -- Ratings
    order_rating INTEGER CHECK (order_rating >= 1 AND order_rating <= 5),
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    order_feedback TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. ORDER ITEMS TABLE (detailed order items for re-ordering)
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menus(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Item details (snapshot at time of order)
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,

    -- Customizations
    customizations JSONB DEFAULT '{}',
    special_instructions TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. MEMBER PROMOTIONS TABLE (exclusive deals for logged-in users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS member_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Promotion details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    promotion_code VARCHAR(50) UNIQUE,

    -- Discount configuration
    discount_type VARCHAR(20) NOT NULL, -- percentage, fixed_amount, free_delivery, cashback
    discount_value DECIMAL(10,2) NOT NULL,
    max_discount_amount DECIMAL(10,2),
    min_order_amount DECIMAL(10,2) DEFAULT 0,

    -- Applicability
    applicable_to VARCHAR(30) DEFAULT 'all', -- all, specific_businesses, specific_categories
    business_ids UUID[] DEFAULT '{}',
    category_ids UUID[] DEFAULT '{}',

    -- Usage limits
    max_total_uses INTEGER,
    max_uses_per_user INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,

    -- Validity
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Targeting
    target_user_types TEXT[] DEFAULT '{}', -- new_user, returning_user, vip
    min_orders_required INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. USER PROMOTION USAGE TABLE (track promotion usage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_promotion_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    promotion_id UUID NOT NULL REFERENCES member_promotions(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    discount_applied DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, promotion_id, order_id)
);

-- ============================================================================
-- 6. BOOKING INCENTIVES TABLE (discounts/cashback for bookings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS booking_incentives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Incentive details
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Incentive type and value
    incentive_type VARCHAR(30) NOT NULL, -- discount, cashback, commission_rebate, loyalty_points
    incentive_value DECIMAL(10,2), -- fixed amount
    incentive_percentage DECIMAL(5,2), -- percentage (use one or the other)

    -- Conditions
    min_booking_value DECIMAL(10,2) DEFAULT 0,
    min_party_size INTEGER DEFAULT 1,
    applicable_days TEXT[] DEFAULT '{}', -- empty = all days, or ['monday', 'tuesday', etc.]
    applicable_hours_start TIME,
    applicable_hours_end TIME,

    -- Applicability
    applicable_businesses UUID[] DEFAULT '{}', -- empty = all businesses

    -- Validity
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Limits
    max_total_uses INTEGER,
    current_uses INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT true,
    requires_login BOOLEAN DEFAULT true, -- incentive only for logged-in users

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 7. USER BOOKING INCENTIVES TABLE (track earned incentives)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_booking_incentives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    incentive_id UUID NOT NULL REFERENCES booking_incentives(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Amount earned/saved
    amount_value DECIMAL(10,2) NOT NULL,
    incentive_type VARCHAR(30) NOT NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, credited, expired, cancelled
    credited_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, booking_id, incentive_id)
);

-- ============================================================================
-- 8. USER WALLET/CREDITS TABLE (for cashback and loyalty points)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Balances
    cashback_balance DECIMAL(10,2) DEFAULT 0,
    loyalty_points INTEGER DEFAULT 0,

    -- Lifetime stats
    total_cashback_earned DECIMAL(10,2) DEFAULT 0,
    total_cashback_used DECIMAL(10,2) DEFAULT 0,
    total_points_earned INTEGER DEFAULT 0,
    total_points_used INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, tenant_id)
);

-- ============================================================================
-- 9. WALLET TRANSACTIONS TABLE (track all wallet activity)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES user_wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Transaction details
    transaction_type VARCHAR(30) NOT NULL, -- credit, debit
    amount_type VARCHAR(30) NOT NULL, -- cashback, loyalty_points
    amount DECIMAL(10,2) NOT NULL,

    -- Reference
    reference_type VARCHAR(30), -- order, booking, promotion, manual
    reference_id UUID,

    -- Balance after transaction
    balance_after DECIMAL(10,2) NOT NULL,

    description TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 10. USER FOLLOWS TABLE (social features)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(follower_id, following_id),
    CHECK(follower_id != following_id)
);

-- ============================================================================
-- 11. USER ACTIVITY FEED TABLE (social activity tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_activity_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Activity details
    activity_type VARCHAR(50) NOT NULL, -- review, favorite, booking, follow, order, share
    reference_type VARCHAR(50), -- business, review, user, menu_item
    reference_id UUID,

    -- Activity metadata
    metadata JSONB DEFAULT '{}',

    -- Visibility
    is_public BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 12. USER SHARES TABLE (track shared content)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- What was shared
    share_type VARCHAR(50) NOT NULL, -- business, review, menu_item, collection
    reference_id UUID NOT NULL,

    -- Where it was shared
    platform VARCHAR(50), -- facebook, twitter, whatsapp, email, copy_link

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_tenant_id ON user_preferences(tenant_id);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Member promotions indexes
CREATE INDEX IF NOT EXISTS idx_member_promotions_tenant_id ON member_promotions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_member_promotions_active ON member_promotions(is_active, valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_member_promotions_code ON member_promotions(promotion_code);

-- User promotion usage indexes
CREATE INDEX IF NOT EXISTS idx_user_promotion_usage_user_id ON user_promotion_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_promotion_usage_promotion_id ON user_promotion_usage(promotion_id);

-- Booking incentives indexes
CREATE INDEX IF NOT EXISTS idx_booking_incentives_tenant_id ON booking_incentives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_booking_incentives_active ON booking_incentives(is_active, valid_from, valid_to);

-- User booking incentives indexes
CREATE INDEX IF NOT EXISTS idx_user_booking_incentives_user_id ON user_booking_incentives(user_id);
CREATE INDEX IF NOT EXISTS idx_user_booking_incentives_booking_id ON user_booking_incentives(booking_id);

-- User wallets indexes
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);

-- Wallet transactions indexes
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

-- User follows indexes
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON user_follows(following_id);

-- User activity feed indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_feed_user_id ON user_activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_feed_created_at ON user_activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_feed_public ON user_activity_feed(is_public, created_at DESC);

-- User shares indexes
CREATE INDEX IF NOT EXISTS idx_user_shares_user_id ON user_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shares_reference ON user_shares(share_type, reference_id);
