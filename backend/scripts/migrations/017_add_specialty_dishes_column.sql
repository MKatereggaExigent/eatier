-- ============================================
-- Migration 017: Add specialty_dishes column to users table
-- This column stores an array of specialty dishes for specialists
-- ============================================

-- Add specialty_dishes column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'specialty_dishes') THEN
        ALTER TABLE users ADD COLUMN specialty_dishes TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added specialty_dishes column to users table';
    ELSE
        RAISE NOTICE 'specialty_dishes column already exists in users table';
    END IF;
END $$;

-- Create index for searching specialty dishes
CREATE INDEX IF NOT EXISTS idx_users_specialty_dishes ON users USING GIN (specialty_dishes);

-- Migration complete message
DO $$
BEGIN
    RAISE NOTICE 'Migration 017_add_specialty_dishes_column.sql completed successfully';
END $$;

