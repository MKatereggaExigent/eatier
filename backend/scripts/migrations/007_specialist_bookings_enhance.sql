-- ============================================
-- Migration 007: Enhance Specialist Bookings Table
-- This migration ensures the specialist_bookings table has all required columns
-- for the booking and testimonial flow
-- ============================================

-- Add missing columns to specialist_bookings if they don't exist
DO $$
BEGIN
    -- booking_reference for unique booking identification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'specialist_bookings' AND column_name = 'booking_reference') THEN
        ALTER TABLE specialist_bookings ADD COLUMN booking_reference VARCHAR(50);
    END IF;

    -- client_id (some schemas use user_id, we need client_id)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'specialist_bookings' AND column_name = 'client_id') THEN
        ALTER TABLE specialist_bookings ADD COLUMN client_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- guest_count for number of guests
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'specialist_bookings' AND column_name = 'guest_count') THEN
        ALTER TABLE specialist_bookings ADD COLUMN guest_count INTEGER DEFAULT 1;
    END IF;

    -- total_price for booking cost
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'specialist_bookings' AND column_name = 'total_price') THEN
        ALTER TABLE specialist_bookings ADD COLUMN total_price DECIMAL(10, 2) DEFAULT 0;
    END IF;

    -- event_type for type of event
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'specialist_bookings' AND column_name = 'event_type') THEN
        ALTER TABLE specialist_bookings ADD COLUMN event_type VARCHAR(100);
    END IF;

    -- event_city for location
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'specialist_bookings' AND column_name = 'event_city') THEN
        ALTER TABLE specialist_bookings ADD COLUMN event_city VARCHAR(100);
    END IF;

    -- event_address for full address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'specialist_bookings' AND column_name = 'event_address') THEN
        ALTER TABLE specialist_bookings ADD COLUMN event_address TEXT;
    END IF;

    -- contact_name for client contact
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'specialist_bookings' AND column_name = 'contact_name') THEN
        ALTER TABLE specialist_bookings ADD COLUMN contact_name VARCHAR(255);
    END IF;

    -- contact_phone for client phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'specialist_bookings' AND column_name = 'contact_phone') THEN
        ALTER TABLE specialist_bookings ADD COLUMN contact_phone VARCHAR(50);
    END IF;

    -- contact_email for client email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'specialist_bookings' AND column_name = 'contact_email') THEN
        ALTER TABLE specialist_bookings ADD COLUMN contact_email VARCHAR(255);
    END IF;

    -- special_requests for additional notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'specialist_bookings' AND column_name = 'special_requests') THEN
        ALTER TABLE specialist_bookings ADD COLUMN special_requests TEXT;
    END IF;

    -- payment_status for payment tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'specialist_bookings' AND column_name = 'payment_status') THEN
        ALTER TABLE specialist_bookings ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending';
    END IF;

    -- completed_at for tracking when booking was marked complete
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'specialist_bookings' AND column_name = 'completed_at') THEN
        ALTER TABLE specialist_bookings ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- cancelled_at for tracking cancellation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'specialist_bookings' AND column_name = 'cancelled_at') THEN
        ALTER TABLE specialist_bookings ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- cancellation_reason for tracking why booking was cancelled
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'specialist_bookings' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE specialist_bookings ADD COLUMN cancellation_reason TEXT;
    END IF;

    -- has_testimonial flag to track if client left a review
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'specialist_bookings' AND column_name = 'has_testimonial') THEN
        ALTER TABLE specialist_bookings ADD COLUMN has_testimonial BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_specialist_bookings_client ON specialist_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_specialist_bookings_specialist ON specialist_bookings(specialist_id);
CREATE INDEX IF NOT EXISTS idx_specialist_bookings_status ON specialist_bookings(status);
CREATE INDEX IF NOT EXISTS idx_specialist_bookings_booking_date ON specialist_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_specialist_bookings_reference ON specialist_bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_specialist_bookings_completed ON specialist_bookings(status) WHERE status = 'completed';

-- Enable Row Level Security
ALTER TABLE specialist_bookings ENABLE ROW LEVEL SECURITY;

-- Migration complete message
DO $$
BEGIN
    RAISE NOTICE 'Migration 007_specialist_bookings_enhance.sql completed successfully';
END $$;

