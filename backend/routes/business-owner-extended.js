const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireBusinessOwner } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireBusinessOwner);

// ===================================
// BOOKINGS MANAGEMENT
// ===================================

/**
 * GET /api/business-owner/bookings
 * Get all bookings for current business
 */
router.get('/bookings', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { status, date_from, date_to, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get business ID
    const businessResult = await pool.query(`
      SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    // Build query
    let query = `
      SELECT
        bk.*,
        u.first_name || ' ' || u.last_name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone
      FROM bookings bk
      JOIN users u ON bk.user_id = u.id
      WHERE bk.business_id = $1 AND bk.tenant_id = $2
    `;

    const params = [businessId, tenantId];

    if (status) {
      query += ` AND bk.status = $${params.length + 1}`;
      params.push(status);
    }

    if (date_from) {
      query += ` AND bk.booking_date >= $${params.length + 1}`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND bk.booking_date <= $${params.length + 1}`;
      params.push(date_to);
    }

    query += ` ORDER BY bk.booking_date DESC, bk.booking_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM bookings bk
      WHERE bk.business_id = $1 AND bk.tenant_id = $2
    `;
    const countParams = [businessId, tenantId];

    if (status) {
      countQuery += ` AND bk.status = $3`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      bookings: result.rows,
      total: totalCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: result.rows.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

/**
 * GET /api/business-owner/bookings/:id
 * Get booking details
 */
router.get('/bookings/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const bookingId = req.params.id;

    // Verify ownership and get booking
    const result = await pool.query(`
      SELECT
        bk.*,
        u.first_name || ' ' || u.last_name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone,
        b.business_name
      FROM bookings bk
      JOIN users u ON bk.user_id = u.id
      JOIN businesses b ON bk.business_id = b.id
      WHERE bk.id = $1 AND b.owner_id = $2 AND bk.tenant_id = $3
    `, [bookingId, userId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ booking: result.rows[0] });

  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

/**
 * PATCH /api/business-owner/bookings/:id/status
 * Update booking status
 */
router.patch('/bookings/:id/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const bookingId = req.params.id;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify ownership
    const ownerCheck = await pool.query(`
      SELECT bk.id FROM bookings bk
      JOIN businesses b ON bk.business_id = b.id
      WHERE bk.id = $1 AND b.owner_id = $2 AND bk.tenant_id = $3
    `, [bookingId, userId, tenantId]);

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Update status
    const result = await pool.query(`
      UPDATE bookings
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, bookingId]);

    res.json({
      message: 'Booking status updated successfully',
      booking: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

/**
 * GET /api/business-owner/bookings/calendar
 * Get calendar view of bookings
 */
router.get('/bookings/calendar', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { month, year } = req.query;

    // Get business ID
    const businessResult = await pool.query(`
      SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    // Get bookings for the month
    const result = await pool.query(`
      SELECT
        booking_date,
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
        SUM(party_size) as total_guests
      FROM bookings
      WHERE business_id = $1
        AND tenant_id = $2
        AND EXTRACT(MONTH FROM booking_date) = $3
        AND EXTRACT(YEAR FROM booking_date) = $4
      GROUP BY booking_date
      ORDER BY booking_date
    `, [businessId, tenantId, month, year]);

    res.json({ calendar: result.rows });

  } catch (error) {
    console.error('Error fetching calendar:', error);
    res.status(500).json({ error: 'Failed to fetch calendar' });
  }
});

// ===================================
// REVIEWS MANAGEMENT
// ===================================

/**
 * GET /api/business-owner/reviews
 * Get all reviews for current business
 */
router.get('/reviews', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { rating, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get business ID
    const businessResult = await pool.query(`
      SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    // Build query
    let query = `
      SELECT
        r.*,
        u.first_name || ' ' || u.last_name as customer_name,
        u.email as customer_email
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.business_id = $1 AND r.tenant_id = $2 AND r.status = 'published'
    `;

    const params = [businessId, tenantId];

    if (rating) {
      query += ` AND r.rating = $${params.length + 1}`;
      params.push(rating);
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM reviews
      WHERE business_id = $1 AND tenant_id = $2 AND status = 'published'
    `;
    const countParams = [businessId, tenantId];

    if (rating) {
      countQuery += ` AND rating = $3`;
      countParams.push(rating);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      reviews: result.rows,
      total: totalCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: result.rows.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/**
 * POST /api/business-owner/reviews/:id/respond
 * Respond to a review
 */
router.post('/reviews/:id/respond', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const reviewId = req.params.id;
    const { response_text } = req.body;

    if (!response_text || response_text.trim().length === 0) {
      return res.status(400).json({ error: 'Response text is required' });
    }

    // Get business ID
    const businessResult = await pool.query(`
      SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    // Verify review belongs to this business
    const reviewCheck = await pool.query(`
      SELECT id FROM reviews
      WHERE id = $1 AND business_id = $2 AND tenant_id = $3
    `, [reviewId, businessId, tenantId]);

    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Update review with response
    const result = await pool.query(`
      UPDATE reviews
      SET
        response_from_owner = $1,
        response_date = NOW(),
        updated_at = NOW()
      WHERE id = $2 AND business_id = $3 AND tenant_id = $4
      RETURNING *
    `, [response_text, reviewId, businessId, tenantId]);

    res.json({
      message: 'Response added successfully',
      review: result.rows[0]
    });

  } catch (error) {
    console.error('Error responding to review:', error);
    res.status(500).json({ error: 'Failed to respond to review' });
  }
});

/**
 * PUT /api/business-owner/reviews/:id/respond
 * Update a review response
 */
router.put('/reviews/:id/respond', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const reviewId = req.params.id;
    const { response_text } = req.body;

    if (!response_text || response_text.trim().length === 0) {
      return res.status(400).json({ error: 'Response text is required' });
    }

    // Get business ID
    const businessResult = await pool.query(`
      SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    // Update review response
    const result = await pool.query(`
      UPDATE reviews
      SET
        response_from_owner = $1,
        updated_at = NOW()
      WHERE id = $2 AND business_id = $3 AND tenant_id = $4
      RETURNING *
    `, [response_text, reviewId, businessId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({
      message: 'Response updated successfully',
      review: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating review response:', error);
    res.status(500).json({ error: 'Failed to update review response' });
  }
});

/**
 * DELETE /api/business-owner/reviews/:id/respond
 * Delete a review response
 */
router.delete('/reviews/:id/respond', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const reviewId = req.params.id;

    // Get business ID
    const businessResult = await pool.query(`
      SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    // Remove review response
    const result = await pool.query(`
      UPDATE reviews
      SET
        response_from_owner = NULL,
        response_date = NULL,
        updated_at = NOW()
      WHERE id = $1 AND business_id = $2 AND tenant_id = $3
      RETURNING *
    `, [reviewId, businessId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({
      message: 'Response deleted successfully',
      review: result.rows[0]
    });

  } catch (error) {
    console.error('Error deleting review response:', error);
    res.status(500).json({ error: 'Failed to delete review response' });
  }
});

module.exports = router;

