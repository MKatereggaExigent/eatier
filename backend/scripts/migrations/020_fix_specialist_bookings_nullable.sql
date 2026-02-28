-- ============================================
-- Migration 020: Fix Specialist Bookings Nullable Columns
-- Makes start_time and end_time nullable since the booking form
-- only collects booking_date, not specific times
-- ============================================

-- Make start_time nullable
ALTER TABLE specialist_bookings ALTER COLUMN start_time DROP NOT NULL;

-- Make end_time nullable (if it has NOT NULL constraint)
DO $$
BEGIN
    ALTER TABLE specialist_bookings ALTER COLUMN end_time DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'end_time column already nullable or does not exist';
END $$;

-- Migration complete message
DO $$
BEGIN
    RAISE NOTICE 'Migration 020_fix_specialist_bookings_nullable.sql completed successfully';
END $$;

