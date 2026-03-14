-- Migration 030: Fix notifications table for production use
-- Date: 2026-03-14
-- Description: Adds tenant_id and indexes to notifications table for multi-tenancy support

-- Add tenant_id column if it doesn't exist
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Update existing notifications to have a tenant_id (set to default tenant)
UPDATE notifications
SET tenant_id = (SELECT id FROM tenants LIMIT 1)
WHERE tenant_id IS NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Add comment
COMMENT ON TABLE notifications IS 'Stores user notifications for bookings, reviews, payments, and system events';
COMMENT ON COLUMN notifications.tenant_id IS 'Multi-tenancy support - links notification to tenant';
COMMENT ON COLUMN notifications.data IS 'JSONB field for additional notification metadata including action_url';
COMMENT ON COLUMN notifications.is_read IS 'Whether the notification has been read by the user';
COMMENT ON COLUMN notifications.read_at IS 'Timestamp when the notification was marked as read';

