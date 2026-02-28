-- Itiyum Platform Database Schema with RBAC and Multi-tenancy
-- This creates all core tables needed for the platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for fresh install)
DROP MATERIALIZED VIEW IF EXISTS admin_statistics CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS review_photos CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS menu_categories CASCADE;
DROP TABLE IF EXISTS menus CASCADE;
DROP TABLE IF EXISTS ad_campaign_daily_stats CASCADE;
DROP TABLE IF EXISTS ad_impressions CASCADE;
DROP TABLE IF EXISTS ad_clicks CASCADE;
DROP TABLE IF EXISTS ad_campaigns CASCADE;
DROP TABLE IF EXISTS ad_placements CASCADE;
DROP TABLE IF EXISTS ad_space_tiers CASCADE;
DROP TABLE IF EXISTS community_post_likes CASCADE;
DROP TABLE IF EXISTS community_post_comments CASCADE;
DROP TABLE IF EXISTS community_posts CASCADE;
DROP TABLE IF EXISTS trending_topics CASCADE;
DROP TABLE IF EXISTS chef_follows CASCADE;
DROP TABLE IF EXISTS specialist_availability CASCADE;
DROP TABLE IF EXISTS specialist_services CASCADE;
DROP TABLE IF EXISTS specialist_profiles CASCADE;
DROP TABLE IF EXISTS business_hours CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- ============================================
-- TENANTS TABLE (Multi-tenancy support)
-- ============================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    domain VARCHAR(255),
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default platform tenant
INSERT INTO tenants (name, slug, status, settings) VALUES 
('Itiyum Platform', 'itiyum', 'active', '{
    "allowRegistrations": true,
    "maintenanceMode": false,
    "passwordMinLength": 8,
    "passwordRequireUppercase": true,
    "passwordRequireLowercase": true,
    "passwordRequireNumber": true,
    "passwordRequireSpecial": true,
    "sessionTimeout": 60,
    "maxLoginAttempts": 5,
    "lockoutDuration": 15
}'::jsonb);

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    avatar_url TEXT,
    profile_photo TEXT,
    bio TEXT,
    country VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20),
    role VARCHAR(50) DEFAULT 'normal_user',
    is_chef BOOLEAN DEFAULT false,
    account_status VARCHAR(50) DEFAULT 'active',
    status VARCHAR(50) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT false,
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    last_login TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ROLES TABLE (RBAC)
-- ============================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PERMISSIONS TABLE (RBAC)
-- ============================================
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ROLE_PERMISSIONS TABLE (RBAC)
-- ============================================
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- ============================================
-- USER_ROLES TABLE (RBAC)
-- ============================================
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

-- ============================================
-- BUSINESSES TABLE
-- ============================================
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) DEFAULT 'restaurant',
    description TEXT,
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(500),
    address TEXT,
    formatted_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    place_id VARCHAR(255),
    logo_url TEXT,
    cover_image_url TEXT,
    background_image TEXT,
    profile_photos JSONB DEFAULT '[]',
    cuisine_types TEXT[],
    price_range VARCHAR(10),
    average_rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    account_status VARCHAR(50) DEFAULT 'active',
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    sustainability_ethos TEXT,
    opens_at TIME,
    closes_at TIME,
    facilities JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- BUSINESS_HOURS TABLE
-- ============================================
CREATE TABLE business_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SPECIALIST_PROFILES TABLE
-- ============================================
CREATE TABLE specialist_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    specialty VARCHAR(255),
    experience_years INTEGER,
    hourly_rate DECIMAL(10, 2),
    certifications TEXT[],
    portfolio_urls TEXT[],
    is_available BOOLEAN DEFAULT true,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SPECIALIST_SERVICES TABLE
-- ============================================
CREATE TABLE specialist_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    specialist_id UUID REFERENCES users(id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    service_type VARCHAR(100),
    description TEXT,
    base_price DECIMAL(10, 2) DEFAULT 0,
    price_per_person DECIMAL(10, 2),
    min_guests INTEGER DEFAULT 1,
    max_guests INTEGER,
    duration_hours DECIMAL(4, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SPECIALIST_AVAILABILITY TABLE
-- ============================================
CREATE TABLE specialist_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    specialist_id UUID REFERENCES specialist_profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CHEF_FOLLOWS TABLE
-- ============================================
CREATE TABLE chef_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chef_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, chef_id)
);

-- ============================================
-- MENUS TABLE (menu items with prices)
-- ============================================
CREATE TABLE menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    background_image TEXT,
    menu_type VARCHAR(50) DEFAULT 'regular',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_menus_tenant_id ON menus(tenant_id);
CREATE INDEX idx_menus_business_id ON menus(business_id);
CREATE INDEX idx_menus_category ON menus(category);

-- ============================================
-- MENU_CATEGORIES TABLE
-- ============================================
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_id UUID REFERENCES menus(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- MENU_ITEMS TABLE
-- ============================================
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES menu_categories(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2),
    image_url TEXT,
    is_vegetarian BOOLEAN DEFAULT false,
    is_vegan BOOLEAN DEFAULT false,
    is_gluten_free BOOLEAN DEFAULT false,
    is_spicy BOOLEAN DEFAULT false,
    calories INTEGER,
    allergens TEXT[],
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- BOOKINGS TABLE
-- ============================================
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    specialist_id UUID REFERENCES specialist_profiles(id) ON DELETE SET NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    party_size INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending',
    special_requests TEXT,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    confirmation_code VARCHAR(50),
    notes TEXT,
    -- Additional booking fields
    table_preferences VARCHAR(255),
    occasion VARCHAR(100),
    booking_tier VARCHAR(50),
    tier_price DECIMAL(10, 2) DEFAULT 0,
    booking_reference VARCHAR(50),
    total_amount DECIMAL(10, 2) DEFAULT 0,
    -- Cancellation fields
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- REVIEWS TABLE
-- ============================================
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    food_rating INTEGER CHECK (food_rating BETWEEN 1 AND 5),
    service_rating INTEGER CHECK (service_rating BETWEEN 1 AND 5),
    ambiance_rating INTEGER CHECK (ambiance_rating BETWEEN 1 AND 5),
    value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),
    title VARCHAR(255),
    content TEXT,
    comment TEXT,
    images JSONB DEFAULT '[]',
    visit_date DATE,
    is_verified BOOLEAN DEFAULT false,
    is_verified_visit BOOLEAN DEFAULT false,
    would_recommend BOOLEAN DEFAULT true,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    response_from_owner TEXT,
    response_date TIMESTAMP WITH TIME ZONE,
    external_id VARCHAR(255),
    source VARCHAR(50) DEFAULT 'platform',
    status VARCHAR(50) DEFAULT 'published',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- REVIEW_PHOTOS TABLE
-- ============================================
CREATE TABLE review_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COMMUNITY_POSTS TABLE
-- ============================================
CREATE TABLE community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255),
    content TEXT NOT NULL,
    post_type VARCHAR(50) DEFAULT 'general',
    image_urls TEXT[],
    images JSONB DEFAULT '[]',
    video_url TEXT,
    tags TEXT[],
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'published',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COMMUNITY_POST_LIKES TABLE
-- ============================================
CREATE TABLE community_post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

-- ============================================
-- COMMUNITY_POST_COMMENTS TABLE
-- ============================================
CREATE TABLE community_post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES community_post_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TRENDING_TOPICS TABLE
-- ============================================
CREATE TABLE trending_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    hashtag VARCHAR(255),
    post_count INTEGER DEFAULT 0,
    trend_score DECIMAL(10, 2) DEFAULT 0,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- AD_SPACE_TIERS TABLE (for tier-based ad system)
-- ============================================
CREATE TABLE ad_space_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price_daily DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
    base_price_weekly DECIMAL(10, 2) NOT NULL DEFAULT 30.00,
    base_price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
    currency VARCHAR(10) DEFAULT 'USD',
    max_width INTEGER DEFAULT 728,
    max_height INTEGER DEFAULT 90,
    supports_video BOOLEAN DEFAULT false,
    supports_animation BOOLEAN DEFAULT false,
    rotation_speed_seconds INTEGER DEFAULT 10,
    priority_weight INTEGER DEFAULT 50,
    max_ads_per_rotation INTEGER DEFAULT 5,
    features JSONB DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default tiers
INSERT INTO ad_space_tiers (name, display_name, description, base_price_daily, base_price_weekly, base_price_monthly, priority_weight, rotation_speed_seconds, supports_video, supports_animation, max_width, max_height, sort_order, features) VALUES
('basic', 'Basic', 'Standard ad placement with basic visibility', 5.00, 30.00, 100.00, 25, 15, false, false, 300, 250, 1, '["Standard visibility", "Basic analytics"]'),
('standard', 'Standard', 'Enhanced visibility with better rotation', 15.00, 90.00, 300.00, 50, 10, false, true, 728, 90, 2, '["Enhanced visibility", "Detailed analytics", "Animation support"]'),
('premium', 'Premium', 'Premium placement with high visibility', 35.00, 210.00, 700.00, 75, 7, true, true, 970, 250, 3, '["High visibility", "Premium analytics", "Video support", "Animation support"]'),
('featured', 'Featured', 'Top-tier featured placement', 75.00, 450.00, 1500.00, 100, 5, true, true, 1920, 500, 4, '["Maximum visibility", "Full analytics suite", "Video support", "Animation support", "Priority rotation"]');

-- ============================================
-- AD_PLACEMENTS TABLE
-- ============================================
CREATE TABLE ad_placements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier_id UUID REFERENCES ad_space_tiers(id) ON DELETE CASCADE,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    page_location VARCHAR(100) NOT NULL,
    position VARCHAR(100),
    width INTEGER NOT NULL DEFAULT 300,
    height INTEGER NOT NULL DEFAULT 250,
    custom_price_daily DECIMAL(10, 2),
    custom_price_weekly DECIMAL(10, 2),
    custom_price_monthly DECIMAL(10, 2),
    rotation_interval_ms INTEGER DEFAULT 10000,
    max_concurrent_ads INTEGER DEFAULT 3,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default placements for each tier
-- Header banner placements (all tiers)
INSERT INTO ad_placements (tier_id, name, display_name, description, page_location, position, width, height, sort_order)
SELECT id, 'header_banner_' || name, 'Header Banner (' || display_name || ')', 'Top of page banner', 'homepage', 'header', 728, 90, 1
FROM ad_space_tiers;

-- Sidebar placements (all tiers)
INSERT INTO ad_placements (tier_id, name, display_name, description, page_location, position, width, height, sort_order)
SELECT id, 'sidebar_' || name, 'Sidebar (' || display_name || ')', 'Sidebar advertisement', 'all_pages', 'sidebar', 300, 250, 2
FROM ad_space_tiers;

-- Restaurant list placements (all tiers)
INSERT INTO ad_placements (tier_id, name, display_name, description, page_location, position, width, height, sort_order)
SELECT id, 'restaurant_list_' || name, 'Restaurant List (' || display_name || ')', 'In restaurant listings', 'restaurant_list', 'inline', 468, 60, 3
FROM ad_space_tiers;

-- Homepage banner placements (all tiers)
INSERT INTO ad_placements (tier_id, name, display_name, description, page_location, position, width, height, sort_order)
SELECT id, 'homepage_banner_' || name, 'Homepage Banner (' || display_name || ')', 'Homepage hero banner', 'homepage', 'hero', 1200, 400, 4
FROM ad_space_tiers;

-- Footer banner placements (all tiers)
INSERT INTO ad_placements (tier_id, name, display_name, description, page_location, position, width, height, sort_order)
SELECT id, 'footer_banner_' || name, 'Footer Banner (' || display_name || ')', 'Footer advertisement', 'all_pages', 'footer', 728, 90, 5
FROM ad_space_tiers;

-- Inline content placements (all tiers)
INSERT INTO ad_placements (tier_id, name, display_name, description, page_location, position, width, height, sort_order)
SELECT id, 'inline_content_' || name, 'Inline Content (' || display_name || ')', 'In-content advertisement', 'all_pages', 'inline', 600, 200, 6
FROM ad_space_tiers;

-- Community feed placements (all tiers)
INSERT INTO ad_placements (tier_id, name, display_name, description, page_location, position, width, height, sort_order)
SELECT id, 'community_feed_' || name, 'Community Feed (' || display_name || ')', 'Community feed advertisement', 'community', 'feed', 500, 300, 7
FROM ad_space_tiers;

-- Specialist list placements (all tiers)
INSERT INTO ad_placements (tier_id, name, display_name, description, page_location, position, width, height, sort_order)
SELECT id, 'specialist_list_' || name, 'Specialist List (' || display_name || ')', 'Specialist listings advertisement', 'specialists', 'inline', 468, 60, 8
FROM ad_space_tiers;

-- ============================================
-- AD_CAMPAIGNS TABLE
-- ============================================
CREATE TABLE ad_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tier_id UUID REFERENCES ad_space_tiers(id) ON DELETE SET NULL,
    placement_id UUID REFERENCES ad_placements(id) ON DELETE SET NULL,
    name VARCHAR(255) DEFAULT 'Ad Campaign',
    title VARCHAR(255),
    description TEXT,
    headline VARCHAR(255),
    body_text TEXT,
    type VARCHAR(50) DEFAULT 'banner',
    campaign_type VARCHAR(50) DEFAULT 'banner',
    placement VARCHAR(100),
    target_audience JSONB DEFAULT '{}',
    target_regions TEXT[],
    target_locations TEXT[],
    target_cities TEXT[],
    budget DECIMAL(10, 2),
    total_budget DECIMAL(10, 2),
    daily_budget DECIMAL(10, 2),
    remaining_amount DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    spent DECIMAL(10, 2) DEFAULT 0,
    cpc DECIMAL(10, 4),
    cpm DECIMAL(10, 4),
    image_url TEXT,
    media_urls TEXT[],
    video_urls TEXT[],
    link_url TEXT,
    call_to_action VARCHAR(100),
    cta_type VARCHAR(50),
    cta_url TEXT,
    cta_phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'draft',
    priority_score INTEGER DEFAULT 50,
    is_approved BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    payment_required BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- AD_CAMPAIGN_DAILY_STATS TABLE
-- ============================================
CREATE TABLE ad_campaign_daily_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    spend DECIMAL(10, 2) DEFAULT 0,
    ctr DECIMAL(5, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, stat_date)
);

-- ============================================
-- AD_IMPRESSIONS TABLE
-- ============================================
CREATE TABLE ad_impressions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    placement VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- AD_CLICKS TABLE
-- ============================================
CREATE TABLE ad_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
    impression_id UUID REFERENCES ad_impressions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255),
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- FAVORITES TABLE
-- ============================================
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    collection_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, business_id)
);

-- ============================================
-- FAVORITE_COLLECTIONS TABLE
-- ============================================
CREATE TABLE favorite_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CONTACT_INQUIRIES TABLE
-- ============================================
CREATE TABLE contact_inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- AUTO_RESPONSE_TEMPLATES TABLE
-- ============================================
CREATE TABLE auto_response_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    trigger_type VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CHAT_HISTORY TABLE
-- ============================================
CREATE TABLE chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INTEGRATION_CONNECTIONS TABLE
-- ============================================
CREATE TABLE integration_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    credentials JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SYNC_HISTORY TABLE
-- ============================================
CREATE TABLE sync_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID REFERENCES integration_connections(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    sync_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    records_synced INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- SPECIALIST_BOOKINGS TABLE
-- ============================================
CREATE TABLE specialist_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    specialist_id UUID REFERENCES specialist_profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    service_id UUID REFERENCES specialist_services(id) ON DELETE SET NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SPECIALIST_EARNINGS TABLE
-- ============================================
CREATE TABLE specialist_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    specialist_id UUID REFERENCES specialist_profiles(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES specialist_bookings(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) DEFAULT 0,
    net_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SPECIALIST_REVIEWS TABLE
-- ============================================
CREATE TABLE specialist_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    specialist_id UUID REFERENCES specialist_profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES specialist_bookings(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- BUSINESS_ANALYTICS TABLE
-- ============================================
CREATE TABLE business_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    period_type VARCHAR(20) DEFAULT 'daily',
    total_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    menu_views INTEGER DEFAULT 0,
    profile_views INTEGER DEFAULT 0,
    contact_clicks INTEGER DEFAULT 0,
    qr_scans INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    average_session_duration INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5, 2) DEFAULT 0,
    return_visitor_rate DECIMAL(5, 2) DEFAULT 0,
    popular_menu_items JSONB DEFAULT '[]',
    peak_hours JSONB DEFAULT '[]',
    top_countries JSONB DEFAULT '[]',
    device_types JSONB DEFAULT '{}',
    referral_sources JSONB DEFAULT '[]',
    views_growth DECIMAL(5, 2) DEFAULT 0,
    engagement_growth DECIMAL(5, 2) DEFAULT 0,
    customer_growth DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_id, date, period_type)
);

-- ============================================
-- BUSINESS_SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE business_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    plan VARCHAR(50) DEFAULT 'free',
    status VARCHAR(50) DEFAULT 'active',
    monthly_price DECIMAL(10, 2) DEFAULT 0,
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    features JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ADMIN_STATISTICS MATERIALIZED VIEW
-- ============================================
CREATE MATERIALIZED VIEW admin_statistics AS
SELECT
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM businesses) as total_businesses,
    (SELECT COUNT(*) FROM reviews) as total_reviews,
    (SELECT COUNT(*) FROM bookings) as total_bookings,
    (SELECT COUNT(*) FROM community_posts) as total_posts,
    (SELECT COUNT(*) FROM ad_campaigns WHERE status = 'active') as active_campaigns,
    CURRENT_TIMESTAMP as last_updated;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_businesses_tenant_id ON businesses(tenant_id);
CREATE INDEX idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX idx_reviews_business_id ON reviews(business_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_bookings_business_id ON bookings(business_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX idx_ad_campaigns_business_id ON ad_campaigns(business_id);
CREATE INDEX idx_ad_campaigns_status ON ad_campaigns(status);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- New table indexes
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_business_id ON favorites(business_id);
CREATE INDEX idx_favorites_tenant_id ON favorites(tenant_id);
CREATE INDEX idx_favorite_collections_user_id ON favorite_collections(user_id);
CREATE INDEX idx_favorite_collections_tenant_id ON favorite_collections(tenant_id);
CREATE INDEX idx_contact_inquiries_business_id ON contact_inquiries(business_id);
CREATE INDEX idx_contact_inquiries_status ON contact_inquiries(status);
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX idx_integration_connections_business_id ON integration_connections(business_id);
CREATE INDEX idx_sync_history_connection_id ON sync_history(connection_id);
CREATE INDEX idx_specialist_bookings_specialist_id ON specialist_bookings(specialist_id);
CREATE INDEX idx_specialist_bookings_client_id ON specialist_bookings(client_id);
CREATE INDEX idx_specialist_earnings_specialist_id ON specialist_earnings(specialist_id);
CREATE INDEX idx_specialist_reviews_specialist_id ON specialist_reviews(specialist_id);
CREATE INDEX idx_business_analytics_business_id ON business_analytics(business_id);
CREATE INDEX idx_business_analytics_date ON business_analytics(date);
CREATE INDEX idx_business_subscriptions_business_id ON business_subscriptions(business_id);
CREATE INDEX idx_business_subscriptions_status ON business_subscriptions(status);
