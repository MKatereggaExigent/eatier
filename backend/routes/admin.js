const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Middleware to set tenant context and check admin role
const requireAdmin = async (req, res, next) => {
  // TODO: Implement proper JWT authentication
  // For now, set default tenant context
  try {
    const client = await pool.connect();
    await client.query("SELECT set_tenant_context('itiyum')");
    client.release();
  } catch (error) {
    console.error('Error setting tenant context:', error);
  }
  next();
};

// ===================================
// ADMIN DASHBOARD STATISTICS
// ===================================

// Get platform statistics
router.get('/statistics', requireAdmin, async (req, res) => {
  try {
    // Get tenant ID
    const tenantResult = await pool.query(`
      SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1
    `);
    
    if (!tenantResult.rows.length) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    const tenantId = tenantResult.rows[0].id;

    // Get statistics from materialized view
    const statsResult = await pool.query(`
      SELECT * FROM admin_statistics WHERE tenant_id = $1
    `, [tenantId]);

    const stats = statsResult.rows[0] || {
      total_users: 0,
      total_businesses: 0,
      total_bookings: 0,
      confirmed_bookings: 0,
      total_revenue: 0,
      new_users_30d: 0,
      new_businesses_30d: 0,
      last_updated: new Date()
    };

    res.json({
      totalUsers: parseInt(stats.total_users) || 0,
      totalBusinesses: parseInt(stats.total_businesses) || 0,
      totalBookings: parseInt(stats.total_bookings) || 0,
      confirmedBookings: parseInt(stats.confirmed_bookings) || 0,
      totalRevenue: parseFloat(stats.total_revenue) || 0,
      newUsers30d: parseInt(stats.new_users_30d) || 0,
      newBusinesses30d: parseInt(stats.new_businesses_30d) || 0,
      newUsersToday: 0, // Requires additional permissions to query
      newBusinessesToday: 0, // Requires additional permissions to query
      newBookingsToday: 0, // Requires additional permissions to query
      pendingBookings: 0, // Requires additional permissions to query
      revenue30d: 0, // Revenue tracking not yet implemented
      lastUpdated: stats.last_updated || new Date()
    });

  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ===================================
// RECENT ACTIVITY
// ===================================

router.get('/activity', requireAdmin, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(`
      SELECT
        id,
        action_type,
        resource_type,
        resource_id,
        description,
        metadata,
        created_at
      FROM activity_log
      WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1)
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// ===================================
// TOP PERFORMERS
// ===================================

router.get('/top-performers', requireAdmin, async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const result = await pool.query(`
      SELECT
        b.id,
        b.business_name as name,
        b.business_type as type,
        b.country as location,
        COUNT(DISTINCT bk.id) as total_bookings,
        COALESCE(SUM(bk.total_amount), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN bk.status = 'completed' THEN 5.0 ELSE 0 END), 0) as rating
      FROM businesses b
      LEFT JOIN bookings bk ON b.id = bk.business_id
      WHERE b.tenant_id = (SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1)
        AND b.account_status = 'active'
      GROUP BY b.id, b.business_name, b.business_type, b.country
      HAVING COUNT(DISTINCT bk.id) > 0
      ORDER BY total_revenue DESC, total_bookings DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({ error: 'Failed to fetch top performers' });
  }
});

// ===================================
// SYSTEM ALERTS
// ===================================

router.get('/alerts', requireAdmin, async (req, res) => {
  try {
    // Generate system alerts based on platform state
    const alerts = [];

    // Check for pending verifications
    const pendingUsers = await pool.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1)
        AND email_verified = false
    `);

    if (parseInt(pendingUsers.rows[0].count) > 0) {
      alerts.push({
        id: 'alert-1',
        type: 'warning',
        title: 'Pending User Verifications',
        message: `${pendingUsers.rows[0].count} users pending email verification`,
        isRead: false,
        createdAt: new Date()
      });
    }

    // Check for pending bookings
    const pendingBookings = await pool.query(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1)
        AND status = 'pending'
        AND booking_date >= CURRENT_DATE
    `);

    if (parseInt(pendingBookings.rows[0].count) > 0) {
      alerts.push({
        id: 'alert-2',
        type: 'info',
        title: 'Pending Bookings',
        message: `${pendingBookings.rows[0].count} bookings awaiting confirmation`,
        isRead: false,
        createdAt: new Date()
      });
    }

    // Check for inactive businesses
    const inactiveBusinesses = await pool.query(`
      SELECT COUNT(*) as count
      FROM businesses
      WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1)
        AND account_status = 'frozen'
    `);

    if (parseInt(inactiveBusinesses.rows[0].count) > 0) {
      alerts.push({
        id: 'alert-3',
        type: 'warning',
        title: 'Frozen Business Accounts',
        message: `${inactiveBusinesses.rows[0].count} business accounts are currently frozen`,
        isRead: false,
        createdAt: new Date()
      });
    }

    res.json(alerts);

  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// ===================================
// USERS MANAGEMENT
// ===================================

router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const offset = (page - 1) * limit;

    // Get tenant ID
    const tenantResult = await pool.query(
      "SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1"
    );
    const tenantId = tenantResult.rows[0]?.id;

    if (!tenantId) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    let query = `
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.country,
        u.account_status,
        u.email_verified,
        u.phone_verified,
        u.profile_photo as avatar_url,
        u.created_at,
        u.last_login_at,
        (SELECT r.name FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = u.id
         LIMIT 1) as role_name,
        0 as total_bookings,
        (SELECT b.business_name FROM businesses b WHERE b.owner_id = u.id LIMIT 1) as business_name
      FROM users u
      WHERE u.tenant_id = $1
    `;

    const params = [tenantId];
    let paramIndex = 2;

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
      paramIndex++;
    }

    if (status) {
      params.push(status);
      query += ` AND u.account_status = $${paramIndex}`;
      paramIndex++;
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM users u WHERE u.tenant_id = $1`;
    const countParams = [tenantId];
    let countParamIndex = 2;

    if (search) {
      countParams.push(`%${search}%`);
      countQuery += ` AND (u.email ILIKE $${countParamIndex} OR u.first_name ILIKE $${countParamIndex} OR u.last_name ILIKE $${countParamIndex})`;
      countParamIndex++;
    }

    if (status) {
      countParams.push(status);
      countQuery += ` AND u.account_status = $${countParamIndex}`;
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
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch users',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Suspend user (freeze account)
router.patch('/users/:id/suspend', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Update user status to frozen (suspended)
    const result = await pool.query(`
      UPDATE users
      SET account_status = 'frozen',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, first_name, last_name, account_status
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log the action in activity log
    await pool.query(`
      INSERT INTO activity_log (action_type, resource_type, resource_id, description, metadata)
      VALUES ('user_suspended', 'user', $1, $2, $3)
    `, [
      id,
      `User ${result.rows[0].email} was suspended (frozen)`,
      JSON.stringify({ reason, admin_action: true })
    ]);

    res.json({
      message: 'User suspended successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

// Activate user
router.patch('/users/:id/activate', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Update user status to active
    const result = await pool.query(`
      UPDATE users
      SET account_status = 'active',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, first_name, last_name, account_status
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log the action in activity log
    await pool.query(`
      INSERT INTO activity_log (action_type, resource_type, resource_id, description, metadata)
      VALUES ('user_activated', 'user', $1, $2, $3)
    `, [
      id,
      `User ${result.rows[0].email} was activated`,
      JSON.stringify({ admin_action: true })
    ]);

    res.json({
      message: 'User activated successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error activating user:', error);
    res.status(500).json({ error: 'Failed to activate user' });
  }
});

// Delete user
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get user info before deletion for logging
    const userResult = await pool.query(`
      SELECT email, first_name, last_name FROM users WHERE id = $1
    `, [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Delete user (cascade will handle related records)
    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);

    // Log the action in activity log
    await pool.query(`
      INSERT INTO activity_log (action_type, resource_type, resource_id, description, metadata)
      VALUES ('user_deleted', 'user', $1, $2, $3)
    `, [
      id,
      `User ${user.email} was deleted`,
      JSON.stringify({
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        admin_action: true
      })
    ]);

    res.json({
      message: 'User deleted successfully',
      deletedUser: {
        id,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ===================================
// BUSINESSES MANAGEMENT
// ===================================

router.get('/businesses', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 100, search, status, business_type, verified } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        b.id,
        b.business_name,
        b.business_type,
        b.email,
        b.phone,
        b.country,
        b.address,
        b.bio,
        b.sustainability_ethos,
        b.opens_at,
        b.closes_at,
        b.facilities,
        b.account_status,
        b.created_at,
        b.updated_at,
        u.id as owner_id,
        u.first_name || ' ' || u.last_name as owner_name,
        u.email as owner_email,
        u.last_login_at,
        u.email_verified,
        (SELECT COUNT(*) FROM bookings WHERE business_id = b.id) as total_bookings,
        0 as average_rating,
        0 as total_reviews
      FROM businesses b
      JOIN users u ON b.owner_id = u.id
      WHERE b.tenant_id = (SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1)
    `;

    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (b.business_name ILIKE $${params.length} OR b.email ILIKE $${params.length} OR u.first_name || ' ' || u.last_name ILIKE $${params.length} OR b.country ILIKE $${params.length})`;
    }

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND b.account_status = $${params.length}`;
    }

    if (business_type && business_type !== 'all') {
      params.push(business_type);
      query += ` AND b.business_type = $${params.length}`;
    }

    if (verified && verified !== 'all') {
      if (verified === 'verified') {
        query += ` AND u.email_verified = true`;
      } else {
        query += ` AND u.email_verified = false`;
      }
    }

    // Get total count with a simpler query
    const countQuery = `
      SELECT COUNT(*)
      FROM businesses b
      JOIN users u ON b.owner_id = u.id
      WHERE b.tenant_id = (SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1)
      ${search ? ` AND (b.business_name ILIKE $1 OR b.email ILIKE $1 OR u.first_name || ' ' || u.last_name ILIKE $1 OR b.country ILIKE $1)` : ''}
      ${status && status !== 'all' ? ` AND b.account_status = $${search ? 2 : 1}` : ''}
      ${business_type && business_type !== 'all' ? ` AND b.business_type = $${search && status && status !== 'all' ? 3 : search || (status && status !== 'all') ? 2 : 1}` : ''}
      ${verified === 'verified' ? ` AND u.email_verified = true` : verified === 'not_verified' ? ` AND u.email_verified = false` : ''}
    `;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);

    query += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      businesses: result.rows,
      total: totalCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: result.rows.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// Verify business
router.patch('/businesses/:id/verify', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Update business owner's email_verified status
    const result = await pool.query(`
      UPDATE users
      SET email_verified = true,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT owner_id FROM businesses WHERE id = $1)
      RETURNING id, email, first_name, last_name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Log the action
    await pool.query(`
      INSERT INTO activity_log (action_type, resource_type, resource_id, description, metadata)
      VALUES ('business_verified', 'business', $1, $2, $3)
    `, [
      id,
      `Business verified by admin`,
      JSON.stringify({ admin_action: true })
    ]);

    res.json({
      message: 'Business verified successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error verifying business:', error);
    res.status(500).json({ error: 'Failed to verify business' });
  }
});

// Suspend business
router.patch('/businesses/:id/suspend', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Update business status to frozen
    const result = await pool.query(`
      UPDATE businesses
      SET account_status = 'frozen',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, business_name, email, account_status
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Log the action
    await pool.query(`
      INSERT INTO activity_log (action_type, resource_type, resource_id, description, metadata)
      VALUES ('business_suspended', 'business', $1, $2, $3)
    `, [
      id,
      `Business ${result.rows[0].business_name} was suspended`,
      JSON.stringify({ reason, admin_action: true })
    ]);

    res.json({
      message: 'Business suspended successfully',
      business: result.rows[0]
    });

  } catch (error) {
    console.error('Error suspending business:', error);
    res.status(500).json({ error: 'Failed to suspend business' });
  }
});

// Activate business
router.patch('/businesses/:id/activate', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Update business status to active
    const result = await pool.query(`
      UPDATE businesses
      SET account_status = 'active',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, business_name, email, account_status
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Log the action
    await pool.query(`
      INSERT INTO activity_log (action_type, resource_type, resource_id, description, metadata)
      VALUES ('business_activated', 'business', $1, $2, $3)
    `, [
      id,
      `Business ${result.rows[0].business_name} was activated`,
      JSON.stringify({ admin_action: true })
    ]);

    res.json({
      message: 'Business activated successfully',
      business: result.rows[0]
    });

  } catch (error) {
    console.error('Error activating business:', error);
    res.status(500).json({ error: 'Failed to activate business' });
  }
});

// Delete business
router.delete('/businesses/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get business info before deletion
    const businessResult = await pool.query(`
      SELECT business_name, email FROM businesses WHERE id = $1
    `, [id]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = businessResult.rows[0];

    // Delete business (cascade will handle related records)
    await pool.query(`DELETE FROM businesses WHERE id = $1`, [id]);

    // Log the action
    await pool.query(`
      INSERT INTO activity_log (action_type, resource_type, resource_id, description, metadata)
      VALUES ('business_deleted', 'business', $1, $2, $3)
    `, [
      id,
      `Business ${business.business_name} was deleted`,
      JSON.stringify({
        business_name: business.business_name,
        email: business.email,
        admin_action: true
      })
    ]);

    res.json({
      message: 'Business deleted successfully',
      deletedBusiness: {
        id,
        business_name: business.business_name
      }
    });

  } catch (error) {
    console.error('Error deleting business:', error);
    res.status(500).json({ error: 'Failed to delete business' });
  }
});

// ===================================
// BOOKINGS MANAGEMENT
// ===================================

router.get('/bookings', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 100, search, status, business_id, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        bk.id,
        bk.booking_date,
        bk.booking_time,
        bk.party_size,
        bk.status,
        bk.special_requests,
        bk.total_amount,
        bk.created_at,
        bk.updated_at,
        u.id as user_id,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        b.id as business_id,
        b.business_name,
        b.business_type,
        b.email as business_email,
        b.phone as business_phone
      FROM bookings bk
      JOIN users u ON bk.user_id = u.id
      JOIN businesses b ON bk.business_id = b.id
      WHERE bk.tenant_id = (SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1)
    `;

    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.first_name || ' ' || u.last_name ILIKE $${params.length} OR b.business_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND bk.status = $${params.length}`;
    }

    if (business_id) {
      params.push(business_id);
      query += ` AND bk.business_id = $${params.length}`;
    }

    if (date_from) {
      params.push(date_from);
      query += ` AND bk.booking_date >= $${params.length}`;
    }

    if (date_to) {
      params.push(date_to);
      query += ` AND bk.booking_date <= $${params.length}`;
    }

    // Get total count with a simpler query
    let countQuery = `
      SELECT COUNT(*)
      FROM bookings bk
      JOIN users u ON bk.user_id = u.id
      JOIN businesses b ON bk.business_id = b.id
      WHERE bk.tenant_id = (SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1)
    `;

    if (search) {
      countQuery += ` AND (u.first_name || ' ' || u.last_name ILIKE $1 OR b.business_name ILIKE $1 OR u.email ILIKE $1)`;
    }
    if (status && status !== 'all') {
      countQuery += ` AND bk.status = $${search ? 2 : 1}`;
    }
    if (business_id) {
      const paramIndex = params.length + 1;
      countQuery += ` AND bk.business_id = $${paramIndex}`;
    }
    if (date_from) {
      const paramIndex = params.length + 1;
      countQuery += ` AND bk.booking_date >= $${paramIndex}`;
    }
    if (date_to) {
      const paramIndex = params.length + 1;
      countQuery += ` AND bk.booking_date <= $${paramIndex}`;
    }

    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);

    query += ` ORDER BY bk.booking_date DESC, bk.booking_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

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

// Cancel booking
router.patch('/bookings/:id/cancel', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(`
      UPDATE bookings
      SET status = 'cancelled',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, booking_date, booking_time, status
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Log the action
    await pool.query(`
      INSERT INTO activity_log (action_type, resource_type, resource_id, description, metadata)
      VALUES ('booking_cancelled', 'booking', $1, $2, $3)
    `, [
      id,
      `Booking cancelled by admin`,
      JSON.stringify({ reason, admin_action: true })
    ]);

    res.json({
      message: 'Booking cancelled successfully',
      booking: result.rows[0]
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// Confirm booking
router.patch('/bookings/:id/confirm', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE bookings
      SET status = 'confirmed',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, booking_date, booking_time, status
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Log the action
    await pool.query(`
      INSERT INTO activity_log (action_type, resource_type, resource_id, description, metadata)
      VALUES ('booking_confirmed', 'booking', $1, $2, $3)
    `, [
      id,
      `Booking confirmed by admin`,
      JSON.stringify({ admin_action: true })
    ]);

    res.json({
      message: 'Booking confirmed successfully',
      booking: result.rows[0]
    });

  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ error: 'Failed to confirm booking' });
  }
});

// ===================================
// ANALYTICS
// ===================================

router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const tenantId = await pool.query(`SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1`);

    if (tenantId.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantId.rows[0].id;

    // Get overall statistics
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE tenant_id = $1) as total_users,
        (SELECT COUNT(*) FROM businesses WHERE tenant_id = $1) as total_businesses,
        (SELECT COUNT(*) FROM bookings WHERE tenant_id = $1) as total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE tenant_id = $1 AND status = 'confirmed') as confirmed_bookings,
        (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE tenant_id = $1) as total_revenue,
        (SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_30d,
        (SELECT COUNT(*) FROM businesses WHERE tenant_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days') as new_businesses_30d,
        (SELECT COUNT(*) FROM bookings WHERE tenant_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days') as new_bookings_30d,
        (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE tenant_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days') as revenue_30d
    `, [tenant]);

    // Get user growth by month (last 6 months)
    const userGrowth = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
        COUNT(*) as users
      FROM users
      WHERE tenant_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `, [tenant]);

    // Get revenue by month (last 6 months)
    const revenueData = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM bookings
      WHERE tenant_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `, [tenant]);

    // Get booking trends by month (last 6 months)
    const bookingTrends = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
        COUNT(*) as bookings
      FROM bookings
      WHERE tenant_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `, [tenant]);

    // Get top countries by users
    const topCountries = await pool.query(`
      SELECT
        country,
        COUNT(*) as user_count
      FROM users
      WHERE tenant_id = $1 AND country IS NOT NULL
      GROUP BY country
      ORDER BY user_count DESC
      LIMIT 10
    `, [tenant]);

    // Get business type distribution
    const businessTypes = await pool.query(`
      SELECT
        business_type,
        COUNT(*) as count
      FROM businesses
      WHERE tenant_id = $1
      GROUP BY business_type
      ORDER BY count DESC
    `, [tenant]);

    // Get booking status distribution
    const bookingStatus = await pool.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM bookings
      WHERE tenant_id = $1
      GROUP BY status
      ORDER BY count DESC
    `, [tenant]);

    res.json({
      statistics: stats.rows[0],
      userGrowth: userGrowth.rows,
      revenueData: revenueData.rows,
      bookingTrends: bookingTrends.rows,
      topCountries: topCountries.rows,
      businessTypes: businessTypes.rows,
      bookingStatus: bookingStatus.rows
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ===================================
// REPORTS
// ===================================

router.get('/reports/stats', requireAdmin, async (req, res) => {
  try {
    const tenantId = await pool.query(`SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1`);

    if (tenantId.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantId.rows[0].id;

    // Get report statistics
    const stats = {
      availableReports: 6, // Number of report types we support
      scheduledReports: 0, // Future feature
      generatedThisMonth: 0, // Future feature - would track in a reports_history table
      dataExported: '0 MB' // Future feature
    };

    res.json(stats);

  } catch (error) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({ error: 'Failed to fetch report stats' });
  }
});

// Generate Users Report
router.post('/reports/users', requireAdmin, async (req, res) => {
  try {
    const { format = 'json', dateFrom, dateTo } = req.body;
    const tenantId = await pool.query(`SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1`);

    if (tenantId.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantId.rows[0].id;

    let query = `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.country,
        u.account_status,
        u.email_verified,
        u.created_at,
        u.last_login_at,
        r.name as role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.tenant_id = $1
    `;

    const params = [tenant];

    if (dateFrom) {
      params.push(dateFrom);
      query += ` AND u.created_at >= $${params.length}`;
    }

    if (dateTo) {
      params.push(dateTo);
      query += ` AND u.created_at <= $${params.length}`;
    }

    query += ` ORDER BY u.created_at DESC`;

    const result = await pool.query(query, params);

    if (format === 'csv') {
      // Generate CSV
      const csv = convertToCSV(result.rows, [
        'id', 'first_name', 'last_name', 'email', 'phone', 'country',
        'account_status', 'email_verified', 'role', 'created_at', 'last_login_at'
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users-report.csv');
      return res.send(csv);
    }

    res.json({
      report: 'users',
      generatedAt: new Date(),
      totalRecords: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error generating users report:', error);
    res.status(500).json({ error: 'Failed to generate users report' });
  }
});

// Generate Businesses Report
router.post('/reports/businesses', requireAdmin, async (req, res) => {
  try {
    const { format = 'json', dateFrom, dateTo } = req.body;
    const tenantId = await pool.query(`SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1`);

    if (tenantId.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantId.rows[0].id;

    let query = `
      SELECT
        b.id,
        b.business_name,
        b.business_type,
        b.email,
        b.phone,
        b.country,
        b.address,
        b.account_status,
        b.created_at,
        u.first_name || ' ' || u.last_name as owner_name,
        u.email as owner_email,
        (SELECT COUNT(*) FROM bookings WHERE business_id = b.id) as total_bookings
      FROM businesses b
      JOIN users u ON b.owner_id = u.id
      WHERE b.tenant_id = $1
    `;

    const params = [tenant];

    if (dateFrom) {
      params.push(dateFrom);
      query += ` AND b.created_at >= $${params.length}`;
    }

    if (dateTo) {
      params.push(dateTo);
      query += ` AND b.created_at <= $${params.length}`;
    }

    query += ` ORDER BY b.created_at DESC`;

    const result = await pool.query(query, params);

    if (format === 'csv') {
      const csv = convertToCSV(result.rows, [
        'id', 'business_name', 'business_type', 'email', 'phone', 'country',
        'address', 'account_status', 'owner_name', 'owner_email', 'total_bookings', 'created_at'
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=businesses-report.csv');
      return res.send(csv);
    }

    res.json({
      report: 'businesses',
      generatedAt: new Date(),
      totalRecords: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error generating businesses report:', error);
    res.status(500).json({ error: 'Failed to generate businesses report' });
  }
});

// Generate Bookings Report
router.post('/reports/bookings', requireAdmin, async (req, res) => {
  try {
    const { format = 'json', dateFrom, dateTo, status } = req.body;
    const tenantId = await pool.query(`SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1`);

    if (tenantId.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantId.rows[0].id;

    let query = `
      SELECT
        bk.id,
        bk.booking_date,
        bk.booking_time,
        bk.party_size,
        bk.status,
        bk.special_requests,
        bk.total_amount,
        bk.created_at,
        u.first_name || ' ' || u.last_name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone,
        b.business_name,
        b.business_type,
        b.email as business_email
      FROM bookings bk
      JOIN users u ON bk.user_id = u.id
      JOIN businesses b ON bk.business_id = b.id
      WHERE bk.tenant_id = $1
    `;

    const params = [tenant];

    if (dateFrom) {
      params.push(dateFrom);
      query += ` AND bk.booking_date >= $${params.length}`;
    }

    if (dateTo) {
      params.push(dateTo);
      query += ` AND bk.booking_date <= $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND bk.status = $${params.length}`;
    }

    query += ` ORDER BY bk.booking_date DESC, bk.booking_time DESC`;

    const result = await pool.query(query, params);

    if (format === 'csv') {
      const csv = convertToCSV(result.rows, [
        'id', 'booking_date', 'booking_time', 'party_size', 'status',
        'total_amount', 'customer_name', 'customer_email', 'customer_phone',
        'business_name', 'business_type', 'special_requests', 'created_at'
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=bookings-report.csv');
      return res.send(csv);
    }

    res.json({
      report: 'bookings',
      generatedAt: new Date(),
      totalRecords: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error generating bookings report:', error);
    res.status(500).json({ error: 'Failed to generate bookings report' });
  }
});

// Generate Financial Report
router.post('/reports/financial', requireAdmin, async (req, res) => {
  try {
    const { format = 'json', dateFrom, dateTo } = req.body;
    const tenantId = await pool.query(`SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1`);

    if (tenantId.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantId.rows[0].id;

    let query = `
      SELECT
        bk.id as transaction_id,
        bk.booking_date,
        bk.total_amount,
        bk.status,
        bk.created_at as transaction_date,
        b.business_name,
        b.business_type,
        u.first_name || ' ' || u.last_name as customer_name,
        u.email as customer_email
      FROM bookings bk
      JOIN businesses b ON bk.business_id = b.id
      JOIN users u ON bk.user_id = u.id
      WHERE bk.tenant_id = $1 AND bk.total_amount > 0
    `;

    const params = [tenant];

    if (dateFrom) {
      params.push(dateFrom);
      query += ` AND bk.created_at >= $${params.length}`;
    }

    if (dateTo) {
      params.push(dateTo);
      query += ` AND bk.created_at <= $${params.length}`;
    }

    query += ` ORDER BY bk.created_at DESC`;

    const result = await pool.query(query, params);

    // Calculate summary
    const totalRevenue = result.rows.reduce((sum, row) => sum + parseFloat(row.total_amount || 0), 0);
    const confirmedRevenue = result.rows
      .filter(row => row.status === 'confirmed')
      .reduce((sum, row) => sum + parseFloat(row.total_amount || 0), 0);

    if (format === 'csv') {
      const csv = convertToCSV(result.rows, [
        'transaction_id', 'transaction_date', 'booking_date', 'total_amount',
        'status', 'business_name', 'business_type', 'customer_name', 'customer_email'
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=financial-report.csv');
      return res.send(csv);
    }

    res.json({
      report: 'financial',
      generatedAt: new Date(),
      totalRecords: result.rows.length,
      summary: {
        totalRevenue,
        confirmedRevenue,
        pendingRevenue: totalRevenue - confirmedRevenue
      },
      data: result.rows
    });

  } catch (error) {
    console.error('Error generating financial report:', error);
    res.status(500).json({ error: 'Failed to generate financial report' });
  }
});

// Generate Analytics Report
router.post('/reports/analytics', requireAdmin, async (req, res) => {
  try {
    const { format = 'json', dateFrom, dateTo } = req.body;
    const tenantId = await pool.query(`SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1`);

    if (tenantId.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantId.rows[0].id;

    // Build query parameters
    const params = [tenant];
    let dateFilter = '';

    if (dateFrom) {
      params.push(dateFrom);
      dateFilter += ` AND created_at >= $${params.length}`;
    }

    if (dateTo) {
      params.push(dateTo);
      dateFilter += ` AND created_at <= $${params.length}`;
    }

    // User growth by month
    const userGrowth = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
        COUNT(*) as new_users
      FROM users
      WHERE tenant_id = $1 ${dateFilter}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) DESC
    `, params);

    // Business growth by month
    const businessGrowth = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
        COUNT(*) as new_businesses
      FROM businesses
      WHERE tenant_id = $1 ${dateFilter}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) DESC
    `, params);

    // Booking trends by month
    let bookingDateFilter = '';
    if (dateFrom) {
      bookingDateFilter += ` AND booking_date >= $2`;
    }
    if (dateTo) {
      bookingDateFilter += ` AND booking_date <= $${dateFrom ? 3 : 2}`;
    }

    const bookingTrends = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', booking_date), 'YYYY-MM') as month,
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM bookings
      WHERE tenant_id = $1 ${bookingDateFilter}
      GROUP BY DATE_TRUNC('month', booking_date)
      ORDER BY DATE_TRUNC('month', booking_date) DESC
    `, params);

    // Combine all analytics data
    const combinedData = {
      userGrowth: userGrowth.rows,
      businessGrowth: businessGrowth.rows,
      bookingTrends: bookingTrends.rows
    };

    if (format === 'csv') {
      // Flatten the data for CSV
      const flatData = [];
      userGrowth.rows.forEach(row => {
        flatData.push({
          month: row.month,
          metric: 'User Growth',
          new_count: row.new_users,
          total_count: row.total_users,
          value: ''
        });
      });
      businessGrowth.rows.forEach(row => {
        flatData.push({
          month: row.month,
          metric: 'Business Growth',
          new_count: row.new_businesses,
          total_count: row.total_businesses,
          value: ''
        });
      });
      bookingTrends.rows.forEach(row => {
        flatData.push({
          month: row.month,
          metric: 'Booking Trends',
          new_count: row.total_bookings,
          total_count: row.confirmed_bookings,
          value: row.revenue
        });
      });

      const csv = convertToCSV(flatData, ['month', 'metric', 'new_count', 'total_count', 'value']);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics-report.csv');
      return res.send(csv);
    }

    res.json({
      report: 'analytics',
      generatedAt: new Date(),
      totalRecords: userGrowth.rows.length + businessGrowth.rows.length + bookingTrends.rows.length,
      data: combinedData
    });

  } catch (error) {
    console.error('Error generating analytics report:', error);
    res.status(500).json({ error: 'Failed to generate analytics report' });
  }
});

// Generate Activity Report
router.post('/reports/activity', requireAdmin, async (req, res) => {
  try {
    const { format = 'json', dateFrom, dateTo, actionType } = req.body;
    const tenantId = await pool.query(`SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1`);

    if (tenantId.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantId.rows[0].id;

    let query = `
      SELECT
        al.id,
        al.action_type,
        al.resource_type,
        al.resource_id,
        al.description,
        al.ip_address,
        al.created_at,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email,
        r.name as user_role
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE al.tenant_id = $1
    `;

    const params = [tenant];

    if (dateFrom) {
      params.push(dateFrom);
      query += ` AND al.created_at >= $${params.length}`;
    }

    if (dateTo) {
      params.push(dateTo);
      query += ` AND al.created_at <= $${params.length}`;
    }

    if (actionType && actionType !== 'all') {
      params.push(actionType);
      query += ` AND al.action_type = $${params.length}`;
    }

    query += ` ORDER BY al.created_at DESC LIMIT 1000`;

    const result = await pool.query(query, params);

    if (format === 'csv') {
      const csv = convertToCSV(result.rows, [
        'id', 'created_at', 'action_type', 'resource_type', 'resource_id',
        'user_name', 'user_email', 'user_role', 'ip_address', 'description'
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=activity-report.csv');
      return res.send(csv);
    }

    res.json({
      report: 'activity',
      generatedAt: new Date(),
      totalRecords: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error generating activity report:', error);
    res.status(500).json({ error: 'Failed to generate activity report' });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data, columns) {
  if (data.length === 0) return '';

  const header = columns.join(',');
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

// ===================================
// SETTINGS
// ===================================

router.get('/settings', requireAdmin, async (req, res) => {
  try {
    const tenantId = await pool.query(`SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1`);

    if (tenantId.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantId.rows[0].id;

    // Get all settings for the tenant
    const result = await pool.query(`
      SELECT
        id,
        category,
        key,
        value,
        type,
        description,
        is_public,
        updated_at
      FROM settings
      WHERE tenant_id = $1
      ORDER BY category, key
    `, [tenant]);

    // Parse values based on type and group by category
    const settingsByCategory = result.rows.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }

      // Parse value based on type
      let parsedValue = setting.value;
      if (setting.type === 'boolean') {
        parsedValue = setting.value === 'true';
      } else if (setting.type === 'number') {
        parsedValue = parseFloat(setting.value);
      } else if (setting.type === 'json') {
        try {
          parsedValue = JSON.parse(setting.value);
        } catch (e) {
          parsedValue = setting.value;
        }
      }

      acc[setting.category].push({
        id: setting.id,
        key: setting.key,
        value: parsedValue,
        type: setting.type,
        description: setting.description,
        isPublic: setting.is_public,
        updatedAt: setting.updated_at
      });
      return acc;
    }, {});

    res.json({
      settings: settingsByCategory,
      totalSettings: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.patch('/settings/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body;
    const tenantId = await pool.query(`SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1`);

    if (tenantId.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantId.rows[0].id;

    // Get the setting type first
    const typeResult = await pool.query(`
      SELECT type, key FROM settings WHERE id = $1 AND tenant_id = $2
    `, [id, tenant]);

    if (typeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    const { type, key } = typeResult.rows[0];

    // Convert value to string based on type
    let stringValue = value;
    if (type === 'boolean') {
      stringValue = value ? 'true' : 'false';
    } else if (type === 'number') {
      stringValue = value.toString();
    } else if (type === 'json') {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = value.toString();
    }

    // Update the setting
    const result = await pool.query(`
      UPDATE settings
      SET value = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, [stringValue, id, tenant]);

    // Log the action
    await pool.query(`
      INSERT INTO activity_log (tenant_id, user_id, action_type, resource_type, resource_id, description)
      VALUES ($1, $2, 'update', 'setting', $3, $4)
    `, [tenant, req.user.id, id, `Updated setting: ${key} to ${stringValue}`]);

    // Parse the value back for response
    let parsedValue = result.rows[0].value;
    if (type === 'boolean') {
      parsedValue = result.rows[0].value === 'true';
    } else if (type === 'number') {
      parsedValue = parseFloat(result.rows[0].value);
    } else if (type === 'json') {
      try {
        parsedValue = JSON.parse(result.rows[0].value);
      } catch (e) {
        parsedValue = result.rows[0].value;
      }
    }

    res.json({
      ...result.rows[0],
      value: parsedValue
    });

  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// ===================================
// ADS MANAGEMENT
// ===================================

router.get('/ads', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all', placement = 'all' } = req.query;
    const offset = (page - 1) * limit;

    const tenantId = await pool.query(`SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1`);

    if (tenantId.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantId.rows[0].id;

    // Build WHERE clause
    let whereConditions = ['a.tenant_id = $1'];
    const params = [tenant];
    let paramCount = 1;

    if (search) {
      paramCount++;
      whereConditions.push(`(a.title ILIKE $${paramCount} OR a.description ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }

    if (status && status !== 'all') {
      paramCount++;
      whereConditions.push(`a.status = $${paramCount}`);
      params.push(status);
    }

    if (placement && placement !== 'all') {
      paramCount++;
      whereConditions.push(`a.placement = $${paramCount}`);
      params.push(placement);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM ads a
      WHERE ${whereClause}
    `, params);

    const totalAds = parseInt(countResult.rows[0].total);

    // Get ads with stats
    const adsQuery = `
      SELECT
        a.id,
        a.title,
        a.description,
        a.image_url,
        a.target_url,
        a.placement,
        a.status,
        a.budget,
        a.spent,
        a.start_date,
        a.end_date,
        a.created_at,
        a.updated_at,
        COUNT(DISTINCT ai.id) as impressions,
        COUNT(DISTINCT ac.id) as clicks,
        CASE
          WHEN COUNT(DISTINCT ai.id) > 0
          THEN (COUNT(DISTINCT ac.id)::float / COUNT(DISTINCT ai.id)::float * 100)
          ELSE 0
        END as ctr
      FROM ads a
      LEFT JOIN ad_impressions ai ON a.id = ai.ad_id
      LEFT JOIN ad_clicks ac ON a.id = ac.ad_id
      WHERE ${whereClause}
      GROUP BY a.id
      ORDER BY a.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);
    const result = await pool.query(adsQuery, params);

    res.json({
      ads: result.rows,
      pagination: {
        currentPage: parseInt(page),
        pageSize: parseInt(limit),
        totalAds,
        totalPages: Math.ceil(totalAds / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

router.get('/ads/stats', requireAdmin, async (req, res) => {
  try {
    const tenantId = await pool.query(`SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1`);

    if (tenantId.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantId.rows[0].id;

    const statsQuery = `
      SELECT
        COUNT(DISTINCT a.id) as total_ads,
        COUNT(DISTINCT CASE WHEN a.status = 'active' THEN a.id END) as active_ads,
        COUNT(DISTINCT ai.id) as total_impressions,
        COUNT(DISTINCT ac.id) as total_clicks,
        CASE
          WHEN COUNT(DISTINCT ai.id) > 0
          THEN (COUNT(DISTINCT ac.id)::float / COUNT(DISTINCT ai.id)::float * 100)
          ELSE 0
        END as average_ctr,
        COALESCE(SUM(a.spent), 0) as total_spent
      FROM ads a
      LEFT JOIN ad_impressions ai ON a.id = ai.ad_id
      LEFT JOIN ad_clicks ac ON a.id = ac.ad_id
      WHERE a.tenant_id = $1
    `;

    const result = await pool.query(statsQuery, [tenant]);

    res.json({
      totalAds: parseInt(result.rows[0].total_ads),
      activeAds: parseInt(result.rows[0].active_ads),
      totalImpressions: parseInt(result.rows[0].total_impressions),
      totalClicks: parseInt(result.rows[0].total_clicks),
      averageCTR: parseFloat(result.rows[0].average_ctr),
      totalSpent: parseFloat(result.rows[0].total_spent)
    });

  } catch (error) {
    console.error('Error fetching ad stats:', error);
    res.status(500).json({ error: 'Failed to fetch ad stats' });
  }
});

router.get('/ads/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = await pool.query(`SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1`);

    if (tenantId.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantId.rows[0].id;

    const result = await pool.query(`
      SELECT
        a.*,
        COUNT(DISTINCT ai.id) as impressions,
        COUNT(DISTINCT ac.id) as clicks,
        CASE
          WHEN COUNT(DISTINCT ai.id) > 0
          THEN (COUNT(DISTINCT ac.id)::float / COUNT(DISTINCT ai.id)::float * 100)
          ELSE 0
        END as ctr
      FROM ads a
      LEFT JOIN ad_impressions ai ON a.id = ai.ad_id
      LEFT JOIN ad_clicks ac ON a.id = ac.ad_id
      WHERE a.id = $1 AND a.tenant_id = $2
      GROUP BY a.id
    `, [id, tenant]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching ad:', error);
    res.status(500).json({ error: 'Failed to fetch ad' });
  }
});

router.post('/ads', requireAdmin, async (req, res) => {
  try {
    const { title, description, imageUrl, targetUrl, placement, status, budget, startDate, endDate } = req.body;

    const tenantId = await pool.query(`SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1`);

    if (tenantId.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantId.rows[0].id;

    // Get the admin user ID
    const adminUser = await pool.query(`
      SELECT id FROM users WHERE email = 'admin@itiyum.com' LIMIT 1
    `);

    const userId = req.user?.id || (adminUser.rows.length > 0 ? adminUser.rows[0].id : null);

    const result = await pool.query(`
      INSERT INTO ads (
        tenant_id, created_by, title, description, image_url, target_url,
        placement, status, budget, start_date, end_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [tenant, userId, title, description, imageUrl, targetUrl, placement, status || 'draft', budget || 0, startDate, endDate]);

    // Log the action
    if (userId) {
      await pool.query(`
        INSERT INTO activity_log (tenant_id, user_id, action_type, resource_type, resource_id, description)
        VALUES ($1, $2, 'create', 'ad', $3, $4)
      `, [tenant, userId, result.rows[0].id, `Created ad: ${title}`]);
    }

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Error creating ad:', error);
    res.status(500).json({ error: 'Failed to create ad' });
  }
});

router.patch('/ads/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, imageUrl, targetUrl, placement, status, budget, spent, startDate, endDate } = req.body;

    const tenantId = await pool.query(`SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1`);

    if (tenantId.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantId.rows[0].id;

    // Build update query dynamically
    const updates = [];
    const params = [id, tenant];
    let paramCount = 2;

    if (title !== undefined) {
      paramCount++;
      updates.push(`title = $${paramCount}`);
      params.push(title);
    }
    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }
    if (imageUrl !== undefined) {
      paramCount++;
      updates.push(`image_url = $${paramCount}`);
      params.push(imageUrl);
    }
    if (targetUrl !== undefined) {
      paramCount++;
      updates.push(`target_url = $${paramCount}`);
      params.push(targetUrl);
    }
    if (placement !== undefined) {
      paramCount++;
      updates.push(`placement = $${paramCount}`);
      params.push(placement);
    }
    if (status !== undefined) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
    }
    if (budget !== undefined) {
      paramCount++;
      updates.push(`budget = $${paramCount}`);
      params.push(budget);
    }
    if (spent !== undefined) {
      paramCount++;
      updates.push(`spent = $${paramCount}`);
      params.push(spent);
    }
    if (startDate !== undefined) {
      paramCount++;
      updates.push(`start_date = $${paramCount}`);
      params.push(startDate);
    }
    if (endDate !== undefined) {
      paramCount++;
      updates.push(`end_date = $${paramCount}`);
      params.push(endDate);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const result = await pool.query(`
      UPDATE ads
      SET ${updates.join(', ')}
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    // Log the action
    if (req.user?.id) {
      await pool.query(`
        INSERT INTO activity_log (tenant_id, user_id, action_type, resource_type, resource_id, description)
        VALUES ($1, $2, 'update', 'ad', $3, $4)
      `, [tenant, req.user.id, id, `Updated ad: ${result.rows[0].title}`]);
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error updating ad:', error);
    res.status(500).json({ error: 'Failed to update ad' });
  }
});

router.delete('/ads/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = await pool.query(`SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1`);

    if (tenantId.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantId.rows[0].id;

    // Get ad title before deleting
    const adResult = await pool.query(`
      SELECT title FROM ads WHERE id = $1 AND tenant_id = $2
    `, [id, tenant]);

    if (adResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    const adTitle = adResult.rows[0].title;

    // Delete the ad (cascades to impressions and clicks)
    await pool.query(`
      DELETE FROM ads WHERE id = $1 AND tenant_id = $2
    `, [id, tenant]);

    // Log the action
    if (req.user?.id) {
      await pool.query(`
        INSERT INTO activity_log (tenant_id, user_id, action_type, resource_type, resource_id, description)
        VALUES ($1, $2, 'delete', 'ad', $3, $4)
      `, [tenant, req.user.id, id, `Deleted ad: ${adTitle}`]);
    }

    res.json({ message: 'Ad deleted successfully' });

  } catch (error) {
    console.error('Error deleting ad:', error);
    res.status(500).json({ error: 'Failed to delete ad' });
  }
});

module.exports = router;

