const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get all bookings for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        b.*,
        bus.business_name,
        bus.phone as business_phone,
        bus.email as business_email
      FROM bookings b
      JOIN businesses bus ON b.business_id = bus.id
      WHERE b.user_id = $1
    `;

    const params = [userId];

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

// Get all bookings for a business
router.get('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { status, date, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        b.*,
        u.first_name,
        u.last_name,
        u.email as user_email,
        u.phone as user_phone
      FROM bookings b
      JOIN users u ON b.user_id = u.id
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

// Create new booking
router.post('/', async (req, res) => {
  try {
    const {
      businessId,
      userId,
      bookingDate,
      bookingTime,
      partySize,
      specialRequests,
      contactName,
      contactPhone,
      contactEmail,
      tablePreferences,
      occasion,
      bookingTier = 'basic' // NEW: Booking tier
    } = req.body;

    // NEW: Check availability before creating booking
    const availabilityCheck = await pool.query(`
      SELECT check_slot_availability($1, $2, $3, $4, $5) as is_available
    `, [businessId, bookingDate, bookingTime, bookingTier, partySize]);

    if (!availabilityCheck.rows[0].is_available) {
      return res.status(400).json({
        error: 'This time slot is not available for the selected tier',
        code: 'SLOT_NOT_AVAILABLE'
      });
    }

    // NEW: Get tier pricing
    const settingsResult = await pool.query(`
      SELECT
        basic_tier_price,
        standard_tier_price,
        premium_tier_price,
        priority_tier_price
      FROM business_capacity_settings
      WHERE business_id = $1
    `, [businessId]);

    let tierPrice = 0.00;
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

    // Generate booking reference
    const bookingRef = `BK${Date.now().toString().slice(-8)}`;

    // Get tenant ID
    const tenantResult = await pool.query(`
      SELECT tenant_id FROM businesses WHERE id = $1
    `, [businessId]);
    const tenantId = tenantResult.rows[0]?.tenant_id;

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
      tenantId, businessId, userId, bookingDate, bookingTime, partySize,
      specialRequests, contactName, contactPhone, contactEmail,
      tablePreferences, occasion, bookingTier, tierPrice,
      bookingRef, 'pending', tierPrice
    ]);

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
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

