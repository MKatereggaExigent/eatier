-- Seed RBAC Roles and Permissions for Itiyum Platform

-- ============================================
-- INSERT ROLES
-- ============================================
INSERT INTO roles (name, description, is_system_role) VALUES
('Itiyum Admin', 'Platform administrator with full access', true),
('Business Owner', 'Restaurant/business owner with business management access', true),
('Food Enthusiast', 'Food lover with enhanced social features', true),
('Specialist', 'Chef, food critic, or culinary specialist', true),
('Normal User', 'Standard platform user', true);

-- ============================================
-- INSERT PERMISSIONS
-- ============================================
INSERT INTO permissions (name, description, category) VALUES
-- User Management
('users.view', 'View user profiles', 'User Management'),
('users.create', 'Create new users', 'User Management'),
('users.edit', 'Edit user profiles', 'User Management'),
('users.delete', 'Delete users', 'User Management'),
('users.manage_roles', 'Manage user roles', 'User Management'),

-- Business Management
('businesses.view', 'View businesses', 'Business Management'),
('businesses.create', 'Create businesses', 'Business Management'),
('businesses.edit', 'Edit businesses', 'Business Management'),
('businesses.delete', 'Delete businesses', 'Business Management'),
('businesses.verify', 'Verify businesses', 'Business Management'),

-- Menu Management
('menus.view', 'View menus', 'Menu Management'),
('menus.create', 'Create menu items', 'Menu Management'),
('menus.edit', 'Edit menu items', 'Menu Management'),
('menus.delete', 'Delete menu items', 'Menu Management'),

-- Booking Management
('bookings.view', 'View bookings', 'Booking Management'),
('bookings.create', 'Create bookings', 'Booking Management'),
('bookings.edit', 'Edit bookings', 'Booking Management'),
('bookings.delete', 'Cancel bookings', 'Booking Management'),

-- Review Management
('reviews.view', 'View reviews', 'Review Management'),
('reviews.create', 'Create reviews', 'Review Management'),
('reviews.edit', 'Edit reviews', 'Review Management'),
('reviews.delete', 'Delete reviews', 'Review Management'),
('reviews.moderate', 'Moderate reviews', 'Review Management'),

-- Community Management
('community.view', 'View community posts', 'Community'),
('community.create', 'Create community posts', 'Community'),
('community.edit', 'Edit community posts', 'Community'),
('community.delete', 'Delete community posts', 'Community'),
('community.moderate', 'Moderate community content', 'Community'),

-- Advertising
('ads.view', 'View ad campaigns', 'Advertising'),
('ads.create', 'Create ad campaigns', 'Advertising'),
('ads.edit', 'Edit ad campaigns', 'Advertising'),
('ads.delete', 'Delete ad campaigns', 'Advertising'),
('ads.approve', 'Approve ad campaigns', 'Advertising'),

-- Analytics
('analytics.view', 'View analytics', 'Analytics'),
('analytics.export', 'Export analytics data', 'Analytics'),

-- Platform Administration
('admin.dashboard', 'Access admin dashboard', 'Administration'),
('admin.settings', 'Manage platform settings', 'Administration'),
('admin.tenants', 'Manage tenants', 'Administration'),
('admin.audit', 'View audit logs', 'Administration');

-- ============================================
-- ASSIGN PERMISSIONS TO ROLES
-- ============================================

-- Itiyum Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'Itiyum Admin';

-- Business Owner permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'Business Owner' 
AND p.name IN (
    'users.view', 'users.edit',
    'businesses.view', 'businesses.edit',
    'menus.view', 'menus.create', 'menus.edit', 'menus.delete',
    'bookings.view', 'bookings.edit',
    'reviews.view',
    'community.view', 'community.create',
    'ads.view', 'ads.create', 'ads.edit',
    'analytics.view'
);

-- Food Enthusiast permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'Food Enthusiast' 
AND p.name IN (
    'users.view', 'users.edit',
    'businesses.view',
    'menus.view',
    'bookings.view', 'bookings.create',
    'reviews.view', 'reviews.create', 'reviews.edit',
    'community.view', 'community.create', 'community.edit'
);

-- Specialist permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'Specialist' 
AND p.name IN (
    'users.view', 'users.edit',
    'businesses.view',
    'menus.view',
    'bookings.view', 'bookings.create', 'bookings.edit',
    'reviews.view', 'reviews.create',
    'community.view', 'community.create', 'community.edit',
    'analytics.view'
);

-- Normal User permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'Normal User' 
AND p.name IN (
    'users.view', 'users.edit',
    'businesses.view',
    'menus.view',
    'bookings.view', 'bookings.create',
    'reviews.view', 'reviews.create',
    'community.view'
);

-- ============================================
-- CREATE DEFAULT ADMIN USER
-- ============================================
INSERT INTO users (
    email, 
    password_hash, 
    first_name, 
    last_name, 
    account_status,
    email_verified,
    tenant_id
)
SELECT 
    'admin@itiyum.com',
    '$2a$10$placeholder', -- Will be updated by migration script with proper hash
    'Platform',
    'Admin',
    'active',
    true,
    t.id
FROM tenants t WHERE t.slug = 'itiyum';

-- Assign admin role to admin user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id 
FROM users u, roles r 
WHERE u.email = 'admin@itiyum.com' AND r.name = 'Itiyum Admin';

