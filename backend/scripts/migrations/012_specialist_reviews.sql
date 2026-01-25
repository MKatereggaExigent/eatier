-- ============================================
-- SPECIALIST REVIEWS TABLE ENHANCEMENTS
-- Adds additional columns to the existing specialist_reviews table
-- Base table created in schema-with-rbac-multitenancy.sql uses client_id (not user_id)
-- ============================================

-- Add additional rating columns
ALTER TABLE specialist_reviews ADD COLUMN IF NOT EXISTS food_quality_rating INTEGER CHECK (food_quality_rating >= 1 AND food_quality_rating <= 5);
ALTER TABLE specialist_reviews ADD COLUMN IF NOT EXISTS professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5);
ALTER TABLE specialist_reviews ADD COLUMN IF NOT EXISTS communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5);
ALTER TABLE specialist_reviews ADD COLUMN IF NOT EXISTS value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5);

-- Add review content columns
ALTER TABLE specialist_reviews ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- Add event details columns
ALTER TABLE specialist_reviews ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);
ALTER TABLE specialist_reviews ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE specialist_reviews ADD COLUMN IF NOT EXISTS guest_count INTEGER;

-- Add media column
ALTER TABLE specialist_reviews ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Add engagement columns
ALTER TABLE specialist_reviews ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;
ALTER TABLE specialist_reviews ADD COLUMN IF NOT EXISTS not_helpful_count INTEGER DEFAULT 0;

-- Add response columns
ALTER TABLE specialist_reviews ADD COLUMN IF NOT EXISTS response_from_specialist TEXT;
ALTER TABLE specialist_reviews ADD COLUMN IF NOT EXISTS response_date TIMESTAMP WITH TIME ZONE;

-- Add status and moderation columns
ALTER TABLE specialist_reviews ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published';
ALTER TABLE specialist_reviews ADD COLUMN IF NOT EXISTS is_verified_booking BOOLEAN DEFAULT false;
ALTER TABLE specialist_reviews ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Add updated_at column if not exists
ALTER TABLE specialist_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add unique constraint if not exists (using client_id to match base schema)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_specialist_review'
    ) THEN
        ALTER TABLE specialist_reviews ADD CONSTRAINT unique_specialist_review UNIQUE (specialist_id, client_id, booking_id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Constraint may already exist with different name or structure
    NULL;
END $$;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Index for fetching reviews by specialist
CREATE INDEX IF NOT EXISTS idx_specialist_reviews_specialist_id
ON specialist_reviews(specialist_id);

-- Index for fetching reviews by client (user who wrote the review)
CREATE INDEX IF NOT EXISTS idx_specialist_reviews_client_id
ON specialist_reviews(client_id);

-- Index for tenant isolation
CREATE INDEX IF NOT EXISTS idx_specialist_reviews_tenant_id
ON specialist_reviews(tenant_id);

-- Index for status filtering (only if status column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'specialist_reviews' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_specialist_reviews_status ON specialist_reviews(status);
    END IF;
END $$;

-- Index for rating-based queries
CREATE INDEX IF NOT EXISTS idx_specialist_reviews_rating
ON specialist_reviews(rating);

-- Composite index for common queries (only if status column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'specialist_reviews' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_specialist_reviews_specialist_status ON specialist_reviews(specialist_id, status, created_at DESC);
    END IF;
END $$;

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

