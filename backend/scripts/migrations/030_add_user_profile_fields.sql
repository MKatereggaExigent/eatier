-- Migration: Add missing user profile fields
-- Version: 030
-- Description: Add fields for background photo, experience, address, portfolio, and privacy settings

-- Add background photo
ALTER TABLE users ADD COLUMN IF NOT EXISTS background_photo TEXT;

-- Add professional fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty_dishes JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]';

-- Add media fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_images JSONB DEFAULT '[]';

-- Add address fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS street VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);

-- Add privacy settings
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_visibility VARCHAR(50) DEFAULT 'public';
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_contact_info BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_location BOOLEAN DEFAULT false;

-- Add freeze/account management fields (if not exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS freeze_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS freeze_duration VARCHAR(50);

-- Create index for profile visibility queries
CREATE INDEX IF NOT EXISTS idx_users_profile_visibility ON users(profile_visibility);
CREATE INDEX IF NOT EXISTS idx_users_city_country ON users(city, country);

