const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  // TODO: Implement proper JWT authentication
  // For now, allow all requests
  next();
};

// ===================================
// STATISTICS
// ===================================
router.get('/statistics', requireAdmin, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM businesses) as total_businesses,
        (SELECT COUNT(*) FROM bookings) as total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as confirmed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'completed') * 50.00 as total_revenue,
        (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_30d,
        (SELECT COUNT(*) FROM businesses WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_businesses_30d
    `);

    const row = stats.rows[0];

    res.json({
      totalUsers: parseInt(row.total_users) || 0,
      totalBusinesses: parseInt(row.total_businesses) || 0,
      totalBookings: parseInt(row.total_bookings) || 0,
      confirmedBookings: parseInt(row.confirmed_bookings) || 0,
      totalRevenue: parseFloat(row.total_revenue) || 0,
      newUsers30d: parseInt(row.new_users_30d) || 0,
      newBusinesses30d: parseInt(row.new_businesses_30d) || 0,
      newUsersToday: 0,
      newBusinessesToday: 0,
      newBookingsToday: 0,
      pendingBookings: 0,
      revenue30d: 0
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics', details: error.message });
  }
});

// ===================================
// USERS
// ===================================
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.role,
        u.status as account_status,
        u.email_verified,
        u.avatar_url,
        u.created_at,
        u.last_login_at,
        (SELECT COUNT(*) FROM bookings WHERE user_id = u.id) as total_bookings,
        (SELECT b.name FROM businesses b WHERE b.owner_id = u.id LIMIT 1) as business_name
      FROM users u
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
      paramIndex++;
    }

    if (status) {
      params.push(status);
      query += ` AND u.status = $${paramIndex}`;
      paramIndex++;
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM users u WHERE 1=1`;
    const countParams = [];
    let countParamIndex = 1;

    if (search) {
      countParams.push(`%${search}%`);
      countQuery += ` AND (u.email ILIKE $${countParamIndex} OR u.first_name ILIKE $${countParamIndex} OR u.last_name ILIKE $${countParamIndex})`;
      countParamIndex++;
    }

    if (status) {
      countParams.push(status);
      countQuery += ` AND u.status = $${countParamIndex}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      users: result.rows,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasMore: result.rows.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// ===================================
// BUSINESSES
// ===================================
router.get('/businesses', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        b.id,
        b.name,
        b.slug,
        b.description,
        b.cuisine_types,
        b.price_range,
        b.phone,
        b.email,
        b.website_url,
        b.average_rating,
        b.total_reviews,
        b.total_bookings,
        b.status,
        b.is_featured,
        b.created_at,
        b.updated_at,
        u.first_name || ' ' || u.last_name as owner_name,
        u.email as owner_email,
        u.id as owner_id
      FROM businesses b
      JOIN users u ON b.owner_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (b.name ILIKE $${paramIndex} OR b.description ILIKE $${paramIndex})`;
      paramIndex++;
    }

    if (status) {
      params.push(status);
      query += ` AND b.status = $${paramIndex}`;
      paramIndex++;
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM businesses b WHERE 1=1`;
    const countParams = [];
    let countParamIndex = 1;

    if (search) {
      countParams.push(`%${search}%`);
      countQuery += ` AND (b.name ILIKE $${countParamIndex} OR b.description ILIKE $${countParamIndex})`;
      countParamIndex++;
    }

    if (status) {
      countParams.push(status);
      countQuery += ` AND b.status = $${countParamIndex}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      businesses: result.rows,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasMore: result.rows.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Failed to fetch businesses', details: error.message });
  }
});

// ===================================
// BOOKINGS
// ===================================
router.get('/bookings', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        bk.id,
        bk.booking_reference,
        bk.booking_date,
        bk.booking_time,
        bk.party_size,
        bk.status,
        bk.special_requests,
        bk.created_at,
        b.name as business_name,
        b.id as business_id,
        u.first_name || ' ' || u.last_name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone
      FROM bookings bk
      JOIN businesses b ON bk.business_id = b.id
      JOIN users u ON bk.user_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (status) {
      params.push(status);
      query += ` AND bk.status = $${paramIndex}`;
      paramIndex++;
    }

    query += ` ORDER BY bk.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM bookings bk WHERE 1=1`;
    const countParams = [];

    if (status) {
      countParams.push(status);
      countQuery += ` AND bk.status = $1`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      bookings: result.rows,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasMore: result.rows.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings', details: error.message });
  }
});

// ===================================
// ACTIVITY (Stub for now)
// ===================================
router.get('/activity', requireAdmin, async (req, res) => {
  try {
    res.json({ activities: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// ===================================
// TOP PERFORMERS (Stub for now)
// ===================================
router.get('/top-performers', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.id,
        b.name,
        b.average_rating as rating,
        b.total_bookings as bookings,
        b.total_reviews as reviews
      FROM businesses b
      ORDER BY b.average_rating DESC, b.total_bookings DESC
      LIMIT 10
    `);

    res.json({ performers: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch top performers' });
  }
});

// ===================================
// ALERTS (Stub for now)
// ===================================
router.get('/alerts', requireAdmin, async (req, res) => {
  try {
    res.json({ alerts: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// ===================================
// ADS
// ===================================
router.get('/ads', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT
        ac.id,
        ac.title,
        ac.description,
        ac.type,
        ac.status,
        ac.total_budget,
        ac.spent_amount,
        ac.impressions,
        ac.clicks,
        ac.click_through_rate,
        ac.start_date,
        ac.end_date,
        ac.created_at,
        u.first_name || ' ' || u.last_name as advertiser_name,
        u.email as advertiser_email
      FROM ad_campaigns ac
      JOIN users u ON ac.user_id = u.id
      ORDER BY ac.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await pool.query(`SELECT COUNT(*) FROM ad_campaigns`);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      ads: result.rows,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({ error: 'Failed to fetch ads', details: error.message });
  }
});

module.exports = router;
