-- Migration: Fix specialty_dishes and certifications column types
-- Version: 031
-- Description: Convert text[] columns to JSONB for specialty_dishes, certifications, and portfolio_images

-- Drop existing columns if they're the wrong type
ALTER TABLE users DROP COLUMN IF EXISTS specialty_dishes CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS certifications CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS portfolio_images CASCADE;

-- Recreate as JSONB
ALTER TABLE users ADD COLUMN specialty_dishes JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN certifications JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN portfolio_images JSONB DEFAULT '[]';

