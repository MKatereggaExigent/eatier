const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Middleware to verify JWT and get user info
const { authenticateToken } = require('../middleware/auth');

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
        AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
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
    res.status(500).json({ error: 'Failed to create service' });
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

