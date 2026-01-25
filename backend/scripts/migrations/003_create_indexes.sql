-- Migration 003: Create all indexes for performance
-- Run this after all tables are created

-- ============================================
-- USERS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ============================================
-- BUSINESSES INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_businesses_tenant_id ON businesses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_business_type ON businesses(business_type);

-- ============================================
-- MENUS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_menus_tenant_id ON menus(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menus_business_id ON menus(business_id);
CREATE INDEX IF NOT EXISTS idx_menus_category ON menus(category);

-- ============================================
-- BOOKINGS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- ============================================
-- REVIEWS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_tenant_id ON reviews(tenant_id);

-- ============================================
-- COMMUNITY POSTS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_tenant_id ON community_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_author_id ON community_posts(author_id);

-- ============================================
-- AD CAMPAIGNS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_business_id ON ad_campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_tenant_id ON ad_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_tier_id ON ad_campaigns(tier_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_placement_id ON ad_campaigns(placement_id);

-- ============================================
-- FAVORITES INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_business_id ON favorites(business_id);
CREATE INDEX IF NOT EXISTS idx_favorites_tenant_id ON favorites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_favorite_collections_user_id ON favorite_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_collections_tenant_id ON favorite_collections(tenant_id);

-- ============================================
-- CONTACT INQUIRIES INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_business_id ON contact_inquiries(business_id);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_tenant_id ON contact_inquiries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status ON contact_inquiries(status);

-- ============================================
-- INTEGRATION INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_integration_connections_business_id ON integration_connections(business_id);
CREATE INDEX IF NOT EXISTS idx_integration_connections_tenant_id ON integration_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_connection_id ON sync_history(connection_id);

-- ============================================
-- SPECIALIST INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_specialist_bookings_specialist_id ON specialist_bookings(specialist_id);
CREATE INDEX IF NOT EXISTS idx_specialist_bookings_client_id ON specialist_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_specialist_earnings_specialist_id ON specialist_earnings(specialist_id);
CREATE INDEX IF NOT EXISTS idx_specialist_reviews_specialist_id ON specialist_reviews(specialist_id);

-- ============================================
-- ANALYTICS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_business_analytics_business_id ON business_analytics(business_id);
CREATE INDEX IF NOT EXISTS idx_business_analytics_date ON business_analytics(date);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_business_id ON business_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_status ON business_subscriptions(status);

-- ============================================
-- CHAT HISTORY INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);

-- ============================================
-- NOTIFICATIONS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ============================================
-- RBAC INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

