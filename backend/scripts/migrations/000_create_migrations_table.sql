-- ============================================
-- Migration 000: Create schema_migrations tracking table
-- This table tracks which migrations have been applied to the database
-- ============================================

-- Create the schema_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER,
    checksum VARCHAR(64)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);

-- Add comment
COMMENT ON TABLE schema_migrations IS 'Tracks database migrations that have been applied';
COMMENT ON COLUMN schema_migrations.version IS 'Migration version number (e.g., 001, 002)';
COMMENT ON COLUMN schema_migrations.name IS 'Migration file name';
COMMENT ON COLUMN schema_migrations.applied_at IS 'When the migration was applied';
COMMENT ON COLUMN schema_migrations.execution_time_ms IS 'How long the migration took to run';
COMMENT ON COLUMN schema_migrations.checksum IS 'SHA256 hash of the migration file for integrity checking';

DO $$
BEGIN
    RAISE NOTICE 'Migration 000_create_migrations_table.sql completed successfully';
END $$;

