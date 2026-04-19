-- Migration: Add address fields for delivery fee calculation
-- This enables distance-based delivery fees using Google Maps API

-- Add address fields to users table for delivery addresses
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS delivery_city VARCHAR(100) DEFAULT 'Kampala',
ADD COLUMN IF NOT EXISTS delivery_state VARCHAR(100) DEFAULT 'Central Region',
ADD COLUMN IF NOT EXISTS delivery_postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS delivery_country VARCHAR(100) DEFAULT 'Uganda';

-- Add address fields to business_profiles for restaurant locations
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Kampala',
ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT 'Central Region',
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Uganda';

-- Create index for faster address lookups
CREATE INDEX IF NOT EXISTS idx_users_delivery_city ON users(delivery_city);
CREATE INDEX IF NOT EXISTS idx_business_profiles_city ON business_profiles(city);

-- Add comments for documentation
COMMENT ON COLUMN users.delivery_address IS 'Street address for delivery orders';
COMMENT ON COLUMN users.delivery_city IS 'City for delivery address';
COMMENT ON COLUMN users.delivery_state IS 'State/Province/Region for delivery';
COMMENT ON COLUMN users.delivery_postal_code IS 'Postal/ZIP code for delivery';
COMMENT ON COLUMN users.delivery_country IS 'Country for delivery (default: Uganda)';

COMMENT ON COLUMN business_profiles.address IS 'Restaurant street address';
COMMENT ON COLUMN business_profiles.city IS 'Restaurant city location';
COMMENT ON COLUMN business_profiles.state IS 'Restaurant state/region';
COMMENT ON COLUMN business_profiles.postal_code IS 'Restaurant postal code';
COMMENT ON COLUMN business_profiles.country IS 'Restaurant country (default: Uganda)';

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 039: Address fields added successfully';
  RAISE NOTICE '   - Users table: delivery_address, delivery_city, delivery_state, delivery_postal_code, delivery_country';
  RAISE NOTICE '   - Business profiles: address, city, state, postal_code, country';
  RAISE NOTICE '   - Indexes created for faster lookups';
  RAISE NOTICE '   - Ready for Google Maps distance calculation';
END $$;
