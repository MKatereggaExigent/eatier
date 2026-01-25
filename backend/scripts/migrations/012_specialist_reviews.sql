-- ============================================
-- SPECIALIST REVIEWS TABLE
-- Stores customer reviews for specialists
-- ============================================

CREATE TABLE IF NOT EXISTS specialist_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    specialist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Booking reference (optional - for verified reviews)
    booking_id UUID REFERENCES specialist_bookings(id) ON DELETE SET NULL,
    
    -- Rating fields
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    food_quality_rating INTEGER CHECK (food_quality_rating >= 1 AND food_quality_rating <= 5),
    professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    
    -- Review content
    title VARCHAR(255),
    comment TEXT NOT NULL,
    
    -- Event details
    event_type VARCHAR(100),
    event_date DATE,
    guest_count INTEGER,
    
    -- Media
    images TEXT[] DEFAULT '{}',
    
    -- Engagement
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    -- Response from specialist
    response_from_specialist TEXT,
    response_date TIMESTAMP WITH TIME ZONE,
    
    -- Status and moderation
    status VARCHAR(50) DEFAULT 'published', -- draft, published, flagged, hidden
    is_verified_booking BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints: One review per user per specialist per booking (or one per user-specialist if no booking)
    CONSTRAINT unique_specialist_review UNIQUE (specialist_id, user_id, booking_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Index for fetching reviews by specialist
CREATE INDEX IF NOT EXISTS idx_specialist_reviews_specialist_id 
ON specialist_reviews(specialist_id);

-- Index for fetching reviews by user
CREATE INDEX IF NOT EXISTS idx_specialist_reviews_user_id 
ON specialist_reviews(user_id);

-- Index for tenant isolation
CREATE INDEX IF NOT EXISTS idx_specialist_reviews_tenant_id 
ON specialist_reviews(tenant_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_specialist_reviews_status 
ON specialist_reviews(status);

-- Index for rating-based queries
CREATE INDEX IF NOT EXISTS idx_specialist_reviews_rating 
ON specialist_reviews(rating);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_specialist_reviews_specialist_status 
ON specialist_reviews(specialist_id, status, created_at DESC);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_specialist_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_specialist_reviews_updated_at ON specialist_reviews;
CREATE TRIGGER trigger_specialist_reviews_updated_at
    BEFORE UPDATE ON specialist_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_specialist_reviews_updated_at();

-- ============================================
-- HELPFUL VOTES TABLE
-- Tracks which users voted on which reviews
-- ============================================

CREATE TABLE IF NOT EXISTS specialist_review_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES specialist_reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_specialist_review_vote UNIQUE (review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_specialist_review_votes_review_id 
ON specialist_review_votes(review_id);

-- ============================================
-- GRANT PERMISSIONS (if needed)
-- ============================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'specialist_reviews and specialist_review_votes tables created successfully!';
END $$;

