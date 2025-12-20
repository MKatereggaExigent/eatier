const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');

// ============================================================================
// GET /api/member-promotions - Get active promotions for logged-in users
// ============================================================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;

    // Get user's order count for targeting
    const orderCountResult = await pool.query(
      `SELECT COUNT(*) FROM orders WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );
    const orderCount = parseInt(orderCountResult.rows[0].count);
    const userType = orderCount === 0 ? 'new_user' : 'returning_user';

    const result = await pool.query(
      `SELECT mp.*, 
              (SELECT COUNT(*) FROM user_promotion_usage upu 
               WHERE upu.promotion_id = mp.id AND upu.user_id = $1) as user_uses
       FROM member_promotions mp
       WHERE mp.tenant_id = $2
         AND mp.is_active = true
         AND mp.valid_from <= NOW()
         AND mp.valid_to >= NOW()
         AND (mp.max_total_uses IS NULL OR mp.current_uses < mp.max_total_uses)
         AND (mp.min_orders_required <= $3)
         AND (array_length(mp.target_user_types, 1) IS NULL OR $4 = ANY(mp.target_user_types))
       ORDER BY mp.is_featured DESC, mp.discount_value DESC`,
      [userId, tenantId, orderCount, userType]
    );

    const promotions = result.rows
      .filter(p => p.user_uses < p.max_uses_per_user)
      .map(promo => ({
        id: promo.id,
        title: promo.title,
        description: promo.description,
        code: promo.promotion_code,
        discountType: promo.discount_type,
        discountValue: parseFloat(promo.discount_value),
        maxDiscountAmount: promo.max_discount_amount ? parseFloat(promo.max_discount_amount) : null,
        minOrderAmount: parseFloat(promo.min_order_amount),
        validUntil: promo.valid_to,
        isFeatured: promo.is_featured,
        usesRemaining: promo.max_uses_per_user - promo.user_uses
      }));

    res.json({ promotions });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ error: 'Failed to fetch promotions' });
  }
});

// ============================================================================
// POST /api/member-promotions/validate - Validate a promotion code
// ============================================================================
router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { code, orderAmount = 0 } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Promotion code is required' });
    }

    const result = await pool.query(
      `SELECT * FROM member_promotions 
       WHERE promotion_code = $1 AND tenant_id = $2`,
      [code.toUpperCase(), tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ valid: false, error: 'Invalid promotion code' });
    }

    const promo = result.rows[0];

    // Check if active
    if (!promo.is_active) {
      return res.json({ valid: false, error: 'This promotion is no longer active' });
    }

    // Check validity dates
    const now = new Date();
    if (now < new Date(promo.valid_from) || now > new Date(promo.valid_to)) {
      return res.json({ valid: false, error: 'This promotion has expired' });
    }

    // Check total uses
    if (promo.max_total_uses && promo.current_uses >= promo.max_total_uses) {
      return res.json({ valid: false, error: 'This promotion has reached its usage limit' });
    }

    // Check user usage
    const usageResult = await pool.query(
      `SELECT COUNT(*) FROM user_promotion_usage 
       WHERE user_id = $1 AND promotion_id = $2`,
      [userId, promo.id]
    );
    if (parseInt(usageResult.rows[0].count) >= promo.max_uses_per_user) {
      return res.json({ valid: false, error: 'You have already used this promotion' });
    }

    // Check minimum order amount
    if (orderAmount < promo.min_order_amount) {
      return res.json({ 
        valid: false, 
        error: `Minimum order amount of $${promo.min_order_amount} required` 
      });
    }

    // Calculate discount
    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = orderAmount * (promo.discount_value / 100);
      if (promo.max_discount_amount) {
        discount = Math.min(discount, promo.max_discount_amount);
      }
    } else if (promo.discount_type === 'fixed_amount') {
      discount = promo.discount_value;
    } else if (promo.discount_type === 'free_delivery') {
      discount = 5.00; // Standard delivery fee
    }

    res.json({
      valid: true,
      promotion: {
        id: promo.id,
        title: promo.title,
        discountType: promo.discount_type,
        discountValue: parseFloat(promo.discount_value),
        calculatedDiscount: discount
      }
    });
  } catch (error) {
    console.error('Error validating promotion:', error);
    res.status(500).json({ error: 'Failed to validate promotion' });
  }
});

module.exports = router;

