-- Industry News Feed Migration
-- Adds tables for storing and displaying real-time industry news/trends

-- ============================================
-- INDUSTRY_NEWS_FEED TABLE
-- Stores curated industry news items
-- ============================================
CREATE TABLE IF NOT EXISTS industry_news_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Content fields
    title VARCHAR(500) NOT NULL,
    summary TEXT NOT NULL,
    content TEXT,
    source_url TEXT,
    source_name VARCHAR(200),
    image_url TEXT,
    
    -- Categorization
    category VARCHAR(100) NOT NULL,
    tags TEXT[],
    
    -- Engagement and display
    priority INTEGER DEFAULT 0, -- Higher = more prominent
    is_breaking BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Metrics
    view_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    
    -- Publishing
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDUSTRY_TRENDS TABLE
-- Stores aggregated industry trends and statistics
-- ============================================
CREATE TABLE IF NOT EXISTS industry_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Trend info
    trend_name VARCHAR(200) NOT NULL,
    trend_type VARCHAR(50) NOT NULL, -- 'statistic', 'prediction', 'growth', 'decline'
    description TEXT,
    
    -- Data
    current_value NUMERIC,
    previous_value NUMERIC,
    percentage_change NUMERIC,
    unit VARCHAR(50),
    
    -- Display
    icon VARCHAR(50),
    color VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Time period
    period_label VARCHAR(100), -- e.g., "Q1 2026", "January 2026"
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_news_feed_tenant ON industry_news_feed(tenant_id);
CREATE INDEX IF NOT EXISTS idx_news_feed_category ON industry_news_feed(category);
CREATE INDEX IF NOT EXISTS idx_news_feed_published ON industry_news_feed(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_feed_active ON industry_news_feed(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_news_feed_breaking ON industry_news_feed(is_breaking) WHERE is_breaking = true;

CREATE INDEX IF NOT EXISTS idx_trends_tenant ON industry_trends(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trends_type ON industry_trends(trend_type);
CREATE INDEX IF NOT EXISTS idx_trends_active ON industry_trends(is_active) WHERE is_active = true;

-- ============================================
-- ADD NEW BLOG CATEGORIES
-- ============================================
INSERT INTO blog_categories (tenant_id, name, slug, description, icon, sort_order)
SELECT t.id, 'Industry Trends', 'industry-trends', 'Latest trends shaping the food & hospitality industry', '📈', 6
FROM tenants t WHERE t.slug = 'itiyum'
ON CONFLICT (tenant_id, slug) DO NOTHING;

INSERT INTO blog_categories (tenant_id, name, slug, description, icon, sort_order)
SELECT t.id, 'Technology', 'technology', 'AI, automation and digital innovations in food service', '🤖', 7
FROM tenants t WHERE t.slug = 'itiyum'
ON CONFLICT (tenant_id, slug) DO NOTHING;

INSERT INTO blog_categories (tenant_id, name, slug, description, icon, sort_order)
SELECT t.id, 'Sustainability', 'sustainability', 'Eco-friendly practices and sustainable dining', '🌱', 8
FROM tenants t WHERE t.slug = 'itiyum'
ON CONFLICT (tenant_id, slug) DO NOTHING;

INSERT INTO blog_categories (tenant_id, name, slug, description, icon, sort_order)
SELECT t.id, 'Marketing', 'marketing', 'Digital marketing strategies for restaurants', '📱', 9
FROM tenants t WHERE t.slug = 'itiyum'
ON CONFLICT (tenant_id, slug) DO NOTHING;

INSERT INTO blog_categories (tenant_id, name, slug, description, icon, sort_order)
SELECT t.id, 'Business Growth', 'business-growth', 'Strategies for scaling your food business', '💼', 10
FROM tenants t WHERE t.slug = 'itiyum'
ON CONFLICT (tenant_id, slug) DO NOTHING;

