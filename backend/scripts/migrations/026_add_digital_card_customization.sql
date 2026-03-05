-- Migration: Add digital_card_customization column to businesses table
-- Date: 2026-03-05
-- Description: Adds JSONB column to store digital business card customization settings

-- Add digital_card_customization column to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS digital_card_customization JSONB DEFAULT NULL;

-- Add comment to the column
COMMENT ON COLUMN businesses.digital_card_customization IS 'Stores digital business card customization settings including colors, layout, and content options';

-- Create index for faster JSON queries
CREATE INDEX IF NOT EXISTS idx_businesses_digital_card_customization 
ON businesses USING GIN (digital_card_customization);

-- Example of the JSON structure:
-- {
--   "primaryColor": "#667eea",
--   "secondaryColor": "#764ba2",
--   "logoPosition": "top",
--   "includeQR": true,
--   "includeContact": true,
--   "includeSocial": true
-- }

