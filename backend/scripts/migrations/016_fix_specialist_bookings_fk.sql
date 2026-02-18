-- ============================================
-- Migration 016: Fix Specialist Bookings Foreign Key
-- This migration fixes the specialist_id foreign key to reference users(id)
-- instead of the non-existent specialist_profiles(id) table
-- ============================================

-- Drop the invalid foreign key constraint if it exists
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name for specialist_id
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'specialist_bookings'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'specialist_id';
    
    -- Drop the constraint if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE specialist_bookings DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped foreign key constraint: %', constraint_name;
    END IF;
END $$;

-- Add the correct foreign key constraint referencing users(id)
-- First check if constraint already exists (with correct reference)
DO $$
BEGIN
    -- Add foreign key to users table if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints AS tc
        JOIN information_schema.constraint_column_usage AS ccu
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'specialist_bookings'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'users'
            AND ccu.column_name = 'id'
    ) THEN
        -- Only add if the column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'specialist_bookings' AND column_name = 'specialist_id') THEN
            ALTER TABLE specialist_bookings 
            ADD CONSTRAINT fk_specialist_bookings_specialist_user
            FOREIGN KEY (specialist_id) REFERENCES users(id) ON DELETE SET NULL;
            RAISE NOTICE 'Added foreign key constraint: fk_specialist_bookings_specialist_user';
        END IF;
    END IF;
END $$;

-- Also fix the same issue for specialist_earnings if it exists
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'specialist_earnings'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'specialist_id';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE specialist_earnings DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped foreign key constraint on specialist_earnings: %', constraint_name;
        
        ALTER TABLE specialist_earnings 
        ADD CONSTRAINT fk_specialist_earnings_specialist_user
        FOREIGN KEY (specialist_id) REFERENCES users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint: fk_specialist_earnings_specialist_user';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'specialist_earnings table may not exist or constraint already correct';
END $$;

-- Also fix for specialist_reviews if it exists
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'specialist_reviews'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'specialist_id';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE specialist_reviews DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped foreign key constraint on specialist_reviews: %', constraint_name;
        
        ALTER TABLE specialist_reviews 
        ADD CONSTRAINT fk_specialist_reviews_specialist_user
        FOREIGN KEY (specialist_id) REFERENCES users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint: fk_specialist_reviews_specialist_user';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'specialist_reviews table may not exist or constraint already correct';
END $$;

-- Migration complete message
DO $$
BEGIN
    RAISE NOTICE 'Migration 016_fix_specialist_bookings_fk.sql completed successfully';
END $$;

