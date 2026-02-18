const express = require('express');
const pool = require('../config/database');
const router = express.Router();

/**
 * GET /api/public/specialists
 * Get list of all specialists (public endpoint - no auth required)
 */
router.get('/', async (req, res) => {
  try {
    const { specialty, country, minRating, minPrice, maxPrice, cuisine, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.profile_photo,
        u.bio,
        u.country,
        u.specialty_dishes,
        u.created_at,
        COALESCE(AVG(sr.rating), 0) as average_rating,
        COUNT(DISTINCT sr.id) as review_count,
        COUNT(DISTINCT sb.id) FILTER (WHERE sb.status = 'completed') as completed_bookings,
        ARRAY_AGG(DISTINCT ss.service_name) FILTER (WHERE ss.service_name IS NOT NULL) as services,
        ARRAY_AGG(DISTINCT ss.service_type) FILTER (WHERE ss.service_type IS NOT NULL) as specialties,
        COALESCE(MIN(ss.base_price), 0) as min_price,
        COALESCE(MAX(ss.base_price), 0) as max_price
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN specialist_services ss ON u.id = ss.specialist_id AND ss.is_active = true
      LEFT JOIN specialist_reviews sr ON u.id = sr.specialist_id AND sr.status = 'published'
      LEFT JOIN specialist_bookings sb ON u.id = sb.specialist_id
      WHERE LOWER(r.name) = LOWER('Specialist')
        AND u.account_status = 'active'
    `;

    const params = [];
    let paramIndex = 1;

    if (specialty) {
      query += ` AND ss.service_type ILIKE $${paramIndex}`;
      params.push(`%${specialty}%`);
      paramIndex++;
    }

    if (country) {
      query += ` AND u.country ILIKE $${paramIndex}`;
      params.push(`%${country}%`);
      paramIndex++;
    }

    if (cuisine) {
      // Filter by specialty_dishes array (case-insensitive) or service_type
      query += ` AND (EXISTS(SELECT 1 FROM unnest(u.specialty_dishes) AS dish WHERE dish ILIKE $${paramIndex}) OR ss.service_type ILIKE $${paramIndex})`;
      params.push(`%${cuisine}%`);
      paramIndex++;
    }

    query += `
      GROUP BY u.id, u.first_name, u.last_name, u.profile_photo, u.bio, u.country, u.specialty_dishes, u.created_at
    `;

    // Add HAVING clause for rating and price filters
    const havingClauses = [];
    if (minRating) {
      havingClauses.push(`COALESCE(AVG(sr.rating), 0) >= $${paramIndex}`);
      params.push(parseFloat(minRating));
      paramIndex++;
    }
    if (minPrice) {
      // Filter specialists whose highest-priced service is at or above this minimum
      havingClauses.push(`COALESCE(MAX(ss.base_price), 0) >= $${paramIndex}`);
      params.push(parseFloat(minPrice));
      paramIndex++;
    }
    if (maxPrice) {
      // Filter specialists who offer at least one service at or below this price
      havingClauses.push(`COALESCE(MIN(ss.base_price), 0) <= $${paramIndex}`);
      params.push(parseFloat(maxPrice));
      paramIndex++;
    }

    if (havingClauses.length > 0) {
      query += ` HAVING ${havingClauses.join(' AND ')}`;
    }

    query += `
      ORDER BY average_rating DESC, completed_bookings DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE LOWER(r.name) = LOWER('Specialist') AND u.account_status = 'active'
    `;
    const countResult = await pool.query(countQuery);

    res.json({
      specialists: result.rows.map(row => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: `${row.first_name} ${row.last_name}`,
        profilePhoto: row.profile_photo,
        bio: row.bio,
        averageRating: parseFloat(row.average_rating) || 0,
        reviewCount: parseInt(row.review_count) || 0,
        completedBookings: parseInt(row.completed_bookings) || 0,
        services: row.services?.filter(Boolean) || [],
        specialties: [...new Set(row.specialties?.filter(Boolean) || [])],
        minPrice: parseFloat(row.min_price) || 0,
        maxPrice: parseFloat(row.max_price) || 0,
        cuisines: row.specialty_dishes || [],
        location: row.country ? { country: row.country } : null
      })),
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching specialists:', error);
    res.status(500).json({ error: 'Failed to fetch specialists' });
  }
});

/**
 * GET /api/public/specialists/:id
 * Get specialist details by ID (public endpoint - no auth required)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get specialist basic info
    const specialistQuery = `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.profile_photo,
        u.bio,
        u.created_at,
        COALESCE(AVG(sr.rating), 0) as average_rating,
        COUNT(DISTINCT sr.id) as review_count,
        COUNT(DISTINCT sb.id) FILTER (WHERE sb.status = 'completed') as completed_bookings
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN specialist_reviews sr ON u.id = sr.specialist_id AND sr.status = 'published'
      LEFT JOIN specialist_bookings sb ON u.id = sb.specialist_id
      WHERE u.id = $1 AND LOWER(r.name) = LOWER('Specialist')
      GROUP BY u.id
    `;
    const specialistResult = await pool.query(specialistQuery, [id]);

    if (specialistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Specialist not found' });
    }

    const specialist = specialistResult.rows[0];

    // Get services
    const servicesQuery = `
      SELECT id, service_name, description, service_type, base_price, price_per_person,
             minimum_guests, maximum_guests, duration_hours, is_active
      FROM specialist_services
      WHERE specialist_id = $1 AND is_active = true
      ORDER BY service_type, service_name
    `;
    const servicesResult = await pool.query(servicesQuery, [id]);

    // Get reviews
    const reviewsQuery = `
      SELECT sr.id, sr.rating, sr.comment, sr.event_type, sr.created_at,
             u.first_name as client_first_name, u.last_name as client_last_name
      FROM specialist_reviews sr
      JOIN users u ON sr.client_id = u.id
      WHERE sr.specialist_id = $1 AND sr.status = 'published'
      ORDER BY sr.created_at DESC
      LIMIT 10
    `;
    const reviewsResult = await pool.query(reviewsQuery, [id]);

    res.json({
      id: specialist.id,
      firstName: specialist.first_name,
      lastName: specialist.last_name,
      fullName: `${specialist.first_name} ${specialist.last_name}`,
      email: specialist.email,
      phone: specialist.phone,
      profilePhoto: specialist.profile_photo,
      bio: specialist.bio,
      memberSince: specialist.created_at,
      averageRating: parseFloat(specialist.average_rating) || 0,
      reviewCount: parseInt(specialist.review_count) || 0,
      completedBookings: parseInt(specialist.completed_bookings) || 0,
      services: servicesResult.rows.map(s => ({
        id: s.id,
        name: s.service_name,
        description: s.description,
        category: s.service_type,
        basePrice: parseFloat(s.base_price) || 0,
        pricePerPerson: parseFloat(s.price_per_person) || 0,
        minGuests: s.minimum_guests,
        maxGuests: s.maximum_guests,
        durationHours: s.duration_hours
      })),
      reviews: reviewsResult.rows.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        eventType: r.event_type,
        createdAt: r.created_at,
        clientName: `${r.client_first_name} ${r.client_last_name?.charAt(0) || ''}.`
      }))
    });
  } catch (error) {
    console.error('Error fetching specialist details:', error);
    res.status(500).json({ error: 'Failed to fetch specialist details' });
  }
});

/**
 * POST /api/public/specialists/:id/book
 * Create a booking request for a specialist (requires auth)
 * Multi-tenancy: Uses client's tenant_id for the booking
 * RBAC: Any authenticated user can book a specialist
 */
const { authenticateToken } = require('../middleware/auth');

router.post('/:id/book', authenticateToken, async (req, res) => {
  try {
    const specialistId = req.params.id;
    const clientId = req.user.id;
    const clientTenantId = req.user.tenant_id;

    // RBAC: Ensure user has a valid tenant_id
    if (!clientTenantId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User is not associated with a valid tenant'
      });
    }

    const {
      serviceId,
      bookingDate,
      guestCount,
      eventType,
      eventCity,
      eventAddress,
      contactName,
      contactPhone,
      contactEmail,
      specialRequests
    } = req.body;

    // Validate required fields
    if (!bookingDate || !guestCount) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Booking date and guest count are required'
      });
    }

    // Verify the specialist exists and is active
    const specialistCheck = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.tenant_id
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1 AND LOWER(r.name) = LOWER('Specialist') AND u.account_status = 'active'
    `, [specialistId]);

    if (specialistCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Specialist not found or not active'
      });
    }

    // Calculate price based on service
    let totalPrice = 0;
    if (serviceId) {
      const serviceResult = await pool.query(
        'SELECT base_price, price_per_person, specialist_id FROM specialist_services WHERE id = $1 AND is_active = true',
        [serviceId]
      );
      if (serviceResult.rows.length > 0) {
        const service = serviceResult.rows[0];
        // Verify service belongs to the specialist
        if (service.specialist_id !== specialistId) {
          return res.status(400).json({
            error: 'Validation Error',
            message: 'Service does not belong to this specialist'
          });
        }
        const pricePerPerson = parseFloat(service.price_per_person) || 0;
        totalPrice = parseFloat(service.base_price) + (pricePerPerson * guestCount);
      }
    }

    // Generate booking reference
    const bookingReference = require('crypto').randomBytes(4).toString('hex').toUpperCase();

    // Insert booking with tenant_id for multi-tenancy
    const insertQuery = `
      INSERT INTO specialist_bookings (
        tenant_id, booking_reference, service_id, specialist_id, client_id,
        booking_date, guest_count, total_price, status,
        event_type, event_city, event_address,
        contact_name, contact_phone, contact_email, special_requests,
        payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, $12, $13, $14, $15, 'pending')
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      clientTenantId, bookingReference, serviceId, specialistId, clientId,
      bookingDate, guestCount, totalPrice,
      eventType, eventCity, eventAddress,
      contactName, contactPhone, contactEmail, specialRequests
    ]);

    res.status(201).json({
      message: 'Booking request submitted successfully',
      booking: {
        id: result.rows[0].id,
        bookingReference: result.rows[0].booking_reference,
        status: result.rows[0].status,
        totalPrice: parseFloat(result.rows[0].total_price),
        tenantId: result.rows[0].tenant_id
      }
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

/**
 * POST /api/public/specialists/:id/testimonial
 * Submit a testimonial for a specialist after a completed booking
 * Only clients who have completed bookings with the specialist can submit testimonials
 */
router.post('/:id/testimonial', authenticateToken, async (req, res) => {
  try {
    const specialistId = req.params.id;
    const clientId = req.user.id;
    const clientTenantId = req.user.tenant_id;

    if (!clientTenantId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User is not associated with a valid tenant'
      });
    }

    const { bookingId, rating, review, eventType, eventDate } = req.body;

    // Validate required fields
    if (!review || !rating) {
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

    // Verify the client has a completed booking with this specialist
    const bookingCheck = await pool.query(`
      SELECT id, booking_date, event_type
      FROM specialist_bookings
      WHERE client_id = $1
        AND specialist_id = $2
        AND status = 'completed'
        ${bookingId ? 'AND id = $4' : ''}
      ORDER BY booking_date DESC
      LIMIT 1
    `, bookingId
      ? [clientId, specialistId, 'completed', bookingId]
      : [clientId, specialistId, 'completed']
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only leave a testimonial after a completed booking with this specialist'
      });
    }

    const completedBooking = bookingCheck.rows[0];

    // Check if client already submitted a testimonial for this booking
    const existingTestimonial = await pool.query(`
      SELECT id FROM specialist_testimonials
      WHERE specialist_id = $1 AND booking_id = $2
    `, [specialistId, completedBooking.id]);

    if (existingTestimonial.rows.length > 0) {
      return res.status(400).json({
        error: 'Duplicate',
        message: 'You have already submitted a testimonial for this booking'
      });
    }

    // Get client's name for the testimonial
    const clientInfo = await pool.query(`
      SELECT first_name, last_name, email FROM users WHERE id = $1
    `, [clientId]);

    const clientName = clientInfo.rows.length > 0
      ? `${clientInfo.rows[0].first_name} ${clientInfo.rows[0].last_name}`.trim()
      : 'Anonymous';

    // Get specialist's tenant_id for multi-tenancy
    const specialistInfo = await pool.query(`
      SELECT tenant_id FROM users WHERE id = $1
    `, [specialistId]);

    if (specialistInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Specialist not found' });
    }

    const specialistTenantId = specialistInfo.rows[0].tenant_id;

    // Insert the testimonial
    const result = await pool.query(`
      INSERT INTO specialist_testimonials (
        specialist_id, tenant_id, client_id, booking_id,
        client_name, rating, review,
        event_type, event_date, is_public, is_featured
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, false)
      RETURNING *
    `, [
      specialistId,
      specialistTenantId,
      clientId,
      completedBooking.id,
      clientName,
      rating,
      review,
      eventType || completedBooking.event_type,
      eventDate || completedBooking.booking_date,
    ]);

    res.status(201).json({
      message: 'Thank you for your testimonial!',
      testimonial: result.rows[0]
    });
  } catch (error) {
    console.error('Error submitting testimonial:', error);
    res.status(500).json({ error: 'Failed to submit testimonial' });
  }
});

/**
 * GET /api/public/specialists/:id/can-review
 * Check if the current user can leave a testimonial for this specialist
 */
router.get('/:id/can-review', authenticateToken, async (req, res) => {
  try {
    const specialistId = req.params.id;
    const clientId = req.user.id;

    // Check for completed bookings without testimonials
    const result = await pool.query(`
      SELECT sb.id, sb.booking_date, sb.event_type
      FROM specialist_bookings sb
      LEFT JOIN specialist_testimonials st ON st.booking_id = sb.id
      WHERE sb.client_id = $1
        AND sb.specialist_id = $2
        AND sb.status = 'completed'
        AND st.id IS NULL
      ORDER BY sb.booking_date DESC
    `, [clientId, specialistId]);

    res.json({
      canReview: result.rows.length > 0,
      pendingBookings: result.rows.map(row => ({
        id: row.id,
        bookingDate: row.booking_date,
        eventType: row.event_type
      }))
    });
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    res.status(500).json({ error: 'Failed to check review eligibility' });
  }
});

module.exports = router;

