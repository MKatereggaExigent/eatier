-- Migration: Add price_preference column to user_preferences table
-- This is used by the recommendations endpoint to filter businesses by price preference

-- Add price_preference column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' AND column_name = 'price_preference'
    ) THEN
        ALTER TABLE user_preferences ADD COLUMN price_preference VARCHAR(20);
        RAISE NOTICE 'Added price_preference column to user_preferences table';
    ELSE
        RAISE NOTICE 'price_preference column already exists in user_preferences table';
    END IF;
END $$;

