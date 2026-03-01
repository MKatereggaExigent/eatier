const express = require('express');
const pool = require('../config/database');
const { sendBookingConfirmation } = require('../services/emailService');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const router = express.Router();

// Get all bookings for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Handle guest users (temp-user or invalid UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (userId === 'temp-user' || !uuidRegex.test(userId)) {
      return res.json({
        bookings: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0
        }
      });
    }

    // First, get the user's email to also find guest bookings made with their email
    let userEmail = null;
    try {
      const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length > 0) {
        userEmail = userResult.rows[0].email;
      }
    } catch (err) {
      console.log('Could not fetch user email:', err.message);
    }

    // Query bookings by user_id OR by email (for guest bookings)
    let query = `
      SELECT
        b.*,
        bus.business_name,
        bus.phone as business_phone,
        bus.email as business_email
      FROM bookings b
      JOIN businesses bus ON b.business_id = bus.id
      WHERE (b.user_id = $1`;

    const params = [userId];

    // Also include guest bookings made with the same email
    if (userEmail) {
      query += ` OR (b.user_id IS NULL AND LOWER(b.contact_email) = LOWER($${params.length + 1})))`;
      params.push(userEmail);
    } else {
      query += `)`;
    }

    if (status) {
      query += ` AND b.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY b.booking_date DESC, b.booking_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      bookings: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get booking by reference (for email link)
router.get('/reference/:reference', async (req, res) => {
  try {
    const { reference } = req.params;

    const result = await pool.query(`
      SELECT
        b.*,
        bus.business_name,
        bus.phone as business_phone,
        bus.email as business_email,
        bus.address as business_address
      FROM bookings b
      JOIN businesses bus ON b.business_id = bus.id
      WHERE b.booking_reference = $1
    `, [reference]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ booking: result.rows[0] });
  } catch (error) {
    console.error('Error fetching booking by reference:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Get bookings by email (for guests without accounts)
router.get('/email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT
        b.*,
        bus.business_name,
        bus.phone as business_phone,
        bus.email as business_email
      FROM bookings b
      JOIN businesses bus ON b.business_id = bus.id
      WHERE LOWER(b.contact_email) = LOWER($1)
      ORDER BY b.booking_date DESC, b.booking_time DESC
      LIMIT $2 OFFSET $3
    `, [email, limit, offset]);

    res.json({
      bookings: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });
  } catch (error) {
    console.error('Error fetching bookings by email:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get all bookings for a business
router.get('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { status, date, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Use LEFT JOIN to include guest bookings (where user_id is NULL)
    // Use COALESCE to fall back to contact info for guest bookings
    let query = `
      SELECT
        b.*,
        COALESCE(u.first_name, b.contact_name) as first_name,
        COALESCE(u.last_name, '') as last_name,
        COALESCE(u.email, b.contact_email) as user_email,
        COALESCE(u.phone, b.contact_phone) as user_phone
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.business_id = $1
    `;

    const params = [businessId];

    if (status) {
      query += ` AND b.status = $${params.length + 1}`;
      params.push(status);
    }

    if (date) {
      query += ` AND b.booking_date = $${params.length + 1}`;
      params.push(date);
    }

    query += ` ORDER BY b.booking_date DESC, b.booking_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      bookings: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get available time slots for a business on a specific date
router.get('/slots/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { date, tier = 'basic' } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    // Get available slots using the database function
    const result = await pool.query(`
      SELECT * FROM get_available_slots($1, $2, $3)
    `, [businessId, date, tier]);

    res.json({
      businessId,
      date,
      tier,
      slots: result.rows
    });

  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});

// Create new booking (supports both authenticated and guest users)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      businessId,
      bookingDate,
      bookingTime,
      partySize,
      specialRequests,
      contactName,
      contactPhone,
      contactEmail,
      tablePreferences,
      occasion,
      bookingTier = 'basic'
    } = req.body;

    // Validate required fields
    if (!businessId || !bookingDate || !bookingTime || !partySize || !contactName || !contactPhone || !contactEmail) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['businessId', 'bookingDate', 'bookingTime', 'partySize', 'contactName', 'contactPhone', 'contactEmail']
      });
    }

    // Check availability using the database function (if it exists)
    try {
      const availabilityCheck = await pool.query(`
        SELECT check_slot_availability($1, $2, $3, $4, $5) as is_available
      `, [businessId, bookingDate, bookingTime, bookingTier, partySize]);

      if (availabilityCheck.rows[0] && !availabilityCheck.rows[0].is_available) {
        return res.status(400).json({
          error: 'This time slot is not available. Please select a different time.',
          code: 'SLOT_NOT_AVAILABLE'
        });
      }
    } catch (availabilityError) {
      // Function doesn't exist - skip availability check and allow booking
      console.log('Availability check skipped (function not found):', availabilityError.message);
    }

    // Optional: Get tier pricing if settings table exists
    let tierPrice = 0.00;
    try {
      const settingsResult = await pool.query(`
        SELECT
          basic_tier_price,
          standard_tier_price,
          premium_tier_price,
          priority_tier_price
        FROM business_capacity_settings
        WHERE business_id = $1
      `, [businessId]);

      if (settingsResult.rows.length > 0) {
        const settings = settingsResult.rows[0];
        switch (bookingTier) {
          case 'basic':
            tierPrice = settings.basic_tier_price || 0.00;
            break;
          case 'standard':
            tierPrice = settings.standard_tier_price || 5.00;
            break;
          case 'premium':
            tierPrice = settings.premium_tier_price || 15.00;
            break;
          case 'priority':
            tierPrice = settings.priority_tier_price || 25.00;
            break;
        }
      }
    } catch (priceError) {
      // Settings table doesn't exist, use default pricing
      console.log('Tier pricing skipped (table not found)');
    }

    // Generate booking reference
    const bookingRef = `BK${Date.now().toString().slice(-8)}`;

    // Multi-tenancy: Use authenticated user's tenant_id, or fall back to business tenant_id for guests
    let tenantId;
    let validUserId = null;

    if (req.user) {
      // Authenticated user - use their tenant_id and user_id
      tenantId = req.user.tenant_id;
      validUserId = req.user.id;
    } else {
      // Guest booking - use business's tenant_id
      const tenantResult = await pool.query(`
        SELECT tenant_id FROM businesses WHERE id = $1
      `, [businessId]);
      tenantId = tenantResult.rows[0]?.tenant_id;
    }

    const result = await pool.query(`
      INSERT INTO bookings (
        tenant_id, business_id, user_id, booking_date, booking_time, party_size,
        special_requests, contact_name, contact_phone, contact_email,
        table_preferences, occasion, booking_tier, tier_price,
        booking_reference, status, total_amount
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      tenantId, businessId, validUserId, bookingDate, bookingTime, partySize,
      specialRequests || '', contactName, contactPhone, contactEmail,
      tablePreferences || '', occasion || '', bookingTier, tierPrice,
      bookingRef, 'pending', tierPrice
    ]);

    const booking = result.rows[0];

    // Debug: Log booking data for email
    console.log('📋 Booking created:', {
      booking_reference: booking.booking_reference,
      contact_name: booking.contact_name,
      contact_email: booking.contact_email,
      user_id: booking.user_id,
      party_size: booking.party_size
    });

    // Get business name for email
    let businessName = 'the restaurant';
    try {
      const businessResult = await pool.query(
        'SELECT business_name FROM businesses WHERE id = $1',
        [businessId]
      );
      if (businessResult.rows.length > 0) {
        businessName = businessResult.rows[0].business_name;
      }
    } catch (bizError) {
      console.log('Could not fetch business name:', bizError.message);
    }

    // Debug: Log what we're sending to email service
    console.log('📧 Sending email with:', {
      to: booking.contact_email,
      contact_name: booking.contact_name,
      businessName: businessName
    });

    // Send confirmation email (non-blocking)
    sendBookingConfirmation(booking, businessName)
      .then(emailResult => {
        if (emailResult.success) {
          console.log(`📧 Confirmation email sent for booking ${booking.booking_reference}`);
        } else {
          console.log(`⚠️ Failed to send confirmation email: ${emailResult.error}`);
        }
      })
      .catch(err => console.error('Email sending error:', err));

    res.status(201).json(booking);

  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking', details: error.message });
  }
});

// Update booking status
router.patch('/:bookingId/status', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, cancellationReason } = req.body;

    let query = `
      UPDATE bookings
      SET status = $1, updated_at = CURRENT_TIMESTAMP
    `;

    const params = [status];

    if (status === 'confirmed') {
      query += `, confirmed_at = CURRENT_TIMESTAMP`;
    } else if (status === 'cancelled') {
      query += `, cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = $${params.length + 1}`;
      params.push(cancellationReason);
    } else if (status === 'no_show') {
      query += `, no_show_at = CURRENT_TIMESTAMP`;
    }

    query += ` WHERE id = $${params.length + 1} RETURNING *`;
    params.push(bookingId);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// Get booking availability for a user/specialist
router.get('/availability/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(`
      SELECT * FROM booking_availability
      WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      // Return default availability if none exists
      return res.json({
        userId,
        isAvailable: true,
        availabilityType: 'available',
        allowInstantBooking: true,
        requireApproval: false,
        advanceBookingDays: 30,
        cancellationAllowed: true,
        cancellationDeadlineHours: 24,
        refundPolicy: 'full_refund',
        minimumNoticeHours: 2,
        bufferTimeMinutes: 30,
        totalBookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        averageRating: 0
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Update booking availability
router.put('/availability/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      isAvailable,
      availabilityType,
      nextAvailableDate,
      allowInstantBooking,
      requireApproval,
      advanceBookingDays,
      cancellationAllowed,
      cancellationDeadlineHours,
      refundPolicy,
      minimumNoticeHours,
      bufferTimeMinutes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO booking_availability (
        user_id, is_available, availability_type, next_available_date,
        allow_instant_booking, require_approval, advance_booking_days,
        cancellation_allowed, cancellation_deadline_hours, refund_policy,
        minimum_notice_hours, buffer_time_minutes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (user_id) DO UPDATE SET
        is_available = EXCLUDED.is_available,
        availability_type = EXCLUDED.availability_type,
        next_available_date = EXCLUDED.next_available_date,
        allow_instant_booking = EXCLUDED.allow_instant_booking,
        require_approval = EXCLUDED.require_approval,
        advance_booking_days = EXCLUDED.advance_booking_days,
        cancellation_allowed = EXCLUDED.cancellation_allowed,
        cancellation_deadline_hours = EXCLUDED.cancellation_deadline_hours,
        refund_policy = EXCLUDED.refund_policy,
        minimum_notice_hours = EXCLUDED.minimum_notice_hours,
        buffer_time_minutes = EXCLUDED.buffer_time_minutes,
        last_updated = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      userId, isAvailable, availabilityType, nextAvailableDate,
      allowInstantBooking, requireApproval, advanceBookingDays,
      cancellationAllowed, cancellationDeadlineHours, refundPolicy,
      minimumNoticeHours, bufferTimeMinutes
    ]);

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// Get calendar slots for a user
router.get('/calendar/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT * FROM calendar_slots
      WHERE user_id = $1
    `;

    const params = [userId];

    if (startDate) {
      query += ` AND date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND date <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY date, start_time`;

    const result = await pool.query(query, params);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching calendar slots:', error);
    res.status(500).json({ error: 'Failed to fetch calendar slots' });
  }
});

// Create or update calendar slot
router.post('/calendar', async (req, res) => {
  try {
    const {
      userId,
      date,
      startTime,
      endTime,
      isAvailable,
      maxCapacity,
      price,
      notes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO calendar_slots (
        user_id, date, start_time, end_time, is_available,
        max_capacity, capacity, price, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8)
      ON CONFLICT (user_id, date, start_time) DO UPDATE SET
        end_time = EXCLUDED.end_time,
        is_available = EXCLUDED.is_available,
        max_capacity = EXCLUDED.max_capacity,
        capacity = EXCLUDED.capacity,
        price = EXCLUDED.price,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [userId, date, startTime, endTime, isAvailable, maxCapacity, price, notes]);

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Error creating calendar slot:', error);
    res.status(500).json({ error: 'Failed to create calendar slot' });
  }
});

module.exports = router;

