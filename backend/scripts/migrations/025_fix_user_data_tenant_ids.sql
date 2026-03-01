-- Migration: Fix user data tenant_ids
-- Description: Update reviews and bookings to use the user's tenant_id instead of business tenant_id
-- This ensures proper multi-tenancy where user-generated content belongs to the user's tenant

-- Update reviews to use the user's tenant_id
UPDATE reviews r
SET tenant_id = u.tenant_id
FROM users u
WHERE r.user_id = u.id
  AND r.tenant_id != u.tenant_id;

-- Update bookings to use the user's tenant_id (only for authenticated bookings, not guest bookings)
UPDATE bookings b
SET tenant_id = u.tenant_id
FROM users u
WHERE b.user_id = u.id
  AND b.user_id IS NOT NULL
  AND b.tenant_id != u.tenant_id;

-- Update favorites to use the user's tenant_id
UPDATE favorites f
SET tenant_id = u.tenant_id
FROM users u
WHERE f.user_id = u.id
  AND f.tenant_id != u.tenant_id;

