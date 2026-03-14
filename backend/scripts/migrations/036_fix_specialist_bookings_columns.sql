-- ============================================
-- Migration 032: Fix Specialist Bookings Table Columns
-- Adds missing columns that the booking endpoint expects
-- ============================================

-- Add missing columns to specialist_bookings table
ALTER TABLE specialist_bookings ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(50);
ALTER TABLE specialist_bookings ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 1;
ALTER TABLE specialist_bookings ADD COLUMN IF NOT EXISTS total_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE specialist_bookings ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);
ALTER TABLE specialist_bookings ADD COLUMN IF NOT EXISTS event_city VARCHAR(100);
ALTER TABLE specialist_bookings ADD COLUMN IF NOT EXISTS event_address TEXT;
ALTER TABLE specialist_bookings ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE specialist_bookings ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE specialist_bookings ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE specialist_bookings ADD COLUMN IF NOT EXISTS special_requests TEXT;
ALTER TABLE specialist_bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE specialist_bookings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE specialist_bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE specialist_bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE specialist_bookings ADD COLUMN IF NOT EXISTS has_testimonial BOOLEAN DEFAULT false;

-- Rename total_amount to match what the endpoint expects (total_price)
-- First check if total_amount exists and total_price doesn't
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'specialist_bookings' AND column_name = 'total_amount'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'specialist_bookings' AND column_name = 'total_price'
    ) THEN
        ALTER TABLE specialist_bookings RENAME COLUMN total_amount TO total_price;
    END IF;
END $$;

-- Rename user_id to client_id to match the endpoint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'specialist_bookings' AND column_name = 'user_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'specialist_bookings' AND column_name = 'client_id'
    ) THEN
        ALTER TABLE specialist_bookings RENAME COLUMN user_id TO client_id;
    END IF;
END $$;

-- Create index on booking_reference for faster lookups
CREATE INDEX IF NOT EXISTS idx_specialist_bookings_reference ON specialist_bookings(booking_reference);

-- Create index on client_id for faster user booking queries
CREATE INDEX IF NOT EXISTS idx_specialist_bookings_client ON specialist_bookings(client_id);

-- Create index on specialist_id for faster specialist booking queries
CREATE INDEX IF NOT EXISTS idx_specialist_bookings_specialist ON specialist_bookings(specialist_id);

-- Create index on tenant_id for multi-tenancy
CREATE INDEX IF NOT EXISTS idx_specialist_bookings_tenant ON specialist_bookings(tenant_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_specialist_bookings_status ON specialist_bookings(status);

-- Add comments
COMMENT ON COLUMN specialist_bookings.booking_reference IS 'Unique booking reference code for customer';
COMMENT ON COLUMN specialist_bookings.guest_count IS 'Number of guests for the event';
COMMENT ON COLUMN specialist_bookings.total_price IS 'Total price for the booking';
COMMENT ON COLUMN specialist_bookings.event_type IS 'Type of event (e.g., Private Dinner, Wedding, Corporate)';
COMMENT ON COLUMN specialist_bookings.event_city IS 'City where the event will take place';
COMMENT ON COLUMN specialist_bookings.event_address IS 'Full address where the event will take place';
COMMENT ON COLUMN specialist_bookings.contact_name IS 'Contact person name';
COMMENT ON COLUMN specialist_bookings.contact_phone IS 'Contact phone number';
COMMENT ON COLUMN specialist_bookings.contact_email IS 'Contact email address';
COMMENT ON COLUMN specialist_bookings.special_requests IS 'Special requests or dietary requirements';
COMMENT ON COLUMN specialist_bookings.payment_status IS 'Payment status (pending, paid, refunded)';
COMMENT ON COLUMN specialist_bookings.has_testimonial IS 'Whether the client has left a testimonial for this booking';

-- Migration complete message
DO $$
BEGIN
    RAISE NOTICE 'Migration 032_fix_specialist_bookings_columns.sql completed successfully';
END $$;

