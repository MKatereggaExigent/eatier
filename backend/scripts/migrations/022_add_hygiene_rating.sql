-- Migration: Add hygiene_rating column to reviews table
-- This supports the weighted rating model: 0.3*food + 0.3*service + 0.2*hygiene + 0.1*value + 0.1*ambiance

-- Add hygiene_rating column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reviews' AND column_name = 'hygiene_rating'
    ) THEN
        ALTER TABLE reviews ADD COLUMN hygiene_rating INTEGER;
        RAISE NOTICE 'Added hygiene_rating column to reviews table';
    ELSE
        RAISE NOTICE 'hygiene_rating column already exists in reviews table';
    END IF;
END $$;

-- Add a constraint to ensure hygiene_rating is between 1 and 5 (if not null)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'reviews' AND constraint_name = 'reviews_hygiene_rating_check'
    ) THEN
        ALTER TABLE reviews ADD CONSTRAINT reviews_hygiene_rating_check 
            CHECK (hygiene_rating IS NULL OR (hygiene_rating >= 1 AND hygiene_rating <= 5));
        RAISE NOTICE 'Added hygiene_rating constraint';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint reviews_hygiene_rating_check already exists';
END $$;

