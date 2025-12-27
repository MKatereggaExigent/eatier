const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

/**
 * GET /api/user/specialist-bookings
 * Get all specialist bookings for the logged-in user
 * Multi-tenancy: Filters by user's tenant_id
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { status, limit = 20, offset = 0 } = req.query;

    if (!tenantId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User is not associated with a valid tenant'
      });
    }

    let query = `
      SELECT 
        sb.id,
        sb.booking_reference,
        sb.booking_date,
        sb.guest_count,
        sb.total_price,
        sb.status,
        sb.event_type,
        sb.event_city,
        sb.event_address,
        sb.special_requests,
        sb.payment_status,
        sb.completed_at,
        sb.cancelled_at,
        sb.cancellation_reason,
        sb.has_testimonial,
        sb.created_at,
        sb.updated_at,
        -- Specialist info
        u.id as specialist_id,
        u.first_name as specialist_first_name,
        u.last_name as specialist_last_name,
        u.email as specialist_email,
        -- Service info
        ss.name as service_name,
        ss.description as service_description,
        ss.base_price as service_base_price
      FROM specialist_bookings sb
      JOIN users u ON sb.specialist_id = u.id
      LEFT JOIN specialist_services ss ON sb.service_id = ss.id
      WHERE sb.client_id = $1 AND sb.tenant_id = $2
    `;
    
    const params = [userId, tenantId];

    if (status) {
      query += ` AND sb.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY sb.booking_date DESC, sb.created_at DESC`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM specialist_bookings sb
      WHERE sb.client_id = $1 AND sb.tenant_id = $2
    `;
    const countParams = [userId, tenantId];
    
    if (status) {
      countQuery += ` AND sb.status = $3`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      bookings: result.rows.map(row => ({
        id: row.id,
        bookingReference: row.booking_reference,
        bookingDate: row.booking_date,
        guestCount: row.guest_count,
        totalPrice: parseFloat(row.total_price) || 0,
        status: row.status,
        eventType: row.event_type,
        eventCity: row.event_city,
        eventAddress: row.event_address,
        specialRequests: row.special_requests,
        paymentStatus: row.payment_status,
        completedAt: row.completed_at,
        cancelledAt: row.cancelled_at,
        cancellationReason: row.cancellation_reason,
        hasTestimonial: row.has_testimonial,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        specialist: {
          id: row.specialist_id,
          firstName: row.specialist_first_name,
          lastName: row.specialist_last_name,
          email: row.specialist_email,
          fullName: `${row.specialist_first_name} ${row.specialist_last_name}`.trim()
        },
        service: row.service_name ? {
          name: row.service_name,
          description: row.service_description,
          basePrice: parseFloat(row.service_base_price) || 0
        } : null
      })),
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching user specialist bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

/**
 * GET /api/user/specialist-bookings/:id
 * Get a specific booking by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User is not associated with a valid tenant'
      });
    }

    const result = await pool.query(`
      SELECT 
        sb.*,
        u.id as specialist_id,
        u.first_name as specialist_first_name,
        u.last_name as specialist_last_name,
        u.email as specialist_email,
        ss.name as service_name,
        ss.description as service_description,
        ss.base_price as service_base_price
      FROM specialist_bookings sb
      JOIN users u ON sb.specialist_id = u.id
      LEFT JOIN specialist_services ss ON sb.service_id = ss.id
      WHERE sb.id = $1 AND sb.client_id = $2 AND sb.tenant_id = $3
    `, [id, userId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const row = result.rows[0];
    res.json({
      booking: {
        id: row.id,
        bookingReference: row.booking_reference,
        bookingDate: row.booking_date,
        guestCount: row.guest_count,
        totalPrice: parseFloat(row.total_price) || 0,
        status: row.status,
        eventType: row.event_type,
        eventCity: row.event_city,
        eventAddress: row.event_address,
        specialRequests: row.special_requests,
        paymentStatus: row.payment_status,
        completedAt: row.completed_at,
        cancelledAt: row.cancelled_at,
        cancellationReason: row.cancellation_reason,
        hasTestimonial: row.has_testimonial,
        createdAt: row.created_at,
        specialist: {
          id: row.specialist_id,
          firstName: row.specialist_first_name,
          lastName: row.specialist_last_name,
          email: row.specialist_email,
          fullName: `${row.specialist_first_name} ${row.specialist_last_name}`.trim()
        },
        service: row.service_name ? {
          name: row.service_name,
          description: row.service_description,
          basePrice: parseFloat(row.service_base_price) || 0
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

/**
 * GET /api/user/specialist-bookings/reviewable
 * Get completed bookings that are eligible for testimonials (no testimonial yet)
 */
router.get('/status/reviewable', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    if (!tenantId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User is not associated with a valid tenant'
      });
    }

    const result = await pool.query(`
      SELECT
        sb.id,
        sb.booking_reference,
        sb.booking_date,
        sb.event_type,
        sb.completed_at,
        u.id as specialist_id,
        u.first_name as specialist_first_name,
        u.last_name as specialist_last_name,
        ss.name as service_name
      FROM specialist_bookings sb
      JOIN users u ON sb.specialist_id = u.id
      LEFT JOIN specialist_services ss ON sb.service_id = ss.id
      WHERE sb.client_id = $1
        AND sb.tenant_id = $2
        AND sb.status = 'completed'
        AND sb.has_testimonial = false
      ORDER BY sb.completed_at DESC, sb.booking_date DESC
    `, [userId, tenantId]);

    res.json({
      bookings: result.rows.map(row => ({
        id: row.id,
        bookingReference: row.booking_reference,
        bookingDate: row.booking_date,
        eventType: row.event_type,
        completedAt: row.completed_at,
        specialist: {
          id: row.specialist_id,
          fullName: `${row.specialist_first_name} ${row.specialist_last_name}`.trim()
        },
        serviceName: row.service_name
      }))
    });
  } catch (error) {
    console.error('Error fetching reviewable bookings:', error);
    res.status(500).json({ error: 'Failed to fetch reviewable bookings' });
  }
});

/**
 * POST /api/user/specialist-bookings/:id/cancel
 * Cancel a pending booking
 */
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { reason } = req.body;

    if (!tenantId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User is not associated with a valid tenant'
      });
    }

    // Check if booking exists and belongs to user
    const bookingCheck = await pool.query(`
      SELECT id, status FROM specialist_bookings
      WHERE id = $1 AND client_id = $2 AND tenant_id = $3
    `, [id, userId, tenantId]);

    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingCheck.rows[0];

    // Only pending or confirmed bookings can be cancelled
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        error: 'Cannot cancel booking',
        message: `Bookings with status '${booking.status}' cannot be cancelled`
      });
    }

    // Update booking status
    const result = await pool.query(`
      UPDATE specialist_bookings
      SET status = 'cancelled',
          cancelled_at = CURRENT_TIMESTAMP,
          cancellation_reason = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND client_id = $3 AND tenant_id = $4
      RETURNING *
    `, [reason || 'Cancelled by client', id, userId, tenantId]);

    res.json({
      message: 'Booking cancelled successfully',
      booking: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        cancelledAt: result.rows[0].cancelled_at
      }
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

/**
 * POST /api/user/specialist-bookings/:id/testimonial
 * Submit a testimonial for a completed booking
 */
router.post('/:id/testimonial', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const bookingId = req.params.id;
    const { rating, review, eventType } = req.body;

    if (!tenantId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User is not associated with a valid tenant'
      });
    }

    // Validate required fields
    if (!rating || !review) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Rating and review are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Rating must be between 1 and 5'
      });
    }

    // Get booking and verify it's completed and belongs to user
    const bookingResult = await pool.query(`
      SELECT sb.*, u.first_name, u.last_name
      FROM specialist_bookings sb
      JOIN users u ON sb.client_id = u.id
      WHERE sb.id = $1 AND sb.client_id = $2 AND sb.tenant_id = $3
    `, [bookingId, userId, tenantId]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.status !== 'completed') {
      return res.status(400).json({
        error: 'Cannot submit testimonial',
        message: 'You can only submit a testimonial for completed bookings'
      });
    }

    if (booking.has_testimonial) {
      return res.status(400).json({
        error: 'Duplicate testimonial',
        message: 'You have already submitted a testimonial for this booking'
      });
    }

    const clientName = `${booking.first_name} ${booking.last_name}`.trim();

    // Get specialist's tenant_id
    const specialistInfo = await pool.query(`
      SELECT tenant_id FROM users WHERE id = $1
    `, [booking.specialist_id]);

    const specialistTenantId = specialistInfo.rows[0]?.tenant_id || tenantId;

    // Insert testimonial
    const testimonialResult = await pool.query(`
      INSERT INTO specialist_testimonials (
        specialist_id, tenant_id, client_id, booking_id,
        client_name, rating, review, event_type, event_date,
        is_public, is_featured, is_verified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, false, true)
      RETURNING *
    `, [
      booking.specialist_id,
      specialistTenantId,
      userId,
      bookingId,
      clientName,
      rating,
      review,
      eventType || booking.event_type,
      booking.booking_date
    ]);

    // Mark booking as having testimonial
    await pool.query(`
      UPDATE specialist_bookings
      SET has_testimonial = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [bookingId]);

    res.status(201).json({
      message: 'Thank you for your testimonial!',
      testimonial: testimonialResult.rows[0]
    });
  } catch (error) {
    console.error('Error submitting testimonial:', error);
    res.status(500).json({ error: 'Failed to submit testimonial' });
  }
});

module.exports = router;

