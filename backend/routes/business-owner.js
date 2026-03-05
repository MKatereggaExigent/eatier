const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireBusinessOwner } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireBusinessOwner);

// ===================================
// BUSINESS PROFILE MANAGEMENT
// ===================================

/**
 * GET /api/business-owner/my-business
 * Get current user's business profile with subscription data
 */
router.get('/my-business', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      SELECT
        b.*,
        u.first_name || ' ' || u.last_name as owner_name,
        u.email as owner_email,
        u.phone as owner_phone,
        (SELECT COUNT(*) FROM bookings WHERE business_id = b.id) as total_bookings,
        (SELECT COUNT(*) FROM reviews WHERE business_id = b.id AND status = 'published') as total_reviews,
        (SELECT AVG(rating) FROM reviews WHERE business_id = b.id AND status = 'published') as average_rating,
        (SELECT COUNT(*) FROM menus WHERE business_id = b.id) as total_menu_items,
        bs.id as subscription_id,
        bs.plan as subscription_plan,
        bs.status as subscription_status,
        bs.start_date as subscription_start_date,
        bs.end_date as subscription_end_date,
        bs.monthly_price as subscription_price,
        bs.billing_cycle as subscription_billing_cycle,
        bs.features as subscription_features,
        CASE
          WHEN bs.status = 'trial' AND bs.end_date IS NOT NULL THEN
            GREATEST(0, EXTRACT(DAY FROM (bs.end_date - CURRENT_TIMESTAMP)))::integer
          ELSE NULL
        END as trial_days_left
      FROM businesses b
      JOIN users u ON b.owner_id = u.id
      LEFT JOIN business_subscriptions bs ON bs.business_id = b.id
      WHERE b.owner_id = $1 AND b.tenant_id = $2
      LIMIT 1
    `, [userId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = result.rows[0];

    // Structure subscription data separately for cleaner response
    const subscription = business.subscription_id ? {
      id: business.subscription_id,
      plan: business.subscription_plan,
      status: business.subscription_status,
      startDate: business.subscription_start_date,
      endDate: business.subscription_end_date,
      price: business.subscription_price,
      billingCycle: business.subscription_billing_cycle,
      features: business.subscription_features,
      trialDaysLeft: business.trial_days_left
    } : null;

    // Remove subscription fields from business object
    delete business.subscription_id;
    delete business.subscription_plan;
    delete business.subscription_status;
    delete business.subscription_start_date;
    delete business.subscription_end_date;
    delete business.subscription_price;
    delete business.subscription_billing_cycle;
    delete business.subscription_features;
    delete business.trial_days_left;

    res.json({ business, subscription });

  } catch (error) {
    console.error('Error fetching business:', error);
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

/**
 * PUT /api/business-owner/my-business
 * Update current user's business profile
 */
router.put('/my-business', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    const {
      businessName,
      businessType,
      email,
      phone,
      country,
      address,
      sustainabilityEthos,
      opensAt,
      closesAt,
      facilities
    } = req.body;

    // Verify business ownership
    const ownerCheck = await pool.query(`
      SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = ownerCheck.rows[0].id;

    // Update business
    const result = await pool.query(`
      UPDATE businesses
      SET
        business_name = COALESCE($1, business_name),
        business_type = COALESCE($2, business_type),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        country = COALESCE($5, country),
        address = COALESCE($6, address),
        sustainability_ethos = COALESCE($7, sustainability_ethos),
        opens_at = COALESCE($8, opens_at),
        closes_at = COALESCE($9, closes_at),
        facilities = COALESCE($10, facilities),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11 AND tenant_id = $12
      RETURNING *
    `, [
      businessName, businessType, email, phone, country, address,
      sustainabilityEthos, opensAt, closesAt, facilities,
      businessId, tenantId
    ]);

    res.json({
      message: 'Business updated successfully',
      business: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating business:', error);
    res.status(500).json({ error: 'Failed to update business' });
  }
});

// ===================================
// BUSINESS HOURS MANAGEMENT
// ===================================

/**
 * GET /api/business-owner/hours
 * Get business hours
 */
router.get('/hours', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    // Get business ID
    const businessResult = await pool.query(`
      SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    // Get hours
    const result = await pool.query(`
      SELECT * FROM business_hours
      WHERE business_id = $1
      ORDER BY day_of_week
    `, [businessId]);

    res.json({ hours: result.rows });

  } catch (error) {
    console.error('Error fetching business hours:', error);
    res.status(500).json({ error: 'Failed to fetch business hours' });
  }
});

/**
 * PUT /api/business-owner/hours
 * Update business hours
 */
router.put('/hours', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { hours } = req.body; // Array of {day_of_week, open_time, close_time, is_closed}

    if (!Array.isArray(hours)) {
      return res.status(400).json({ error: 'Hours must be an array' });
    }

    // Get business ID
    const businessResult = await pool.query(`
      SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    // Delete existing hours
    await pool.query(`DELETE FROM business_hours WHERE business_id = $1`, [businessId]);

    // Insert new hours
    for (const hour of hours) {
      await pool.query(`
        INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed)
        VALUES ($1, $2, $3, $4, $5)
      `, [businessId, hour.day_of_week, hour.open_time, hour.close_time, hour.is_closed || false]);
    }

    // Get updated hours
    const result = await pool.query(`
      SELECT * FROM business_hours
      WHERE business_id = $1
      ORDER BY day_of_week
    `, [businessId]);

    res.json({
      message: 'Business hours updated successfully',
      hours: result.rows
    });

  } catch (error) {
    console.error('Error updating business hours:', error);
    res.status(500).json({ error: 'Failed to update business hours' });
  }
});

// ===================================
// BUSINESS PHOTOS MANAGEMENT
// ===================================

/**
 * GET /api/business-owner/photos
 * Get business photos
 */
router.get('/photos', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    // Get business ID
    const businessResult = await pool.query(`
      SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    // Get photos
    const result = await pool.query(`
      SELECT * FROM business_photos
      WHERE business_id = $1
      ORDER BY is_primary DESC, display_order ASC
    `, [businessId]);

    res.json({ photos: result.rows });

  } catch (error) {
    console.error('Error fetching business photos:', error);
    res.status(500).json({ error: 'Failed to fetch business photos' });
  }
});

/**
 * POST /api/business-owner/photos
 * Add business photo
 */
router.post('/photos', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { photo_url, caption, photo_type, is_primary } = req.body;

    if (!photo_url) {
      return res.status(400).json({ error: 'Photo URL is required' });
    }

    // Get business ID
    const businessResult = await pool.query(`
      SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    // If setting as primary, unset other primary photos
    if (is_primary) {
      await pool.query(`
        UPDATE business_photos SET is_primary = FALSE WHERE business_id = $1
      `, [businessId]);
    }

    // Get next display order
    const orderResult = await pool.query(`
      SELECT COALESCE(MAX(display_order), 0) + 1 as next_order
      FROM business_photos WHERE business_id = $1
    `, [businessId]);

    const displayOrder = orderResult.rows[0].next_order;

    // Insert photo
    const result = await pool.query(`
      INSERT INTO business_photos (business_id, photo_url, caption, photo_type, is_primary, display_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [businessId, photo_url, caption, photo_type || 'general', is_primary || false, displayOrder]);

    res.status(201).json({
      message: 'Photo added successfully',
      photo: result.rows[0]
    });

  } catch (error) {
    console.error('Error adding business photo:', error);
    res.status(500).json({ error: 'Failed to add business photo' });
  }
});

/**
 * DELETE /api/business-owner/photos/:id
 * Delete business photo
 */
router.delete('/photos/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const photoId = req.params.id;

    // Verify ownership
    const ownerCheck = await pool.query(`
      SELECT bp.id FROM business_photos bp
      JOIN businesses b ON bp.business_id = b.id
      WHERE bp.id = $1 AND b.owner_id = $2 AND b.tenant_id = $3
    `, [photoId, userId, tenantId]);

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Delete photo
    await pool.query(`DELETE FROM business_photos WHERE id = $1`, [photoId]);

    res.json({ message: 'Photo deleted successfully' });

  } catch (error) {
    console.error('Error deleting business photo:', error);
    res.status(500).json({ error: 'Failed to delete business photo' });
  }
});

// ===================================
// MENU MANAGEMENT
// ===================================

/**
 * GET /api/business-owner/menu
 * Get all menu items for current business
 */
router.get('/menu', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    // Get business ID
    const businessResult = await pool.query(`
      SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    // Get menu items
    const result = await pool.query(`
      SELECT * FROM menus
      WHERE business_id = $1 AND tenant_id = $2
      ORDER BY category, title
    `, [businessId, tenantId]);

    res.json({ menu: result.rows });

  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

/**
 * POST /api/business-owner/menu
 * Create new menu item
 */
router.post('/menu', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { title, description, price, category, background_image } = req.body;

    if (!title || !price || !category) {
      return res.status(400).json({ error: 'Title, price, and category are required' });
    }

    // Get business ID
    const businessResult = await pool.query(`
      SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    // Insert menu item
    const result = await pool.query(`
      INSERT INTO menus (tenant_id, business_id, title, description, price, category, background_image, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [tenantId, businessId, title, description || '', price, category, background_image, true]);

    res.status(201).json({
      message: 'Menu item created successfully',
      item: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

/**
 * PUT /api/business-owner/menu/:id
 * Update menu item
 */
router.put('/menu/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const menuId = req.params.id;
    const { title, description, price, category, background_image, is_active } = req.body;

    // Verify ownership
    const ownerCheck = await pool.query(`
      SELECT m.id FROM menus m
      JOIN businesses b ON m.business_id = b.id
      WHERE m.id = $1 AND b.owner_id = $2 AND m.tenant_id = $3
    `, [menuId, userId, tenantId]);

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Update menu item
    const result = await pool.query(`
      UPDATE menus
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        category = COALESCE($4, category),
        background_image = COALESCE($5, background_image),
        is_active = COALESCE($6, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [title, description, price, category, background_image, is_active, menuId]);

    res.json({
      message: 'Menu item updated successfully',
      item: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

/**
 * DELETE /api/business-owner/menu/:id
 * Delete menu item
 */
router.delete('/menu/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const menuId = req.params.id;

    // Verify ownership
    const ownerCheck = await pool.query(`
      SELECT m.id FROM menus m
      JOIN businesses b ON m.business_id = b.id
      WHERE m.id = $1 AND b.owner_id = $2 AND m.tenant_id = $3
    `, [menuId, userId, tenantId]);

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Delete menu item
    await pool.query(`DELETE FROM menus WHERE id = $1`, [menuId]);

    res.json({ message: 'Menu item deleted successfully' });

  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

/**
 * PATCH /api/business-owner/menu/:id/availability
 * Toggle menu item availability
 */
router.patch('/menu/:id/availability', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const menuId = req.params.id;
    const { is_active } = req.body;

    // Verify ownership
    const ownerCheck = await pool.query(`
      SELECT m.id FROM menus m
      JOIN businesses b ON m.business_id = b.id
      WHERE m.id = $1 AND b.owner_id = $2 AND m.tenant_id = $3
    `, [menuId, userId, tenantId]);

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Update availability
    const result = await pool.query(`
      UPDATE menus
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [is_active, menuId]);

    res.json({
      message: 'Menu item availability updated successfully',
      item: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating menu item availability:', error);
    res.status(500).json({ error: 'Failed to update menu item availability' });
  }
});

// ===================================
// REVIEWS MANAGEMENT
// ===================================

/**
 * GET /api/business-owner/reviews
 * Get reviews for the business owner's business
 */
router.get('/reviews', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { page = 1, limit = 20, rating } = req.query;
    const offset = (page - 1) * limit;

    // First get the business ID for this owner
    const businessResult = await pool.query(
      'SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2 LIMIT 1',
      [userId, tenantId]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    // Build query to get reviews
    let query = `
      SELECT
        r.*,
        u.first_name || ' ' || u.last_name as customer_name,
        u.email as customer_email,
        u.profile_photo as customer_avatar
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.business_id = $1 AND r.tenant_id = $2
    `;
    const params = [businessId, tenantId];

    // Optional filter by rating
    if (rating) {
      query += ` AND r.rating = $${params.length + 1}`;
      params.push(rating);
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) FROM reviews
      WHERE business_id = $1 AND tenant_id = $2
    `;
    const countParams = [businessId, tenantId];

    if (rating) {
      countQuery += ` AND rating = $3`;
      countParams.push(rating);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      reviews: result.rows,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: offset + result.rows.length < total
      }
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/**
 * POST /api/business-owner/reviews/:reviewId/response
 * Respond to a review
 */
router.post('/reviews/:reviewId/response', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { reviewId } = req.params;
    const { response } = req.body;

    if (!response || response.trim() === '') {
      return res.status(400).json({ error: 'Response cannot be empty' });
    }

    // First get the business ID for this owner
    const businessResult = await pool.query(
      'SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2 LIMIT 1',
      [userId, tenantId]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    // Verify the review belongs to this business
    const reviewCheck = await pool.query(
      'SELECT id FROM reviews WHERE id = $1 AND business_id = $2',
      [reviewId, businessId]
    );

    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found for this business' });
    }

    // Update the review with the owner's response
    const result = await pool.query(`
      UPDATE reviews
      SET response_from_owner = $1, response_date = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [response.trim(), reviewId]);

    res.json({
      message: 'Response added successfully',
      review: result.rows[0]
    });

  } catch (error) {
    console.error('Error responding to review:', error);
    res.status(500).json({ error: 'Failed to respond to review' });
  }
});

// ===================================
// DIGITAL CARD CUSTOMIZATION
// ===================================

/**
 * GET /api/business-owner/digital-card-customization
 * Get digital card customization settings for the business
 */
router.get('/digital-card-customization', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    // Get business ID
    const businessResult = await pool.query(`
      SELECT id, digital_card_customization
      FROM businesses
      WHERE owner_id = $1 AND tenant_id = $2
      LIMIT 1
    `, [userId, tenantId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const customization = businessResult.rows[0].digital_card_customization;

    res.json({
      customization: customization || null
    });

  } catch (error) {
    console.error('Error fetching digital card customization:', error);
    res.status(500).json({ error: 'Failed to fetch customization settings' });
  }
});

/**
 * PUT /api/business-owner/digital-card-customization
 * Update digital card customization settings
 */
router.put('/digital-card-customization', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    const {
      primaryColor,
      secondaryColor,
      logoPosition,
      includeQR,
      includeContact,
      includeSocial
    } = req.body;

    // Validate required fields
    if (!primaryColor || !secondaryColor || !logoPosition) {
      return res.status(400).json({ error: 'Missing required customization fields' });
    }

    // Validate logoPosition
    if (!['top', 'center', 'bottom'].includes(logoPosition)) {
      return res.status(400).json({ error: 'Invalid logo position' });
    }

    // Get business ID
    const businessCheck = await pool.query(`
      SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (businessCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessCheck.rows[0].id;

    // Create customization object
    const customization = {
      primaryColor,
      secondaryColor,
      logoPosition,
      includeQR: includeQR !== undefined ? includeQR : true,
      includeContact: includeContact !== undefined ? includeContact : true,
      includeSocial: includeSocial !== undefined ? includeSocial : true
    };

    // Update business with customization
    const result = await pool.query(`
      UPDATE businesses
      SET
        digital_card_customization = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3
      RETURNING digital_card_customization
    `, [JSON.stringify(customization), businessId, tenantId]);

    res.json({
      message: 'Digital card customization updated successfully',
      customization: result.rows[0].digital_card_customization
    });

  } catch (error) {
    console.error('Error updating digital card customization:', error);
    res.status(500).json({ error: 'Failed to update customization settings' });
  }
});

// ===================================
// ACCOUNTS CENTRE - SECURITY
// ===================================

/**
 * POST /api/business-owner/change-password
 * Change user password
 */
router.post('/change-password', async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Get current password hash
    const userResult = await client.query(
      'SELECT password_hash FROM users WHERE id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );

    // Log activity
    await client.query(`
      INSERT INTO account_activity (user_id, tenant_id, action, details, ip_address)
      VALUES ($1, $2, 'password_changed', $3, $4)
    `, [userId, tenantId, JSON.stringify({ timestamp: new Date() }), req.ip]);

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/business-owner/2fa/enable
 * Enable 2FA for user account
 */
router.post('/2fa/enable', async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { method } = req.body; // 'email' or 'mobile'

    if (!method || !['email', 'mobile'].includes(method)) {
      return res.status(400).json({ error: 'Invalid 2FA method. Must be "email" or "mobile"' });
    }

    // Generate backup codes
    const crypto = require('crypto');
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Generate TOTP secret
    const secret = crypto.randomBytes(32).toString('base64');

    // Update user with 2FA settings
    await client.query(`
      UPDATE users
      SET
        two_factor_enabled = TRUE,
        two_factor_method = $1,
        two_factor_secret = $2,
        two_factor_backup_codes = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND tenant_id = $5
    `, [method, secret, backupCodes, userId, tenantId]);

    // Log activity
    await client.query(`
      INSERT INTO account_activity (user_id, tenant_id, action, details, ip_address)
      VALUES ($1, $2, 'two_factor_enabled', $3, $4)
    `, [userId, tenantId, JSON.stringify({ method, timestamp: new Date() }), req.ip]);

    res.json({
      message: '2FA enabled successfully',
      method,
      backupCodes
    });

  } catch (error) {
    console.error('Error enabling 2FA:', error);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/business-owner/2fa/disable
 * Disable 2FA for user account
 */
router.post('/2fa/disable', async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    // Update user to disable 2FA
    await client.query(`
      UPDATE users
      SET
        two_factor_enabled = FALSE,
        two_factor_method = NULL,
        two_factor_secret = NULL,
        two_factor_backup_codes = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    // Log activity
    await client.query(`
      INSERT INTO account_activity (user_id, tenant_id, action, details, ip_address)
      VALUES ($1, $2, 'two_factor_disabled', $3, $4)
    `, [userId, tenantId, JSON.stringify({ timestamp: new Date() }), req.ip]);

    res.json({ message: '2FA disabled successfully' });

  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/business-owner/2fa/status
 * Get 2FA status for user
 */
router.get('/2fa/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      SELECT two_factor_enabled, two_factor_method, phone_verified
      FROM users
      WHERE id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      enabled: user.two_factor_enabled || false,
      method: user.two_factor_method || null,
      phoneVerified: user.phone_verified || false
    });

  } catch (error) {
    console.error('Error fetching 2FA status:', error);
    res.status(500).json({ error: 'Failed to fetch 2FA status' });
  }
});

/**
 * GET /api/business-owner/sessions
 * Get all active sessions for user
 */
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      SELECT
        id,
        device_name,
        device_type,
        browser,
        os,
        ip_address,
        location,
        is_active,
        last_activity,
        created_at
      FROM user_sessions
      WHERE user_id = $1 AND tenant_id = $2 AND is_active = TRUE
      ORDER BY last_activity DESC
    `, [userId, tenantId]);

    res.json({ sessions: result.rows });

  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * DELETE /api/business-owner/sessions/:sessionId
 * Revoke a specific session
 */
router.delete('/sessions/:sessionId', async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { sessionId } = req.params;

    // Mark session as inactive
    const result = await client.query(`
      UPDATE user_sessions
      SET is_active = FALSE
      WHERE id = $1 AND user_id = $2 AND tenant_id = $3
      RETURNING id
    `, [sessionId, userId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Log activity
    await client.query(`
      INSERT INTO account_activity (user_id, tenant_id, action, details, ip_address)
      VALUES ($1, $2, 'session_revoked', $3, $4)
    `, [userId, tenantId, JSON.stringify({ sessionId, timestamp: new Date() }), req.ip]);

    res.json({ message: 'Session revoked successfully' });

  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  } finally {
    client.release();
  }
});

// ===================================
// ACCOUNTS CENTRE - ACTIVITY
// ===================================

/**
 * GET /api/business-owner/activity
 * Get account activity log
 */
router.get('/activity', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT
        id,
        action,
        details,
        ip_address,
        user_agent,
        location,
        status,
        created_at
      FROM account_activity
      WHERE user_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `, [userId, tenantId, limit, offset]);

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM account_activity WHERE user_id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );

    res.json({
      activities: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

// ===================================
// ACCOUNTS CENTRE - NOTIFICATIONS
// ===================================

/**
 * GET /api/business-owner/notification-settings
 * Get notification preferences
 */
router.get('/notification-settings', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      SELECT
        messages,
        updates,
        customer_alerts,
        marketing_emails,
        system_notifications,
        email_frequency
      FROM notification_settings
      WHERE user_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    // If no settings exist, return defaults
    if (result.rows.length === 0) {
      return res.json({
        messages: true,
        updates: true,
        customerAlerts: true,
        marketingEmails: false,
        systemNotifications: true,
        emailFrequency: 'daily'
      });
    }

    const settings = result.rows[0];

    res.json({
      messages: settings.messages,
      updates: settings.updates,
      customerAlerts: settings.customer_alerts,
      marketingEmails: settings.marketing_emails,
      systemNotifications: settings.system_notifications,
      emailFrequency: settings.email_frequency
    });

  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

/**
 * PUT /api/business-owner/notification-settings
 * Update notification preferences
 */
router.put('/notification-settings', async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const {
      messages,
      updates,
      customerAlerts,
      marketingEmails,
      systemNotifications,
      emailFrequency
    } = req.body;

    // Upsert notification settings
    const result = await client.query(`
      INSERT INTO notification_settings (
        user_id,
        tenant_id,
        messages,
        updates,
        customer_alerts,
        marketing_emails,
        system_notifications,
        email_frequency
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id)
      DO UPDATE SET
        messages = EXCLUDED.messages,
        updates = EXCLUDED.updates,
        customer_alerts = EXCLUDED.customer_alerts,
        marketing_emails = EXCLUDED.marketing_emails,
        system_notifications = EXCLUDED.system_notifications,
        email_frequency = EXCLUDED.email_frequency,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      userId,
      tenantId,
      messages !== undefined ? messages : true,
      updates !== undefined ? updates : true,
      customerAlerts !== undefined ? customerAlerts : true,
      marketingEmails !== undefined ? marketingEmails : false,
      systemNotifications !== undefined ? systemNotifications : true,
      emailFrequency || 'daily'
    ]);

    // Log activity
    await client.query(`
      INSERT INTO account_activity (user_id, tenant_id, action, details, ip_address)
      VALUES ($1, $2, 'notification_settings_updated', $3, $4)
    `, [userId, tenantId, JSON.stringify({ timestamp: new Date() }), req.ip]);

    const settings = result.rows[0];

    res.json({
      message: 'Notification settings updated successfully',
      settings: {
        messages: settings.messages,
        updates: settings.updates,
        customerAlerts: settings.customer_alerts,
        marketingEmails: settings.marketing_emails,
        systemNotifications: settings.system_notifications,
        emailFrequency: settings.email_frequency
      }
    });

  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  } finally {
    client.release();
  }
});

// ===================================
// ACCOUNTS CENTRE - OVERVIEW
// ===================================

/**
 * GET /api/business-owner/account-overview
 * Get account overview data
 */
router.get('/account-overview', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    // Get user data
    const userResult = await pool.query(`
      SELECT
        id,
        email,
        first_name,
        last_name,
        phone,
        avatar_url,
        account_status,
        two_factor_enabled,
        created_at,
        last_login_at
      FROM users
      WHERE id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get business data
    const businessResult = await pool.query(`
      SELECT id, name, email, phone, logo_url
      FROM businesses
      WHERE owner_id = $1 AND tenant_id = $2
      LIMIT 1
    `, [userId, tenantId]);

    // Get recent activity count
    const activityResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM account_activity
      WHERE user_id = $1 AND tenant_id = $2 AND created_at > NOW() - INTERVAL '30 days'
    `, [userId, tenantId]);

    // Get active sessions count
    const sessionsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM user_sessions
      WHERE user_id = $1 AND tenant_id = $2 AND is_active = TRUE
    `, [userId, tenantId]);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        accountStatus: user.account_status,
        twoFactorEnabled: user.two_factor_enabled || false,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at
      },
      business: businessResult.rows[0] || null,
      stats: {
        recentActivityCount: parseInt(activityResult.rows[0].count),
        activeSessionsCount: parseInt(sessionsResult.rows[0].count)
      }
    });

  } catch (error) {
    console.error('Error fetching account overview:', error);
    res.status(500).json({ error: 'Failed to fetch account overview' });
  }
});

module.exports = router;
