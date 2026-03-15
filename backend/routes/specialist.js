const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Middleware to verify JWT and get user info
const { authenticateToken } = require('../middleware/auth');
const { notifySpecialistBookingConfirmed, notifySpecialistBookingDeclined } = require('../utils/notificationHelper');

/**
 * GET /api/specialist/overview
 * Get overview statistics for the logged-in specialist
 */
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get booking statistics
    const bookingStats = await pool.query(`
      SELECT
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
        COUNT(*) FILTER (WHERE status = 'confirmed' AND booking_date >= CURRENT_DATE) as upcoming_bookings,
        COALESCE(SUM(total_price) FILTER (WHERE status = 'completed'), 0) as total_earnings
      FROM specialist_bookings
      WHERE specialist_id = $1
    `, [userId]);

    // Get this month's earnings
    const monthlyEarnings = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as monthly_earnings
      FROM specialist_earnings
      WHERE specialist_id = $1
        AND status = 'paid'
        AND EXTRACT(MONTH FROM paid_at) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM paid_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    `, [userId]);

    // Get review statistics
    const reviewStats = await pool.query(`
      SELECT
        COUNT(*) as total_reviews,
        COALESCE(AVG(rating), 0) as average_rating
      FROM specialist_reviews
      WHERE specialist_id = $1 AND status = 'published'
    `, [userId]);

    const stats = bookingStats.rows[0];
    const reviews = reviewStats.rows[0];

    res.json({
      totalBookings: parseInt(stats.total_bookings) || 0,
      completedBookings: parseInt(stats.completed_bookings) || 0,
      pendingRequests: parseInt(stats.pending_requests) || 0,
      upcomingBookings: parseInt(stats.upcoming_bookings) || 0,
      totalEarnings: parseFloat(stats.total_earnings) || 0,
      monthlyEarnings: parseFloat(monthlyEarnings.rows[0].monthly_earnings) || 0,
      totalReviews: parseInt(reviews.total_reviews) || 0,
      averageRating: parseFloat(reviews.average_rating) || 0,
      responseRate: 95, // Placeholder - would need response tracking
      repeatClientRate: 0 // Placeholder - would need client tracking
    });

  } catch (error) {
    console.error('Error fetching specialist overview:', error);
    res.status(500).json({ error: 'Failed to fetch overview data' });
  }
});

/**
 * GET /api/specialist/bookings
 * Get bookings for the logged-in specialist
 */
router.get('/bookings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 10 } = req.query;

    let query = `
      SELECT
        sb.*,
        u.first_name || ' ' || u.last_name as client_name,
        u.email as client_email
      FROM specialist_bookings sb
      JOIN users u ON sb.client_id = u.id
      WHERE sb.specialist_id = $1
    `;
    const params = [userId];

    if (status) {
      query += ` AND sb.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY sb.booking_date DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json({ bookings: result.rows });

  } catch (error) {
    console.error('Error fetching specialist bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

/**
 * PATCH /api/specialist/bookings/:id/status
 * Update booking status (accept, decline, complete, cancel)
 */
router.patch('/bookings/:id/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const bookingId = req.params.id;
    const { status, reason } = req.body;

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'declined'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        validStatuses
      });
    }

    // Verify booking belongs to this specialist
    const bookingCheck = await pool.query(`
      SELECT id, status FROM specialist_bookings
      WHERE id = $1 AND specialist_id = $2
    `, [bookingId, userId]);

    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const currentStatus = bookingCheck.rows[0].status;

    // Validate status transitions
    const validTransitions = {
      'pending': ['confirmed', 'declined', 'cancelled'],
      'confirmed': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': [],
      'declined': []
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status transition',
        message: `Cannot change status from '${currentStatus}' to '${status}'`
      });
    }

    // Build update query based on status
    let updateFields = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    let params = [status];
    let paramIndex = 2;

    if (status === 'confirmed') {
      updateFields.push('confirmed_at = CURRENT_TIMESTAMP');
    } else if (status === 'completed') {
      updateFields.push('completed_at = CURRENT_TIMESTAMP');
    } else if (status === 'cancelled' || status === 'declined') {
      updateFields.push(`cancelled_at = CURRENT_TIMESTAMP`);
      if (reason) {
        updateFields.push(`cancellation_reason = $${paramIndex}`);
        params.push(reason);
        paramIndex++;
      }
    }

    params.push(bookingId);
    params.push(userId);

    const result = await pool.query(`
      UPDATE specialist_bookings
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND specialist_id = $${paramIndex + 1}
      RETURNING *
    `, params);

    const updatedBooking = result.rows[0];

    // Send notification to client when specialist accepts or declines
    if (status === 'confirmed' || status === 'declined') {
      try {
        // Get client and specialist details for notification
        const detailsQuery = await pool.query(`
          SELECT
            sb.client_id,
            sb.tenant_id,
            sb.event_type,
            sb.booking_date,
            sb.cancellation_reason,
            COALESCE(u.first_name || ' ' || COALESCE(u.last_name, ''), u.email, 'Specialist') as specialist_name
          FROM specialist_bookings sb
          JOIN users u ON sb.specialist_id = u.id
          WHERE sb.id = $1
        `, [bookingId]);

        if (detailsQuery.rows.length > 0) {
          const details = detailsQuery.rows[0];
          const bookingDateFormatted = new Date(details.booking_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          if (status === 'confirmed') {
            await notifySpecialistBookingConfirmed({
              userId: details.client_id,
              tenantId: details.tenant_id,
              specialistName: details.specialist_name,
              eventType: details.event_type || 'event',
              bookingDate: bookingDateFormatted,
              bookingId: bookingId
            });
          } else if (status === 'declined') {
            await notifySpecialistBookingDeclined({
              userId: details.client_id,
              tenantId: details.tenant_id,
              specialistName: details.specialist_name,
              eventType: details.event_type || 'event',
              bookingDate: bookingDateFormatted,
              reason: reason || ''
            });
          }
        }
      } catch (notifError) {
        // Don't fail the request if notification fails
        console.error('Error sending booking status notification:', notifError);
        console.error('Notification error details:', notifError.message, notifError.stack);
      }
    }

    res.json({
      message: `Booking ${status} successfully`,
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Error updating booking status:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      bookingId,
      status,
      userId
    });
    res.status(500).json({
      error: 'Failed to update booking status',
      details: error.message
    });
  }
});

/**
 * GET /api/specialist/reviews
 * Get reviews for the logged-in specialist
 */
router.get('/reviews', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const result = await pool.query(`
      SELECT
        sr.*,
        u.first_name || ' ' || u.last_name as client_name
      FROM specialist_reviews sr
      JOIN users u ON sr.client_id = u.id
      WHERE sr.specialist_id = $1 AND sr.status = 'published'
      ORDER BY sr.created_at DESC
      LIMIT $2
    `, [userId, parseInt(limit)]);

    res.json({ reviews: result.rows });

  } catch (error) {
    console.error('Error fetching specialist reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/**
 * GET /api/specialist/earnings
 * Get earnings for the logged-in specialist
 */
router.get('/earnings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const result = await pool.query(`
      SELECT
        se.*,
        sb.event_type,
        u.first_name || ' ' || u.last_name as client_name
      FROM specialist_earnings se
      LEFT JOIN specialist_bookings sb ON se.booking_id = sb.id
      LEFT JOIN users u ON sb.client_id = u.id
      WHERE se.specialist_id = $1
      ORDER BY se.created_at DESC
      LIMIT $2
    `, [userId, parseInt(limit)]);

    res.json({ earnings: result.rows });

  } catch (error) {
    console.error('Error fetching specialist earnings:', error);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

// ============================================
// SPECIALIST SERVICES CRUD OPERATIONS
// ============================================

/**
 * GET /api/specialist/services
 * Get all services for the logged-in specialist
 */
router.get('/services', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT id, service_name, service_type, description, base_price, price_per_person,
             min_guests, max_guests, duration_hours, is_active, created_at, updated_at
      FROM specialist_services
      WHERE specialist_id = $1
      ORDER BY is_active DESC, service_type, service_name
    `, [userId]);

    res.json({
      services: result.rows.map(s => ({
        id: s.id,
        serviceName: s.service_name,
        serviceType: s.service_type,
        description: s.description,
        basePrice: parseFloat(s.base_price) || 0,
        pricePerPerson: parseFloat(s.price_per_person) || 0,
        minGuests: s.min_guests || 1,
        maxGuests: s.max_guests,
        durationHours: parseFloat(s.duration_hours) || 0,
        isActive: s.is_active,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }))
    });

  } catch (error) {
    console.error('Error fetching specialist services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

/**
 * POST /api/specialist/services
 * Create a new service for the logged-in specialist
 */
router.post('/services', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    const {
      serviceName,
      serviceType,
      description,
      basePrice,
      pricePerPerson,
      minGuests,
      maxGuests,
      durationHours
    } = req.body;

    // Validate required fields
    if (!serviceName || !serviceType) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Service name and service type are required'
      });
    }

    const result = await pool.query(`
      INSERT INTO specialist_services (
        tenant_id, specialist_id, service_name, service_type, description,
        base_price, price_per_person, min_guests, max_guests, duration_hours, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      RETURNING *
    `, [
      tenantId, userId, serviceName, serviceType, description || null,
      parseFloat(basePrice) || 0, parseFloat(pricePerPerson) || null,
      parseInt(minGuests) || 1, parseInt(maxGuests) || null,
      parseFloat(durationHours) || null
    ]);

    const s = result.rows[0];
    res.status(201).json({
      message: 'Service created successfully',
      service: {
        id: s.id,
        serviceName: s.service_name,
        serviceType: s.service_type,
        description: s.description,
        basePrice: parseFloat(s.base_price) || 0,
        pricePerPerson: parseFloat(s.price_per_person) || 0,
        minGuests: s.min_guests,
        maxGuests: s.max_guests,
        durationHours: parseFloat(s.duration_hours) || 0,
        isActive: s.is_active,
        createdAt: s.created_at
      }
    });

  } catch (error) {
    console.error('Error creating specialist service:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to create service',
      details: error.message,
      hint: error.hint || null
    });
  }
});

/**
 * PUT /api/specialist/services/:id
 * Update a service for the logged-in specialist
 */
router.put('/services/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const serviceId = req.params.id;

    const {
      serviceName,
      serviceType,
      description,
      basePrice,
      pricePerPerson,
      minGuests,
      maxGuests,
      durationHours,
      isActive
    } = req.body;

    // Verify ownership
    const ownerCheck = await pool.query(
      'SELECT id FROM specialist_services WHERE id = $1 AND specialist_id = $2',
      [serviceId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const result = await pool.query(`
      UPDATE specialist_services SET
        service_name = COALESCE($1, service_name),
        service_type = COALESCE($2, service_type),
        description = COALESCE($3, description),
        base_price = COALESCE($4, base_price),
        price_per_person = COALESCE($5, price_per_person),
        min_guests = COALESCE($6, min_guests),
        max_guests = COALESCE($7, max_guests),
        duration_hours = COALESCE($8, duration_hours),
        is_active = COALESCE($9, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 AND specialist_id = $11
      RETURNING *
    `, [
      serviceName, serviceType, description,
      basePrice !== undefined ? parseFloat(basePrice) : null,
      pricePerPerson !== undefined ? parseFloat(pricePerPerson) : null,
      minGuests !== undefined ? parseInt(minGuests) : null,
      maxGuests !== undefined ? parseInt(maxGuests) : null,
      durationHours !== undefined ? parseFloat(durationHours) : null,
      isActive,
      serviceId, userId
    ]);

    const s = result.rows[0];
    res.json({
      message: 'Service updated successfully',
      service: {
        id: s.id,
        serviceName: s.service_name,
        serviceType: s.service_type,
        description: s.description,
        basePrice: parseFloat(s.base_price) || 0,
        pricePerPerson: parseFloat(s.price_per_person) || 0,
        minGuests: s.min_guests,
        maxGuests: s.max_guests,
        durationHours: parseFloat(s.duration_hours) || 0,
        isActive: s.is_active,
        updatedAt: s.updated_at
      }
    });

  } catch (error) {
    console.error('Error updating specialist service:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

/**
 * DELETE /api/specialist/services/:id
 * Delete a service for the logged-in specialist
 */
router.delete('/services/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const serviceId = req.params.id;

    // Verify ownership and delete
    const result = await pool.query(
      'DELETE FROM specialist_services WHERE id = $1 AND specialist_id = $2 RETURNING id',
      [serviceId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({
      message: 'Service deleted successfully',
      deletedId: serviceId
    });

  } catch (error) {
    console.error('Error deleting specialist service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

/**
 * GET /api/specialist/service-types
 * Get available service types for dropdown
 */
router.get('/service-types', authenticateToken, async (req, res) => {
  res.json({
    serviceTypes: [
      { value: 'private_chef', label: 'Private Chef' },
      { value: 'catering', label: 'Catering' },
      { value: 'cooking_class', label: 'Cooking Class' },
      { value: 'event_catering', label: 'Event Catering' },
      { value: 'meal_prep', label: 'Meal Prep' },
      { value: 'consultation', label: 'Consultation' },
      { value: 'wine_pairing', label: 'Wine Pairing' },
      { value: 'baking', label: 'Baking' },
      { value: 'bbq', label: 'BBQ/Grilling' },
      { value: 'dietary', label: 'Dietary Specialist' }
    ]
  });
});

/**
 * GET /api/specialist/cuisine-types
 * Get available cuisine types for dropdown
 */
router.get('/cuisine-types', authenticateToken, async (req, res) => {
  res.json({
    cuisineTypes: [
      { value: 'italian', label: 'Italian' },
      { value: 'french', label: 'French' },
      { value: 'japanese', label: 'Japanese' },
      { value: 'chinese', label: 'Chinese' },
      { value: 'indian', label: 'Indian' },
      { value: 'mexican', label: 'Mexican' },
      { value: 'thai', label: 'Thai' },
      { value: 'mediterranean', label: 'Mediterranean' },
      { value: 'african', label: 'African' },
      { value: 'south_african', label: 'South African' },
      { value: 'fusion', label: 'Fusion' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'kosher', label: 'Kosher' },
      { value: 'halal', label: 'Halal' }
    ]
  });
});

module.exports = router;

