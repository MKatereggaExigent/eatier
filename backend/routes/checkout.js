const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { calculateDeliveryFee, formatAddress } = require('../services/distanceCalculator');

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================================================
// GET /api/checkout/:cartId/summary - Get checkout summary
// ============================================================================
router.get('/:cartId/summary', async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { cartId } = req.params;

    // Get cart with items
    const cartResult = await pool.query(`
      SELECT 
        sc.*,
        b.business_name,
        b.logo_url as business_logo,
        b.address as business_address,
        b.phone as business_phone,
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
      WHERE sc.id = $1 AND sc.user_id = $2 AND sc.tenant_id = $3 AND sc.status = 'active'
    `, [cartId, userId, tenantId]);

    if (cartResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const cart = cartResult.rows[0];

    // Get user's saved addresses
    const addressesResult = await pool.query(`
      SELECT * FROM user_delivery_addresses
      WHERE user_id = $1 AND tenant_id = $2 AND is_active = true
      ORDER BY is_default DESC, created_at DESC
    `, [userId, tenantId]);

    // Calculate delivery fee based on distance (if delivery order)
    let deliveryFee = 0;
    let deliveryInfo = null;

    if (cart.order_type === 'delivery') {
      // Delivery fee is 0 until user provides delivery address
      deliveryFee = 0;

      console.log('💰 Delivery fee: 0 ZAR (no address provided yet)');
      console.log('ℹ️  Delivery fee will be calculated when user provides delivery address');
    }

    const taxRate = 0.18; // 18% VAT
    const subtotal = parseFloat(cart.subtotal) || 0;
    const taxAmount = subtotal * taxRate;
    const discountAmount = parseFloat(cart.discount_amount) || 0;
    const totalAmount = subtotal + taxAmount + deliveryFee - discountAmount;

    res.json({
      cart: {
        id: cart.id,
        businessId: cart.business_id,
        businessName: cart.business_name,
        businessLogo: cart.business_logo,
        businessAddress: cart.business_address,
        businessPhone: cart.business_phone,
        orderType: cart.order_type,
        items: cart.items || [],
        itemCount: (cart.items || []).reduce((sum, item) => sum + item.quantity, 0)
      },
      pricing: {
        subtotal,
        taxAmount,
        taxRate: taxRate * 100,
        deliveryFee,
        discountAmount,
        promotionCode: cart.promotion_code,
        totalAmount,
        deliveryInfo: deliveryInfo // Distance, duration, etc.
      },
      savedAddresses: addressesResult.rows.map(addr => ({
        id: addr.id,
        label: addr.label,
        recipientName: addr.recipient_name,
        phone: addr.phone,
        addressLine1: addr.address_line1,
        addressLine2: addr.address_line2,
        city: addr.city,
        isDefault: addr.is_default
      })),
      scheduledTime: cart.scheduled_time,
      deliveryInstructions: cart.delivery_instructions
    });
  } catch (error) {
    console.error('Error fetching checkout summary:', error);
    res.status(500).json({ error: 'Failed to fetch checkout summary' });
  }
});

// ============================================================================
// POST /api/checkout/:cartId - Process checkout and create order
// ============================================================================
router.post('/:cartId', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { cartId } = req.params;
    const {
      deliveryAddress,
      deliveryInstructions,
      scheduledTime,
      paymentMethod = 'cash',
      saveAddress = false,
      addressLabel = 'Home'
    } = req.body;

    // Get cart with items
    const cartResult = await client.query(`
      SELECT sc.*, 
        (SELECT json_agg(ci.*) FROM cart_items ci WHERE ci.cart_id = sc.id) as items
      FROM shopping_carts sc
      WHERE sc.id = $1 AND sc.user_id = $2 AND sc.tenant_id = $3 AND sc.status = 'active'
    `, [cartId, userId, tenantId]);

    if (cartResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const cart = cartResult.rows[0];
    const items = cart.items || [];

    if (items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Validate delivery address for delivery orders
    if (cart.order_type === 'delivery' && !deliveryAddress) {
      return res.status(400).json({ error: 'Delivery address is required for delivery orders' });
    }

    // Calculate delivery fee based on distance (if delivery order)
    let deliveryFee = 0;
    let deliveryInfo = null;

    if (cart.order_type === 'delivery') {
      // Delivery fee is 0 until user provides delivery address
      deliveryFee = 0;

      console.log('💰 Delivery fee: 0 UGX (address not provided yet)');
      console.log('ℹ️  Delivery fee will be calculated when user provides delivery address');
    }

    // Calculate final pricing
    const subtotal = parseFloat(cart.subtotal) || 0;
    const taxRate = 0.18;
    const taxAmount = subtotal * taxRate;
    const discountAmount = parseFloat(cart.discount_amount) || 0;
    const totalAmount = subtotal + taxAmount + deliveryFee - discountAmount;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Format items for order
    const orderItems = items.map(item => ({
      menuItemId: item.menu_item_id,
      name: item.item_name,
      description: item.item_description,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unit_price),
      totalPrice: parseFloat(item.total_price),
      customizations: item.customizations,
      specialInstructions: item.special_instructions
    }));

    // Create order
    const orderResult = await client.query(`
      INSERT INTO orders (
        user_id, business_id, tenant_id, order_number, status, order_type,
        items, subtotal, tax_amount, delivery_fee, discount_amount, total_amount,
        promotion_id, promotion_code, delivery_address, delivery_instructions,
        payment_method, payment_status, estimated_delivery_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      userId, cart.business_id, tenantId, orderNumber, 'pending', cart.order_type,
      JSON.stringify(orderItems), subtotal, taxAmount, deliveryFee, discountAmount, totalAmount,
      cart.promotion_id, cart.promotion_code, JSON.stringify(deliveryAddress), deliveryInstructions,
      paymentMethod, 'pending',
      scheduledTime || new Date(Date.now() + 45 * 60 * 1000) // Default 45 min from now
    ]);

    const order = orderResult.rows[0];

    // Insert order items into order_items table for detailed tracking
    for (const item of items) {
      await client.query(`
        INSERT INTO order_items (
          order_id, menu_item_id, tenant_id, item_name, item_description,
          quantity, unit_price, total_price, customizations, special_instructions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        order.id, item.menu_item_id, tenantId, item.item_name, item.item_description,
        item.quantity, item.unit_price, item.total_price,
        JSON.stringify(item.customizations || {}), item.special_instructions
      ]);
    }

    // Create initial order status history
    await client.query(`
      INSERT INTO order_status_history (order_id, tenant_id, status, changed_by)
      VALUES ($1, $2, 'pending', $3)
    `, [order.id, tenantId, userId]);

    // Save delivery address if requested
    if (saveAddress && deliveryAddress && cart.order_type === 'delivery') {
      await client.query(`
        INSERT INTO user_delivery_addresses (
          user_id, tenant_id, label, recipient_name, phone,
          address_line1, address_line2, city, state, postal_code, country,
          latitude, longitude, delivery_instructions, is_default
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT DO NOTHING
      `, [
        userId, tenantId, addressLabel,
        deliveryAddress.recipientName || null,
        deliveryAddress.phone || null,
        deliveryAddress.addressLine1,
        deliveryAddress.addressLine2 || null,
        deliveryAddress.city,
        deliveryAddress.state || null,
        deliveryAddress.postalCode || null,
        deliveryAddress.country || 'Uganda',
        deliveryAddress.latitude || null,
        deliveryAddress.longitude || null,
        deliveryInstructions || null,
        false
      ]);
    }

    // Mark cart as converted
    await client.query(`
      UPDATE shopping_carts SET status = 'converted', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [cartId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Order placed successfully',
      order: {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        orderType: order.order_type,
        totalAmount: parseFloat(order.total_amount),
        estimatedDeliveryTime: order.estimated_delivery_time,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing checkout:', error);
    res.status(500).json({ error: 'Failed to process checkout' });
  } finally {
    client.release();
  }
});

// ============================================================================
// POST /api/checkout/addresses - Save a new delivery address
// ============================================================================
router.post('/addresses', async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const {
      label = 'Home',
      recipientName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country = 'Uganda',
      latitude,
      longitude,
      deliveryInstructions,
      isDefault = false
    } = req.body;

    if (!addressLine1 || !city) {
      return res.status(400).json({ error: 'Address line 1 and city are required' });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await pool.query(`
        UPDATE user_delivery_addresses SET is_default = false
        WHERE user_id = $1 AND tenant_id = $2
      `, [userId, tenantId]);
    }

    const result = await pool.query(`
      INSERT INTO user_delivery_addresses (
        user_id, tenant_id, label, recipient_name, phone,
        address_line1, address_line2, city, state, postal_code, country,
        latitude, longitude, delivery_instructions, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      userId, tenantId, label, recipientName, phone,
      addressLine1, addressLine2, city, state, postalCode, country,
      latitude, longitude, deliveryInstructions, isDefault
    ]);

    const addr = result.rows[0];
    res.json({
      success: true,
      address: {
        id: addr.id,
        label: addr.label,
        recipientName: addr.recipient_name,
        phone: addr.phone,
        addressLine1: addr.address_line1,
        addressLine2: addr.address_line2,
        city: addr.city,
        isDefault: addr.is_default
      }
    });
  } catch (error) {
    console.error('Error saving address:', error);
    res.status(500).json({ error: 'Failed to save address' });
  }
});

// ============================================================================
// GET /api/checkout/addresses - Get user's saved addresses
// ============================================================================
router.get('/addresses', async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      SELECT * FROM user_delivery_addresses
      WHERE user_id = $1 AND tenant_id = $2 AND is_active = true
      ORDER BY is_default DESC, created_at DESC
    `, [userId, tenantId]);

    res.json({
      addresses: result.rows.map(addr => ({
        id: addr.id,
        label: addr.label,
        recipientName: addr.recipient_name,
        phone: addr.phone,
        addressLine1: addr.address_line1,
        addressLine2: addr.address_line2,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postal_code,
        country: addr.country,
        latitude: addr.latitude,
        longitude: addr.longitude,
        deliveryInstructions: addr.delivery_instructions,
        isDefault: addr.is_default
      }))
    });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// ============================================================================
// DELETE /api/checkout/addresses/:addressId - Delete saved address
// ============================================================================
router.delete('/addresses/:addressId', async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { addressId } = req.params;

    const result = await pool.query(`
      UPDATE user_delivery_addresses
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND tenant_id = $3
      RETURNING id
    `, [addressId, userId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json({ success: true, message: 'Address deleted' });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

module.exports = router;

