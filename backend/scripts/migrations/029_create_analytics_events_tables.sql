-- Migration: Create analytics and page view tracking tables
-- Version: 029
-- Description: Add tables for tracking user page views, clicks, and behavior analytics

-- ============================================
-- PAGE_VIEW_EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS page_view_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Page view details
    page_type VARCHAR(50) NOT NULL, -- 'profile', 'menu', 'gallery', 'reviews', etc.
    session_id VARCHAR(255),
    
    -- Device and browser info
    device_type VARCHAR(50), -- 'mobile', 'tablet', 'desktop'
    browser VARCHAR(100),
    os VARCHAR(100),
    
    -- Location info
    country VARCHAR(100),
    city VARCHAR(100),
    region VARCHAR(100),
    
    -- Referral and session info
    referrer TEXT,
    session_duration INTEGER DEFAULT 0, -- in seconds
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    CONSTRAINT page_view_events_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT page_view_events_business_fk FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT page_view_events_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_page_view_events_user_id ON page_view_events(user_id);
CREATE INDEX IF NOT EXISTS idx_page_view_events_business_id ON page_view_events(business_id);
CREATE INDEX IF NOT EXISTS idx_page_view_events_tenant_id ON page_view_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_page_view_events_page_type ON page_view_events(page_type);
CREATE INDEX IF NOT EXISTS idx_page_view_events_created_at ON page_view_events(created_at);
CREATE INDEX IF NOT EXISTS idx_page_view_events_user_business ON page_view_events(user_id, business_id);

-- ============================================
-- BUSINESS_ANALYTICS_DAILY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS business_analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    analytics_date DATE NOT NULL,
    
    -- View metrics
    total_views INTEGER DEFAULT 0,
    profile_views INTEGER DEFAULT 0,
    menu_views INTEGER DEFAULT 0,
    gallery_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    
    -- Engagement metrics
    contact_clicks INTEGER DEFAULT 0,
    direction_clicks INTEGER DEFAULT 0,
    website_clicks INTEGER DEFAULT 0,
    phone_clicks INTEGER DEFAULT 0,
    
    -- Device breakdown
    mobile_views INTEGER DEFAULT 0,
    desktop_views INTEGER DEFAULT 0,
    tablet_views INTEGER DEFAULT 0,
    
    -- Traffic sources
    direct_traffic INTEGER DEFAULT 0,
    search_traffic INTEGER DEFAULT 0,
    social_traffic INTEGER DEFAULT 0,
    referral_traffic INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    UNIQUE(business_id, analytics_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_analytics_daily_business_id ON business_analytics_daily(business_id);
CREATE INDEX IF NOT EXISTS idx_business_analytics_daily_tenant_id ON business_analytics_daily(tenant_id);
CREATE INDEX IF NOT EXISTS idx_business_analytics_daily_date ON business_analytics_daily(analytics_date);

-- ============================================
-- ANALYTICS_EVENTS TABLE (for general event tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    
    -- Event details
    event_type VARCHAR(100) NOT NULL, -- 'page_view', 'click', 'search', 'booking', 'review', etc.
    event_category VARCHAR(100), -- 'engagement', 'conversion', 'navigation', etc.
    event_action VARCHAR(100), -- 'view_profile', 'click_contact', 'submit_review', etc.
    event_label VARCHAR(255),
    event_value DECIMAL(10, 2),
    
    -- Context
    page_url TEXT,
    referrer_url TEXT,
    session_id VARCHAR(255),
    
    -- Device info
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    
    -- Location
    country VARCHAR(100),
    city VARCHAR(100),
    
    -- Additional data
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_business_id ON analytics_events(business_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_id ON analytics_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);

