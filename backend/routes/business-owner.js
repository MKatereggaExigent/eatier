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
 * Get current user's business profile
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
        (SELECT COUNT(*) FROM menus WHERE business_id = b.id) as total_menu_items
      FROM businesses b
      JOIN users u ON b.owner_id = u.id
      WHERE b.owner_id = $1 AND b.tenant_id = $2
      LIMIT 1
    `, [userId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json({ business: result.rows[0] });

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
      ORDER BY category, item_name
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
    const { item_name, description, price, category, image_url, dietary_info, is_available } = req.body;

    if (!item_name || !price) {
      return res.status(400).json({ error: 'Item name and price are required' });
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
      INSERT INTO menus (tenant_id, business_id, item_name, description, price, category, image_url, dietary_info, is_available)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [tenantId, businessId, item_name, description, price, category, image_url, dietary_info, is_available !== false]);

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
    const { item_name, description, price, category, image_url, dietary_info, is_available } = req.body;

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
        item_name = COALESCE($1, item_name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        category = COALESCE($4, category),
        image_url = COALESCE($5, image_url),
        dietary_info = COALESCE($6, dietary_info),
        is_available = COALESCE($7, is_available),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [item_name, description, price, category, image_url, dietary_info, is_available, menuId]);

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
    const { is_available } = req.body;

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
      SET is_available = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [is_available, menuId]);

    res.json({
      message: 'Menu item availability updated successfully',
      item: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating menu item availability:', error);
    res.status(500).json({ error: 'Failed to update menu item availability' });
  }
});

module.exports = router;

