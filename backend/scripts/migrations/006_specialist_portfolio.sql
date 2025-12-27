-- Migration: 006_specialist_portfolio.sql
-- Description: Create specialist portfolio tables (images, videos, testimonials, settings)
-- Author: System
-- Date: 2024-01-20

-- ============================================
-- SPECIALIST PORTFOLIO IMAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS specialist_portfolio_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    specialist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    event_type VARCHAR(100),
    is_main BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SPECIALIST PORTFOLIO VIDEOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS specialist_portfolio_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    specialist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_seconds INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SPECIALIST TESTIMONIALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS specialist_testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    specialist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES users(id) ON DELETE SET NULL, -- The user who submitted the testimonial
    booking_id UUID REFERENCES specialist_bookings(id) ON DELETE SET NULL, -- The completed booking this testimonial is for
    client_name VARCHAR(255) NOT NULL,
    client_avatar_url VARCHAR(500),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5) DEFAULT 5,
    review TEXT NOT NULL,
    event_type VARCHAR(100),
    event_date DATE,
    is_public BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false, -- Auto-verified if linked to a real booking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SPECIALIST PORTFOLIO SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS specialist_portfolio_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    specialist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    portfolio_title VARCHAR(255),
    portfolio_description TEXT,
    show_contact_info BOOLEAN DEFAULT true,
    allow_downloads BOOLEAN DEFAULT false,
    watermark_images BOOLEAN DEFAULT true,
    theme VARCHAR(50) DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(specialist_id, tenant_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_portfolio_images_specialist ON specialist_portfolio_images(specialist_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_images_tenant ON specialist_portfolio_images(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_images_category ON specialist_portfolio_images(category);

CREATE INDEX IF NOT EXISTS idx_portfolio_videos_specialist ON specialist_portfolio_videos(specialist_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_videos_tenant ON specialist_portfolio_videos(tenant_id);

CREATE INDEX IF NOT EXISTS idx_testimonials_specialist ON specialist_testimonials(specialist_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_tenant ON specialist_testimonials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_public ON specialist_testimonials(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON specialist_testimonials(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_portfolio_settings_specialist ON specialist_portfolio_settings(specialist_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE specialist_portfolio_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialist_portfolio_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialist_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialist_portfolio_settings ENABLE ROW LEVEL SECURITY;

-- Migration complete message
DO $$
BEGIN
    RAISE NOTICE 'Migration 006_specialist_portfolio.sql completed successfully';
END $$;

