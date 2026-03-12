-- ============================================
-- ADD SLUG COLUMN TO BUSINESSES TABLE
-- ============================================

-- Add slug column
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Create function to generate slug from business name and city
CREATE OR REPLACE FUNCTION generate_business_slug(business_name TEXT, city TEXT, business_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base slug from business name and city
  base_slug := LOWER(TRIM(business_name));
  
  -- Add city if available
  IF city IS NOT NULL AND city != '' THEN
    base_slug := base_slug || '-' || LOWER(TRIM(city));
  END IF;
  
  -- Replace spaces and special characters with hyphens
  base_slug := REGEXP_REPLACE(base_slug, '[^a-z0-9]+', '-', 'g');
  
  -- Remove leading/trailing hyphens
  base_slug := TRIM(BOTH '-' FROM base_slug);
  
  -- Limit length to 200 characters
  base_slug := SUBSTRING(base_slug FROM 1 FOR 200);
  
  -- Check for uniqueness and add counter if needed
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM businesses WHERE slug = final_slug AND id != business_id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing businesses
UPDATE businesses
SET slug = generate_business_slug(business_name, city, id)
WHERE slug IS NULL OR slug = '';

-- Make slug column NOT NULL and UNIQUE after populating
ALTER TABLE businesses ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_businesses_slug_lookup ON businesses(slug) WHERE account_status != 'deleted';

COMMENT ON COLUMN businesses.slug IS 'URL-friendly unique identifier for public pages (e.g., joes-pizza-kampala)';

