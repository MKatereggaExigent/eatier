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

-- ============================================
-- CREATE DEMO BUSINESS FOR ADS
-- ============================================
INSERT INTO businesses (
    name,
    description,
    address,
    city,
    country,
    phone,
    email,
    website,
    category,
    cuisine_type,
    price_range,
    rating,
    status,
    is_verified,
    tenant_id
)
SELECT
    'Demo Restaurant',
    'A demo restaurant for testing ad campaigns',
    '123 Demo Street',
    'Demo City',
    'Demo Country',
    '+1234567890',
    'demo@restaurant.com',
    'https://demo-restaurant.com',
    'restaurant',
    ARRAY['Italian', 'Mediterranean'],
    '$$',
    4.5,
    'active',
    true,
    t.id
FROM tenants t WHERE t.slug = 'itiyum'
ON CONFLICT DO NOTHING;

-- ============================================
-- CREATE DEMO AD CAMPAIGNS
-- ============================================
-- Demo Header Banner Ad (Premium tier)
INSERT INTO ad_campaigns (
    business_id,
    tenant_id,
    tier_id,
    placement_id,
    name,
    title,
    description,
    headline,
    body_text,
    type,
    status,
    is_active,
    is_approved,
    total_budget,
    daily_budget,
    remaining_amount,
    start_date,
    priority_score
)
SELECT
    b.id,
    t.id,
    tier.id,
    p.id,
    'Demo Header Banner Campaign',
    'Welcome to Demo Restaurant',
    'Experience the finest Italian cuisine in town',
    'Authentic Italian Dining',
    'Visit us for an unforgettable culinary experience. Fresh ingredients, traditional recipes.',
    'banner',
    'active',
    true,
    true,
    500.00,
    25.00,
    500.00,
    CURRENT_DATE,
    75
FROM businesses b, tenants t, ad_space_tiers tier, ad_placements p
WHERE b.name = 'Demo Restaurant'
    AND t.slug = 'itiyum'
    AND tier.name = 'premium'
    AND p.name = 'header_banner_premium'
ON CONFLICT DO NOTHING;

-- Demo Sidebar Ad (Standard tier)
INSERT INTO ad_campaigns (
    business_id,
    tenant_id,
    tier_id,
    placement_id,
    name,
    title,
    description,
    headline,
    body_text,
    type,
    status,
    is_active,
    is_approved,
    total_budget,
    daily_budget,
    remaining_amount,
    start_date,
    priority_score
)
SELECT
    b.id,
    t.id,
    tier.id,
    p.id,
    'Demo Sidebar Campaign',
    'Special Lunch Menu',
    'Check out our daily lunch specials',
    'Lunch Specials',
    'Fresh daily specials from $12.99. Dine in or takeaway.',
    'banner',
    'active',
    true,
    true,
    200.00,
    15.00,
    200.00,
    CURRENT_DATE,
    50
FROM businesses b, tenants t, ad_space_tiers tier, ad_placements p
WHERE b.name = 'Demo Restaurant'
    AND t.slug = 'itiyum'
    AND tier.name = 'standard'
    AND p.name = 'sidebar_standard'
ON CONFLICT DO NOTHING;

-- Demo Restaurant List Ad (Basic tier)
INSERT INTO ad_campaigns (
    business_id,
    tenant_id,
    tier_id,
    placement_id,
    name,
    title,
    description,
    headline,
    body_text,
    type,
    status,
    is_active,
    is_approved,
    total_budget,
    daily_budget,
    remaining_amount,
    start_date,
    priority_score
)
SELECT
    b.id,
    t.id,
    tier.id,
    p.id,
    'Demo Restaurant List Campaign',
    'Find Us in the List',
    'Look for our special offers',
    'New Location Open!',
    'We have opened a new location near you. Visit today!',
    'banner',
    'active',
    true,
    true,
    100.00,
    10.00,
    100.00,
    CURRENT_DATE,
    25
FROM businesses b, tenants t, ad_space_tiers tier, ad_placements p
WHERE b.name = 'Demo Restaurant'
    AND t.slug = 'itiyum'
    AND tier.name = 'basic'
    AND p.name = 'restaurant_list_basic'
ON CONFLICT DO NOTHING;

