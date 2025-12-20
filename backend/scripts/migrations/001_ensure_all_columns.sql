-- Migration 001: Ensure all columns exist for all tables
-- This migration adds any missing columns that the backend routes expect
-- Run this after schema-with-rbac-multitenancy.sql to fix any mismatches

-- ============================================
-- USERS TABLE COLUMNS
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_chef BOOLEAN DEFAULT false;

-- ============================================
-- BUSINESSES TABLE COLUMNS
-- ============================================
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS background_image TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS profile_photos TEXT[];
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS sustainability_ethos TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS opens_at TIME;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS closes_at TIME;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS facilities JSONB DEFAULT '[]';

-- ============================================
-- MENUS TABLE COLUMNS
-- ============================================
ALTER TABLE menus ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE menus ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE menus ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS background_image TEXT;

-- Update name to title if title is null
UPDATE menus SET title = name WHERE title IS NULL AND name IS NOT NULL;

-- ============================================
-- BOOKINGS TABLE COLUMNS
-- ============================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS table_preferences TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS occasion VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_tier VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tier_price DECIMAL(10, 2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT 0;

-- ============================================
-- AD_CAMPAIGNS TABLE COLUMNS
-- ============================================
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS total_budget DECIMAL(10, 2);
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(10, 2);
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS payment_required BOOLEAN DEFAULT true;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'banner';

-- ============================================
-- REVIEWS TABLE COLUMNS
-- ============================================
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS images TEXT[];
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_verified_visit BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS would_recommend BOOLEAN;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS not_helpful_count INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS response_from_owner TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS response_date TIMESTAMP WITH TIME ZONE;

-- ============================================
-- COMMUNITY_POSTS TABLE COLUMNS
-- ============================================
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS images TEXT[];
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ============================================
-- FAVORITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, business_id)
);

-- ============================================
-- FAVORITE_COLLECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS favorite_collections (
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
CREATE TABLE IF NOT EXISTS contact_inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    inquiry_type VARCHAR(50) DEFAULT 'general',
    status VARCHAR(50) DEFAULT 'new',
    priority VARCHAR(20) DEFAULT 'normal',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

