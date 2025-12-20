const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Generate order number
function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

// ============================================================================
// GET /api/orders - Get current user's order history
// ============================================================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { status, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT o.*, b.name as business_name, b.logo_url as business_logo,
             b.address as business_address
      FROM orders o
      LEFT JOIN businesses b ON o.business_id = b.id
      WHERE o.user_id = $1 AND o.tenant_id = $2
    `;
    const params = [userId, tenantId];
    let paramIndex = 3;

    if (status) {
      query += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM orders WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    res.json({
      orders: result.rows.map(order => ({
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        orderType: order.order_type,
        items: order.items,
        subtotal: parseFloat(order.subtotal),
        taxAmount: parseFloat(order.tax_amount),
        deliveryFee: parseFloat(order.delivery_fee),
        discountAmount: parseFloat(order.discount_amount),
        totalAmount: parseFloat(order.total_amount),
        business: {
          id: order.business_id,
          name: order.business_name,
          logo: order.business_logo,
          address: order.business_address
        },
        deliveryAddress: order.delivery_address,
        estimatedDeliveryTime: order.estimated_delivery_time,
        orderRating: order.order_rating,
        deliveryRating: order.delivery_rating,
        createdAt: order.created_at
      })),
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ============================================================================
// GET /api/orders/:id - Get single order details
// ============================================================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT o.*, b.name as business_name, b.logo_url as business_logo,
              b.address as business_address, b.phone as business_phone
       FROM orders o
       LEFT JOIN businesses b ON o.business_id = b.id
       WHERE o.id = $1 AND o.user_id = $2 AND o.tenant_id = $3`,
      [id, userId, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];

    // Get order items
    const itemsResult = await pool.query(
      `SELECT * FROM order_items WHERE order_id = $1`,
      [id]
    );

    res.json({
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      orderType: order.order_type,
      items: itemsResult.rows.map(item => ({
        id: item.id,
        menuItemId: item.menu_item_id,
        name: item.item_name,
        description: item.item_description,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price),
        totalPrice: parseFloat(item.total_price),
        customizations: item.customizations,
        specialInstructions: item.special_instructions
      })),
      subtotal: parseFloat(order.subtotal),
      taxAmount: parseFloat(order.tax_amount),
      deliveryFee: parseFloat(order.delivery_fee),
      discountAmount: parseFloat(order.discount_amount),
      totalAmount: parseFloat(order.total_amount),
      promotionCode: order.promotion_code,
      business: {
        id: order.business_id,
        name: order.business_name,
        logo: order.business_logo,
        address: order.business_address,
        phone: order.business_phone
      },
      deliveryAddress: order.delivery_address,
      deliveryInstructions: order.delivery_instructions,
      estimatedDeliveryTime: order.estimated_delivery_time,
      actualDeliveryTime: order.actual_delivery_time,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      orderRating: order.order_rating,
      deliveryRating: order.delivery_rating,
      orderFeedback: order.order_feedback,
      createdAt: order.created_at,
      updatedAt: order.updated_at
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ============================================================================
// POST /api/orders - Create a new order
// ============================================================================
router.post('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const {
      businessId,
      orderType = 'delivery',
      items,
      deliveryAddress,
      deliveryInstructions,
      paymentMethod,
      promotionCode
    } = req.body;

    if (!businessId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Business ID and items are required' });
    }

    // Calculate order totals
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const itemTotal = item.unitPrice * item.quantity;
      subtotal += itemTotal;
      orderItems.push({
        ...item,
        totalPrice: itemTotal
      });
    }

    const taxRate = 0.1; // 10% tax
    const taxAmount = subtotal * taxRate;
    const deliveryFee = orderType === 'delivery' ? 5.00 : 0;
    let discountAmount = 0;
    let promotionId = null;

    // Check for promotion
    if (promotionCode) {
      const promoResult = await client.query(
        `SELECT * FROM member_promotions
         WHERE promotion_code = $1 AND tenant_id = $2
         AND is_active = true AND valid_from <= NOW() AND valid_to >= NOW()
         AND (max_total_uses IS NULL OR current_uses < max_total_uses)`,
        [promotionCode, tenantId]
      );

      if (promoResult.rows.length > 0) {
        const promo = promoResult.rows[0];

        // Check user usage limit
        const usageResult = await client.query(
          `SELECT COUNT(*) FROM user_promotion_usage
           WHERE user_id = $1 AND promotion_id = $2`,
          [userId, promo.id]
        );

        if (parseInt(usageResult.rows[0].count) < promo.max_uses_per_user) {
          if (subtotal >= promo.min_order_amount) {
            if (promo.discount_type === 'percentage') {
              discountAmount = subtotal * (promo.discount_value / 100);
              if (promo.max_discount_amount) {
                discountAmount = Math.min(discountAmount, promo.max_discount_amount);
              }
            } else if (promo.discount_type === 'fixed_amount') {
              discountAmount = promo.discount_value;
            } else if (promo.discount_type === 'free_delivery') {
              discountAmount = deliveryFee;
            }
            promotionId = promo.id;
          }
        }
      }
    }

    const totalAmount = subtotal + taxAmount + deliveryFee - discountAmount;
    const orderNumber = generateOrderNumber();

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (
        user_id, business_id, tenant_id, order_number, status, order_type,
        items, subtotal, tax_amount, delivery_fee, discount_amount, total_amount,
        promotion_id, promotion_code, delivery_address, delivery_instructions,
        payment_method, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        userId, businessId, tenantId, orderNumber, 'pending', orderType,
        JSON.stringify(orderItems), subtotal, taxAmount, deliveryFee, discountAmount, totalAmount,
        promotionId, promotionCode, JSON.stringify(deliveryAddress), deliveryInstructions,
        paymentMethod, 'pending'
      ]
    );

    const order = orderResult.rows[0];

    // Insert order items
    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (
          order_id, menu_item_id, tenant_id, item_name, item_description,
          quantity, unit_price, total_price, customizations, special_instructions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          order.id, item.menuItemId, tenantId, item.name, item.description,
          item.quantity, item.unitPrice, item.totalPrice,
          JSON.stringify(item.customizations || {}), item.specialInstructions
        ]
      );
    }

    // Record promotion usage if applicable
    if (promotionId) {
      await client.query(
        `INSERT INTO user_promotion_usage (user_id, promotion_id, order_id, tenant_id, discount_applied)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, promotionId, order.id, tenantId, discountAmount]
      );

      await client.query(
        `UPDATE member_promotions SET current_uses = current_uses + 1 WHERE id = $1`,
        [promotionId]
      );
    }

    // Record activity
    await client.query(
      `INSERT INTO user_activity_feed (user_id, tenant_id, activity_type, reference_type, reference_id, metadata)
       VALUES ($1, $2, 'order', 'order', $3, $4)`,
      [userId, tenantId, order.id, JSON.stringify({ orderNumber, totalAmount, businessId })]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        totalAmount: parseFloat(order.total_amount),
        discountApplied: discountAmount > 0,
        discountAmount: discountAmount
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

// ============================================================================
// POST /api/orders/:id/reorder - Reorder a previous order
// ============================================================================
router.post('/:id/reorder', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    // Get original order
    const orderResult = await pool.query(
      `SELECT * FROM orders WHERE id = $1 AND user_id = $2 AND tenant_id = $3`,
      [id, userId, tenantId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Original order not found' });
    }

    const originalOrder = orderResult.rows[0];

    // Return the items for the frontend to use
    res.json({
      message: 'Ready to reorder',
      businessId: originalOrder.business_id,
      items: originalOrder.items,
      originalOrderId: originalOrder.id
    });
  } catch (error) {
    console.error('Error preparing reorder:', error);
    res.status(500).json({ error: 'Failed to prepare reorder' });
  }
});

// ============================================================================
// PATCH /api/orders/:id/rate - Rate an order
// ============================================================================
router.patch('/:id/rate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { orderRating, deliveryRating, feedback } = req.body;

    const result = await pool.query(
      `UPDATE orders
       SET order_rating = COALESCE($1, order_rating),
           delivery_rating = COALESCE($2, delivery_rating),
           order_feedback = COALESCE($3, order_feedback),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND user_id = $5 AND tenant_id = $6
       RETURNING *`,
      [orderRating, deliveryRating, feedback, id, userId, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order rated successfully' });
  } catch (error) {
    console.error('Error rating order:', error);
    res.status(500).json({ error: 'Failed to rate order' });
  }
});

module.exports = router;

