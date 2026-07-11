-- Migration 044: Create payment_methods table and fix ad_placements
-- Date: 2026-07-11
-- Description: Adds payment_methods table for ad billing, adds aspect_ratio to ad_placements

-- ============================================
-- PAYMENT_METHODS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'mobile_money')),
    card_number_encrypted TEXT,
    last_four_digits VARCHAR(4),
    expiry_date VARCHAR(10),
    cardholder_name VARCHAR(255),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    billing_street VARCHAR(255),
    billing_city VARCHAR(100),
    billing_state VARCHAR(100),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(user_id, is_default) WHERE is_active = true;

-- ============================================
-- ADD ASPECT_RATIO TO AD_PLACEMENTS
-- ============================================
ALTER TABLE ad_placements ADD COLUMN IF NOT EXISTS aspect_ratio VARCHAR(20);

-- Set aspect ratios based on dimensions
UPDATE ad_placements SET aspect_ratio = '16:9' WHERE width >= 1200;
UPDATE ad_placements SET aspect_ratio = '4:3' WHERE width = 728 AND height = 90;
UPDATE ad_placements SET aspect_ratio = '1:1' WHERE width = 300 AND height = 250;
UPDATE ad_placements SET aspect_ratio = '3:2' WHERE width = 468;
UPDATE ad_placements SET aspect_ratio = '3:1' WHERE width = 600 AND height = 200;
UPDATE ad_placements SET aspect_ratio = '10:1' WHERE width = 970;
UPDATE ad_placements SET aspect_ratio = '5:3' WHERE width = 500;
UPDATE ad_placements SET aspect_ratio = '16:9' WHERE width = 320;
