-- ============================================
-- Migration 034: Add Guest Order Fields
-- Adds columns to support guest checkout without authentication
-- ============================================

-- Add guest information columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50);

-- Make user_id nullable (it already is, but let's be explicit)
-- This allows orders to be created without a user_id for guest orders
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- Add index for guest email lookups
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email) WHERE guest_email IS NOT NULL;

-- Add index for guest phone lookups
CREATE INDEX IF NOT EXISTS idx_orders_guest_phone ON orders(guest_phone) WHERE guest_phone IS NOT NULL;

-- Add comment
COMMENT ON COLUMN orders.guest_name IS 'Name of guest user for orders placed without authentication';
COMMENT ON COLUMN orders.guest_email IS 'Email of guest user for orders placed without authentication';
COMMENT ON COLUMN orders.guest_phone IS 'Phone number of guest user for orders placed without authentication';

-- Migration complete
DO $$
BEGIN
    RAISE NOTICE 'Migration 034_add_guest_order_fields.sql completed successfully';
END $$;

