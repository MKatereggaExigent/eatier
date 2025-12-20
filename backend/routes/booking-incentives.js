const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// ============================================================================
// GET /api/booking-incentives - Get available booking incentives
// ============================================================================
router.get('/', optionalAuth, async (req, res) => {
  try {
    const isLoggedIn = !!req.user;
    const tenantId = req.user?.tenant_id || req.query.tenantId;
    const { businessId, date, partySize } = req.query;

    // Base query for active incentives
    let query = `
      SELECT * FROM booking_incentives
      WHERE is_active = true
        AND valid_from <= NOW()
        AND valid_to >= NOW()
        AND (max_total_uses IS NULL OR current_uses < max_total_uses)
    `;
    const params = [];
    let paramIndex = 1;

    if (tenantId) {
      query += ` AND tenant_id = $${paramIndex}`;
      params.push(tenantId);
      paramIndex++;
    }

    // Filter by login requirement
    if (!isLoggedIn) {
      query += ` AND requires_login = false`;
    }

    // Filter by business if specified
    if (businessId) {
      query += ` AND (array_length(applicable_businesses, 1) IS NULL OR $${paramIndex} = ANY(applicable_businesses))`;
      params.push(businessId);
      paramIndex++;
    }

    // Filter by party size
    if (partySize) {
      query += ` AND min_party_size <= $${paramIndex}`;
      params.push(parseInt(partySize));
      paramIndex++;
    }

    query += ` ORDER BY incentive_percentage DESC NULLS LAST, incentive_value DESC NULLS LAST`;

    const result = await pool.query(query, params);

    const incentives = result.rows.map(inc => ({
      id: inc.id,
      name: inc.name,
      description: inc.description,
      incentiveType: inc.incentive_type,
      incentiveValue: inc.incentive_value ? parseFloat(inc.incentive_value) : null,
      incentivePercentage: inc.incentive_percentage ? parseFloat(inc.incentive_percentage) : null,
      minBookingValue: parseFloat(inc.min_booking_value),
      minPartySize: inc.min_party_size,
      applicableDays: inc.applicable_days,
      applicableHoursStart: inc.applicable_hours_start,
      applicableHoursEnd: inc.applicable_hours_end,
      validUntil: inc.valid_to,
      requiresLogin: inc.requires_login
    }));

    res.json({ 
      incentives,
      loginRequired: incentives.filter(i => i.requiresLogin).length,
      availableWithoutLogin: incentives.filter(i => !i.requiresLogin).length
    });
  } catch (error) {
    console.error('Error fetching booking incentives:', error);
    res.status(500).json({ error: 'Failed to fetch incentives' });
  }
});

// ============================================================================
// POST /api/booking-incentives/calculate - Calculate incentive for a booking
// ============================================================================
router.post('/calculate', optionalAuth, async (req, res) => {
  try {
    const isLoggedIn = !!req.user;
    const { incentiveId, bookingValue, partySize, bookingDate, bookingTime } = req.body;

    if (!incentiveId) {
      return res.status(400).json({ error: 'Incentive ID is required' });
    }

    const result = await pool.query(
      `SELECT * FROM booking_incentives WHERE id = $1 AND is_active = true`,
      [incentiveId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incentive not found' });
    }

    const incentive = result.rows[0];

    // Check login requirement
    if (incentive.requires_login && !isLoggedIn) {
      return res.json({
        applicable: false,
        reason: 'This incentive requires you to be logged in',
        requiresLogin: true
      });
    }

    // Check minimum booking value
    if (bookingValue < incentive.min_booking_value) {
      return res.json({
        applicable: false,
        reason: `Minimum booking value of $${incentive.min_booking_value} required`
      });
    }

    // Check party size
    if (partySize < incentive.min_party_size) {
      return res.json({
        applicable: false,
        reason: `Minimum party size of ${incentive.min_party_size} required`
      });
    }

    // Calculate benefit
    let benefitAmount = 0;
    if (incentive.incentive_percentage) {
      benefitAmount = bookingValue * (incentive.incentive_percentage / 100);
    } else if (incentive.incentive_value) {
      benefitAmount = incentive.incentive_value;
    }

    res.json({
      applicable: true,
      incentive: {
        id: incentive.id,
        name: incentive.name,
        type: incentive.incentive_type,
        benefitAmount: Math.round(benefitAmount * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error calculating incentive:', error);
    res.status(500).json({ error: 'Failed to calculate incentive' });
  }
});

module.exports = router;

