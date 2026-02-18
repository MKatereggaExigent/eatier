-- ============================================
-- Migration 018: Create specialist_services table
-- This table stores services offered by specialists
-- ============================================

-- Create specialist_services table if it doesn't exist
CREATE TABLE IF NOT EXISTS specialist_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    specialist_id UUID REFERENCES users(id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    service_type VARCHAR(100),
    description TEXT,
    base_price DECIMAL(10, 2) DEFAULT 0,
    price_per_person DECIMAL(10, 2),
    min_guests INTEGER DEFAULT 1,
    max_guests INTEGER,
    duration_hours DECIMAL(4, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_specialist_services_specialist ON specialist_services(specialist_id);
CREATE INDEX IF NOT EXISTS idx_specialist_services_type ON specialist_services(service_type);
CREATE INDEX IF NOT EXISTS idx_specialist_services_active ON specialist_services(is_active);
CREATE INDEX IF NOT EXISTS idx_specialist_services_tenant ON specialist_services(tenant_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_specialist_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_specialist_services_updated_at ON specialist_services;
CREATE TRIGGER trigger_specialist_services_updated_at
    BEFORE UPDATE ON specialist_services
    FOR EACH ROW
    EXECUTE FUNCTION update_specialist_services_updated_at();

-- Migration complete message
DO $$
BEGIN
    RAISE NOTICE 'Migration 018_create_specialist_services.sql completed successfully';
END $$;

