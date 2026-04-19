const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================================================
// GET /api/cart - Get user's active carts (one per business)
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      SELECT 
        sc.*,
        b.business_name,
        b.logo_url as business_logo,
        b.address as business_address,
        (
          SELECT json_agg(json_build_object(
            'id', ci.id,
            'menuItemId', ci.menu_item_id,
            'itemName', ci.item_name,
            'itemDescription', ci.item_description,
            'itemImageUrl', ci.item_image_url,
            'quantity', ci.quantity,
            'unitPrice', ci.unit_price,
            'totalPrice', ci.total_price,
            'customizations', ci.customizations,
            'specialInstructions', ci.special_instructions
          ) ORDER BY ci.created_at)
          FROM cart_items ci WHERE ci.cart_id = sc.id
        ) as items
      FROM shopping_carts sc
      JOIN businesses b ON sc.business_id = b.id
      WHERE sc.user_id = $1 AND sc.tenant_id = $2 AND sc.status = 'active'
      ORDER BY sc.updated_at DESC
    `, [userId, tenantId]);

    res.json({
      carts: result.rows.map(cart => ({
        id: cart.id,
        businessId: cart.business_id,
        businessName: cart.business_name,
        businessLogo: cart.business_logo,
        businessAddress: cart.business_address,
        orderType: cart.order_type,
        subtotal: parseFloat(cart.subtotal) || 0,
        taxAmount: parseFloat(cart.tax_amount) || 0,
        deliveryFee: parseFloat(cart.delivery_fee) || 0,
        discountAmount: parseFloat(cart.discount_amount) || 0,
        totalAmount: parseFloat(cart.total_amount) || 0,
        promotionCode: cart.promotion_code,
        items: cart.items || [],
        itemCount: (cart.items || []).reduce((sum, item) => sum + item.quantity, 0),
        createdAt: cart.created_at,
        updatedAt: cart.updated_at
      }))
    });
  } catch (error) {
    console.error('Error fetching carts:', error);
    res.status(500).json({ error: 'Failed to fetch carts' });
  }
});

// ============================================================================
// GET /api/cart/:businessId - Get cart for specific business
// ============================================================================
router.get('/:businessId', async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { businessId } = req.params;

    const result = await pool.query(`
      SELECT 
        sc.*,
        b.business_name,
        b.logo_url as business_logo,
        (
          SELECT json_agg(json_build_object(
            'id', ci.id,
            'menuItemId', ci.menu_item_id,
            'itemName', ci.item_name,
            'itemDescription', ci.item_description,
            'itemImageUrl', ci.item_image_url,
            'quantity', ci.quantity,
            'unitPrice', ci.unit_price,
            'totalPrice', ci.total_price,
            'customizations', ci.customizations,
            'specialInstructions', ci.special_instructions
          ) ORDER BY ci.created_at)
          FROM cart_items ci WHERE ci.cart_id = sc.id
        ) as items
      FROM shopping_carts sc
      JOIN businesses b ON sc.business_id = b.id
      WHERE sc.user_id = $1 AND sc.business_id = $2 AND sc.tenant_id = $3 AND sc.status = 'active'
    `, [userId, businessId, tenantId]);

    if (result.rows.length === 0) {
      return res.json({ cart: null });
    }

    const cart = result.rows[0];
    res.json({
      cart: {
        id: cart.id,
        businessId: cart.business_id,
        businessName: cart.business_name,
        businessLogo: cart.business_logo,
        orderType: cart.order_type,
        subtotal: parseFloat(cart.subtotal) || 0,
        taxAmount: parseFloat(cart.tax_amount) || 0,
        deliveryFee: parseFloat(cart.delivery_fee) || 0,
        discountAmount: parseFloat(cart.discount_amount) || 0,
        totalAmount: parseFloat(cart.total_amount) || 0,
        promotionCode: cart.promotion_code,
        items: cart.items || [],
        itemCount: (cart.items || []).reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// ============================================================================
// POST /api/cart/items - Add item to cart
// ============================================================================
router.post('/items', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { businessId, menuItemId, quantity = 1, customizations = [], specialInstructions = '' } = req.body;

    if (!businessId || !menuItemId) {
      return res.status(400).json({ error: 'Business ID and menu item ID are required' });
    }

    // Get menu item details
    const menuResult = await client.query(`
      SELECT id, title, description, price, background_image, business_id
      FROM menus WHERE id = $1
    `, [menuItemId]);

    if (menuResult.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const menuItem = menuResult.rows[0];
    
    // Verify menu item belongs to the specified business
    if (menuItem.business_id !== businessId) {
      return res.status(400).json({ error: 'Menu item does not belong to this business' });
    }

    // Get or create active cart for this business
    let cartResult = await client.query(`
      SELECT id FROM shopping_carts
      WHERE user_id = $1 AND business_id = $2 AND tenant_id = $3 AND status = 'active'
    `, [userId, businessId, tenantId]);

    let cartId;
    if (cartResult.rows.length === 0) {
      // Create new cart
      const newCartResult = await client.query(`
        INSERT INTO shopping_carts (user_id, business_id, tenant_id, status)
        VALUES ($1, $2, $3, 'active')
        RETURNING id
      `, [userId, businessId, tenantId]);
      cartId = newCartResult.rows[0].id;
    } else {
      cartId = cartResult.rows[0].id;
    }

    const unitPrice = parseFloat(menuItem.price);
    const totalPrice = unitPrice * quantity;

    // Check if item already exists in cart
    const existingItem = await client.query(`
      SELECT id, quantity FROM cart_items
      WHERE cart_id = $1 AND menu_item_id = $2 AND customizations = $3::jsonb
    `, [cartId, menuItemId, JSON.stringify(customizations)]);

    let cartItem;
    if (existingItem.rows.length > 0) {
      // Update existing item quantity
      const newQuantity = existingItem.rows[0].quantity + quantity;
      const updateResult = await client.query(`
        UPDATE cart_items
        SET quantity = $1, total_price = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `, [newQuantity, unitPrice * newQuantity, existingItem.rows[0].id]);
      cartItem = updateResult.rows[0];
    } else {
      // Insert new cart item
      const insertResult = await client.query(`
        INSERT INTO cart_items (
          cart_id, menu_item_id, tenant_id, item_name, item_description,
          item_image_url, quantity, unit_price, total_price, customizations, special_instructions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        cartId, menuItemId, tenantId, menuItem.title, menuItem.description,
        menuItem.background_image, quantity, unitPrice, totalPrice,
        JSON.stringify(customizations), specialInstructions
      ]);
      cartItem = insertResult.rows[0];
    }

    // Update cart totals (trigger should handle subtotal, but we'll update total_amount)
    await client.query(`
      UPDATE shopping_carts
      SET
        total_amount = subtotal + tax_amount + delivery_fee - discount_amount,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [cartId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Item added to cart',
      cartItem: {
        id: cartItem.id,
        menuItemId: cartItem.menu_item_id,
        itemName: cartItem.item_name,
        quantity: cartItem.quantity,
        unitPrice: parseFloat(cartItem.unit_price),
        totalPrice: parseFloat(cartItem.total_price)
      },
      cartId
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding item to cart:', error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  } finally {
    client.release();
  }
});

// ============================================================================
// PUT /api/cart/items/:itemId - Update cart item quantity
// ============================================================================
router.put('/items/:itemId', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { itemId } = req.params;
    const { quantity, specialInstructions } = req.body;

    console.log('📝 PUT /items/:itemId - Request details:', {
      itemId,
      quantity,
      quantityType: typeof quantity,
      specialInstructions,
      body: req.body
    });

    if (quantity !== undefined && quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1. Use DELETE to remove items.' });
    }

    // Verify item belongs to user's cart
    const itemResult = await client.query(`
      SELECT ci.*, sc.user_id
      FROM cart_items ci
      JOIN shopping_carts sc ON ci.cart_id = sc.id
      WHERE ci.id = $1 AND sc.tenant_id = $2
    `, [itemId, tenantId]);

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    const item = itemResult.rows[0];
    if (item.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update item
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (quantity !== undefined) {
      updates.push(`quantity = $${paramCount}, total_price = unit_price * $${paramCount}`);
      values.push(parseInt(quantity, 10)); // Ensure integer type
      paramCount++;
    }

    if (specialInstructions !== undefined) {
      updates.push(`special_instructions = $${paramCount}`);
      values.push(specialInstructions);
      paramCount++;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(itemId);

    const updateResult = await client.query(`
      UPDATE cart_items SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *
    `, values);

    // Update cart totals
    await client.query(`
      UPDATE shopping_carts
      SET total_amount = subtotal + tax_amount + delivery_fee - discount_amount, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [item.cart_id]);

    await client.query('COMMIT');

    const updatedItem = updateResult.rows[0];
    res.json({
      success: true,
      cartItem: {
        id: updatedItem.id,
        quantity: updatedItem.quantity,
        totalPrice: parseFloat(updatedItem.total_price),
        specialInstructions: updatedItem.special_instructions
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating cart item (PUT):', error);
    console.error('   Error code:', error.code);
    console.error('   Error detail:', error.detail);
    console.error('   SQL state:', error.severity);
    res.status(500).json({
      error: 'Failed to update cart item',
      details: error.message,
      code: error.code
    });
  } finally {
    client.release();
  }
});

// ============================================================================
// DELETE /api/cart/items/:itemId - Remove item from cart
// ============================================================================
router.delete('/items/:itemId', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { itemId } = req.params;

    // Verify item belongs to user's cart
    const itemResult = await client.query(`
      SELECT ci.cart_id, sc.user_id
      FROM cart_items ci
      JOIN shopping_carts sc ON ci.cart_id = sc.id
      WHERE ci.id = $1 AND sc.tenant_id = $2
    `, [itemId, tenantId]);

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (itemResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const cartId = itemResult.rows[0].cart_id;

    // Delete the item
    await client.query('DELETE FROM cart_items WHERE id = $1', [itemId]);

    // Update cart totals
    await client.query(`
      UPDATE shopping_carts
      SET total_amount = subtotal + tax_amount + delivery_fee - discount_amount, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [cartId]);

    // Check if cart is now empty
    const remainingItems = await client.query('SELECT COUNT(*) FROM cart_items WHERE cart_id = $1', [cartId]);

    if (parseInt(remainingItems.rows[0].count) === 0) {
      // Delete empty cart
      await client.query('DELETE FROM shopping_carts WHERE id = $1', [cartId]);
    }

    await client.query('COMMIT');

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error removing cart item:', error);
    res.status(500).json({ error: 'Failed to remove cart item' });
  } finally {
    client.release();
  }
});

// ============================================================================
// DELETE /api/cart/:cartId - Clear entire cart
// ============================================================================
router.delete('/:cartId', async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { cartId } = req.params;

    // Verify cart belongs to user
    const cartResult = await pool.query(`
      SELECT id FROM shopping_carts
      WHERE id = $1 AND user_id = $2 AND tenant_id = $3
    `, [cartId, userId, tenantId]);

    if (cartResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    // Delete cart (cascade will delete items)
    await pool.query('DELETE FROM shopping_carts WHERE id = $1', [cartId]);

    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

// ============================================================================
// PUT /api/cart/:cartId/order-type - Update order type (delivery/pickup)
// ============================================================================
router.put('/:cartId/order-type', async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { cartId } = req.params;
    const { orderType } = req.body;

    if (!['delivery', 'pickup', 'dine_in'].includes(orderType)) {
      return res.status(400).json({ error: 'Invalid order type' });
    }

    const result = await pool.query(`
      UPDATE shopping_carts
      SET order_type = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3 AND tenant_id = $4
      RETURNING order_type
    `, [orderType, cartId, userId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    res.json({ success: true, orderType: result.rows[0].order_type });
  } catch (error) {
    console.error('Error updating order type:', error);
    res.status(500).json({ error: 'Failed to update order type' });
  }
});

// ============================================================================
// POST /api/cart/:cartId/promo - Apply promotion code
// ============================================================================
router.post('/:cartId/promo', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { cartId } = req.params;
    const { promoCode } = req.body;

    if (!promoCode) {
      return res.status(400).json({ error: 'Promo code is required' });
    }

    // Verify cart belongs to user
    const cartResult = await client.query(`
      SELECT id, business_id, subtotal FROM shopping_carts
      WHERE id = $1 AND user_id = $2 AND tenant_id = $3
    `, [cartId, userId, tenantId]);

    if (cartResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const cart = cartResult.rows[0];

    // Find valid promotion
    const promoResult = await client.query(`
      SELECT id, discount_type, discount_value, minimum_order, max_discount
      FROM promotions
      WHERE code = $1 AND tenant_id = $2
        AND (business_id IS NULL OR business_id = $3)
        AND status = 'active'
        AND start_date <= CURRENT_TIMESTAMP
        AND end_date >= CURRENT_TIMESTAMP
    `, [promoCode.toUpperCase(), tenantId, cart.business_id]);

    if (promoResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired promo code' });
    }

    const promo = promoResult.rows[0];
    const subtotal = parseFloat(cart.subtotal);

    // Check minimum order
    if (promo.minimum_order && subtotal < parseFloat(promo.minimum_order)) {
      return res.status(400).json({
        error: `Minimum order of ${promo.minimum_order} required for this promo`
      });
    }

    // Calculate discount
    let discountAmount;
    if (promo.discount_type === 'percentage') {
      discountAmount = subtotal * (parseFloat(promo.discount_value) / 100);
      if (promo.max_discount) {
        discountAmount = Math.min(discountAmount, parseFloat(promo.max_discount));
      }
    } else {
      discountAmount = parseFloat(promo.discount_value);
    }

    // Update cart with promo
    await client.query(`
      UPDATE shopping_carts
      SET promotion_id = $1, promotion_code = $2, discount_amount = $3,
          total_amount = subtotal + tax_amount + delivery_fee - $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [promo.id, promoCode.toUpperCase(), discountAmount, cartId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Promo code applied',
      discountAmount,
      promoCode: promoCode.toUpperCase()
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error applying promo code:', error);
    res.status(500).json({ error: 'Failed to apply promo code' });
  } finally {
    client.release();
  }
});

module.exports = router;

