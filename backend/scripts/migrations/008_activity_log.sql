-- ============================================================================
-- Migration 008: Activity Log Table
-- Creates activity_log table for audit trail and user action tracking
-- Supports RBAC and multi-tenancy
-- ============================================================================

-- ============================================
-- ACTIVITY_LOG TABLE
-- Tracks all user actions and system events for audit and security
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Multi-tenancy and user identification
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Action details
    action VARCHAR(100) NOT NULL,  -- login, logout, profile_updated, menu_created, booking_made, etc.
    entity_type VARCHAR(100),       -- business, menu, review, booking, user, report
    entity_id UUID,                 -- Reference to the affected entity
    
    -- Detailed information
    details JSONB DEFAULT '{}',     -- Old/new values, additional context
    
    -- Request metadata
    ip_address VARCHAR(50),
    user_agent TEXT,
    device_type VARCHAR(50),        -- mobile, tablet, desktop
    browser VARCHAR(100),
    os VARCHAR(100),
    country VARCHAR(100),
    city VARCHAR(100),
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'success',  -- success, failed, warning
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_activity_log_user 
ON activity_log(user_id);

-- Index for fast tenant queries
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant 
ON activity_log(tenant_id);

-- Index for fast action queries
CREATE INDEX IF NOT EXISTS idx_activity_log_action 
ON activity_log(action);

-- Index for fast entity queries
CREATE INDEX IF NOT EXISTS idx_activity_log_entity 
ON activity_log(entity_type, entity_id);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_activity_log_created 
ON activity_log(created_at DESC);

-- Composite index for common report queries
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_date 
ON activity_log(tenant_id, created_at DESC);

-- ============================================
-- COMMON ACTION TYPES (Reference)
-- ============================================
-- Authentication: login, logout, password_reset, email_verified
-- Profile: profile_updated, avatar_changed, settings_updated
-- Business: business_created, business_updated, business_suspended, business_activated
-- Menu: menu_created, menu_updated, menu_item_added, menu_item_deleted
-- Booking: booking_created, booking_confirmed, booking_cancelled, booking_completed
-- Review: review_created, review_updated, review_deleted, review_flagged
-- Order: order_placed, order_paid, order_delivered, order_refunded
-- Admin: user_suspended, user_activated, report_generated, export_report
-- System: system_error, rate_limit_exceeded, suspicious_activity

-- ============================================
-- SAMPLE DATA FOR TESTING (Optional)
-- ============================================
-- Uncomment to add sample data for development

/*
INSERT INTO activity_log (tenant_id, user_id, action, entity_type, details, ip_address, status)
SELECT 
    t.id,
    u.id,
    'login',
    'user',
    '{"method": "email", "success": true}'::jsonb,
    '192.168.1.1',
    'success'
FROM tenants t
CROSS JOIN users u
WHERE t.slug = 'itiyum'
LIMIT 1;
*/

-- ============================================
-- FUNCTION TO LOG ACTIVITY (Helper)
-- ============================================
CREATE OR REPLACE FUNCTION log_activity(
    p_tenant_id UUID,
    p_user_id UUID,
    p_action VARCHAR(100),
    p_entity_type VARCHAR(100) DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}',
    p_ip_address VARCHAR(50) DEFAULT NULL,
    p_status VARCHAR(50) DEFAULT 'success'
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO activity_log (
        tenant_id, user_id, action, entity_type, entity_id, 
        details, ip_address, status
    ) VALUES (
        p_tenant_id, p_user_id, p_action, p_entity_type, p_entity_id,
        p_details, p_ip_address, p_status
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to the application user
-- GRANT EXECUTE ON FUNCTION log_activity TO app_user;

COMMENT ON TABLE activity_log IS 'Audit trail for all user actions and system events';
COMMENT ON COLUMN activity_log.action IS 'Type of action: login, logout, profile_updated, etc.';
COMMENT ON COLUMN activity_log.entity_type IS 'Type of entity affected: business, menu, user, etc.';
COMMENT ON COLUMN activity_log.details IS 'JSON object with old/new values and additional context';

