-- ============================================================================
-- Migration: 021_shopping_cart.sql
-- Description: Create shopping cart tables for comprehensive ordering system
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. SHOPPING CARTS TABLE (one cart per user per business)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shopping_carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Cart metadata
    status VARCHAR(20) DEFAULT 'active', -- active, abandoned, converted
    order_type VARCHAR(20) DEFAULT 'delivery', -- delivery, pickup, dine_in
    
    -- Delivery/pickup details (optional, can be set during checkout)
    delivery_address JSONB,
    delivery_instructions TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE, -- For scheduled orders
    
    -- Pricing (calculated fields, updated on cart changes)
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Promotion
    promotion_id UUID,
    promotion_code VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    
    -- One active cart per user per business
    CONSTRAINT unique_active_cart UNIQUE (user_id, business_id, status)
);

-- ============================================================================
-- 2. CART ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Item details (snapshot from menu at time of adding)
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    item_image_url TEXT,
    
    -- Quantity and pricing
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    
    -- Customizations (toppings, modifications, etc.)
    customizations JSONB DEFAULT '[]',
    special_instructions TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. DELIVERY ADDRESSES TABLE (saved addresses for users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_delivery_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Address details
    label VARCHAR(50) DEFAULT 'Home', -- Home, Work, Other
    recipient_name VARCHAR(255),
    phone VARCHAR(20),
    
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Uganda',
    
    -- Coordinates for delivery tracking
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    -- Delivery instructions
    delivery_instructions TEXT,
    
    -- Flags
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. ORDER STATUS HISTORY TABLE (for tracking order progress)
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Status change details
    status VARCHAR(30) NOT NULL,
    previous_status VARCHAR(30),
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    change_reason TEXT,
    
    -- Location tracking (for delivery)
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. INDEXES
-- ============================================================================

-- Shopping carts indexes
CREATE INDEX IF NOT EXISTS idx_shopping_carts_user_id ON shopping_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_carts_business_id ON shopping_carts(business_id);
CREATE INDEX IF NOT EXISTS idx_shopping_carts_status ON shopping_carts(status);
CREATE INDEX IF NOT EXISTS idx_shopping_carts_tenant ON shopping_carts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shopping_carts_expires ON shopping_carts(expires_at);

-- Cart items indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_menu_item ON cart_items(menu_item_id);

-- Delivery addresses indexes
CREATE INDEX IF NOT EXISTS idx_user_delivery_addresses_user ON user_delivery_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_delivery_addresses_default ON user_delivery_addresses(user_id, is_default);

-- Order status history indexes
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created ON order_status_history(created_at DESC);

-- ============================================================================
-- 6. TRIGGER: Update cart totals when items change
-- ============================================================================
CREATE OR REPLACE FUNCTION update_cart_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE shopping_carts
    SET 
        subtotal = (SELECT COALESCE(SUM(total_price), 0) FROM cart_items WHERE cart_id = COALESCE(NEW.cart_id, OLD.cart_id)),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.cart_id, OLD.cart_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_cart_totals ON cart_items;
CREATE TRIGGER trigger_update_cart_totals
    AFTER INSERT OR UPDATE OR DELETE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_cart_totals();

