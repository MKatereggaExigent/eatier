const express = require('express');
const pool = require('../config/database');
const analyticsAIService = require('../services/analyticsAIService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// ===================================
// STATISTICS - COMPREHENSIVE PLATFORM METRICS
// ===================================
router.get('/statistics', requireAdmin, async (req, res) => {
  try {
    // Get comprehensive platform statistics
    const stats = await pool.query(`
      WITH
      -- User metrics
      user_metrics AS (
        SELECT
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_30d,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_users_7d,
          COUNT(*) FILTER (WHERE role = 'business_owner') as business_owners,
          COUNT(*) FILTER (WHERE role = 'food_enthusiast') as food_enthusiasts,
          COUNT(*) FILTER (WHERE role = 'normal_user') as normal_users,
          COUNT(*) FILTER (WHERE role = 'specialist') as specialists
        FROM users
      ),
      -- Business metrics
      business_metrics AS (
        SELECT
          COUNT(*) as total_businesses,
          COUNT(*) FILTER (WHERE status = 'active') as active_businesses,
          COUNT(*) FILTER (WHERE status = 'pending_verification') as pending_businesses,
          COUNT(*) FILTER (WHERE status = 'suspended') as suspended_businesses,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_businesses_30d,
          COUNT(*) FILTER (WHERE is_featured = true) as featured_businesses,
          AVG(average_rating) as avg_business_rating,
          SUM(total_bookings) as total_business_bookings
        FROM businesses
      ),
      -- Subscription metrics
      subscription_metrics AS (
        SELECT
          COUNT(*) as total_subscriptions,
          COUNT(*) FILTER (WHERE status = 'active') as active_subscriptions,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_subscriptions,
          COUNT(*) FILTER (WHERE status = 'expired') as expired_subscriptions,
          COUNT(*) FILTER (WHERE plan = 'free') as free_plan_count,
          COUNT(*) FILTER (WHERE plan = 'starter') as starter_plan_count,
          COUNT(*) FILTER (WHERE plan = 'professional') as professional_plan_count,
          COUNT(*) FILTER (WHERE plan = 'enterprise') as enterprise_plan_count,
          SUM(monthly_price) FILTER (WHERE status = 'active') as monthly_subscription_revenue,
          SUM(monthly_price) as total_potential_revenue
        FROM business_subscriptions
      ),
      -- Booking metrics
      booking_metrics AS (
        SELECT
          COUNT(*) as total_bookings,
          COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
          COUNT(*) FILTER (WHERE booking_date >= CURRENT_DATE - INTERVAL '30 days') as bookings_30d,
          COUNT(*) FILTER (WHERE booking_date >= CURRENT_DATE - INTERVAL '7 days') as bookings_7d,
          AVG(party_size) as avg_party_size,
          COUNT(*) FILTER (WHERE status = 'completed') * 5.00 as estimated_commission
        FROM bookings
      ),
      -- Ad campaign metrics (if table exists)
      ad_metrics AS (
        SELECT
          0 as total_campaigns,
          0 as active_campaigns,
          0 as completed_campaigns,
          0 as paused_campaigns,
          0.00 as total_ad_budget,
          0.00 as total_ad_spent,
          0 as total_impressions,
          0 as total_clicks,
          0 as total_conversions,
          0.00 as avg_ctr,
          0.00 as ad_revenue
      ),
      -- Revenue breakdown
      revenue_metrics AS (
        SELECT
          COALESCE(SUM(monthly_price) FILTER (WHERE status = 'active'), 0) as subscription_revenue,
          0.00 as ad_revenue,
          COALESCE((SELECT COUNT(*) * 5.00 FROM bookings WHERE status = 'completed'), 0) as commission_revenue
        FROM business_subscriptions
      )

      SELECT
        -- User metrics
        um.total_users,
        um.new_users_30d,
        um.new_users_7d,
        um.business_owners,
        um.food_enthusiasts,
        um.normal_users,
        um.specialists,

        -- Business metrics
        bm.total_businesses,
        bm.active_businesses,
        bm.pending_businesses,
        bm.suspended_businesses,
        bm.new_businesses_30d,
        bm.featured_businesses,
        COALESCE(bm.avg_business_rating, 0) as avg_business_rating,
        COALESCE(bm.total_business_bookings, 0) as total_business_bookings,

        -- Subscription metrics
        COALESCE(sm.total_subscriptions, 0) as total_subscriptions,
        COALESCE(sm.active_subscriptions, 0) as active_subscriptions,
        COALESCE(sm.cancelled_subscriptions, 0) as cancelled_subscriptions,
        COALESCE(sm.expired_subscriptions, 0) as expired_subscriptions,
        COALESCE(sm.free_plan_count, 0) as free_plan_count,
        COALESCE(sm.starter_plan_count, 0) as starter_plan_count,
        COALESCE(sm.professional_plan_count, 0) as professional_plan_count,
        COALESCE(sm.enterprise_plan_count, 0) as enterprise_plan_count,
        COALESCE(sm.monthly_subscription_revenue, 0) as monthly_subscription_revenue,
        COALESCE(sm.total_potential_revenue, 0) as total_potential_revenue,

        -- Booking metrics
        COALESCE(bkm.total_bookings, 0) as total_bookings,
        COALESCE(bkm.confirmed_bookings, 0) as confirmed_bookings,
        COALESCE(bkm.completed_bookings, 0) as completed_bookings,
        COALESCE(bkm.cancelled_bookings, 0) as cancelled_bookings,
        COALESCE(bkm.bookings_30d, 0) as bookings_30d,
        COALESCE(bkm.bookings_7d, 0) as bookings_7d,
        COALESCE(bkm.avg_party_size, 0) as avg_party_size,
        COALESCE(bkm.estimated_commission, 0) as estimated_commission,

        -- Ad metrics
        COALESCE(am.total_campaigns, 0) as total_campaigns,
        COALESCE(am.active_campaigns, 0) as active_campaigns,
        COALESCE(am.completed_campaigns, 0) as completed_campaigns,
        COALESCE(am.paused_campaigns, 0) as paused_campaigns,
        COALESCE(am.total_ad_budget, 0) as total_ad_budget,
        COALESCE(am.total_ad_spent, 0) as total_ad_spent,
        COALESCE(am.total_impressions, 0) as total_impressions,
        COALESCE(am.total_clicks, 0) as total_clicks,
        COALESCE(am.total_conversions, 0) as total_conversions,
        COALESCE(am.avg_ctr, 0) as avg_ctr,
        COALESCE(am.ad_revenue, 0) as ad_revenue,

        -- Revenue breakdown
        COALESCE(rm.subscription_revenue, 0) as subscription_revenue,
        COALESCE(rm.ad_revenue, 0) as ad_platform_revenue,
        COALESCE(rm.commission_revenue, 0) as commission_revenue,
        COALESCE(rm.subscription_revenue + rm.ad_revenue + rm.commission_revenue, 0) as total_revenue

      FROM user_metrics um
      CROSS JOIN business_metrics bm
      LEFT JOIN subscription_metrics sm ON true
      LEFT JOIN booking_metrics bkm ON true
      LEFT JOIN ad_metrics am ON true
      CROSS JOIN revenue_metrics rm
    `);

    const row = stats.rows[0];

    res.json({
      // User metrics
      totalUsers: parseInt(row.total_users) || 0,
      newUsers30d: parseInt(row.new_users_30d) || 0,
      newUsers7d: parseInt(row.new_users_7d) || 0,
      businessOwners: parseInt(row.business_owners) || 0,
      foodEnthusiasts: parseInt(row.food_enthusiasts) || 0,
      normalUsers: parseInt(row.normal_users) || 0,
      specialists: parseInt(row.specialists) || 0,

      // Business metrics
      totalBusinesses: parseInt(row.total_businesses) || 0,
      activeBusinesses: parseInt(row.active_businesses) || 0,
      pendingBusinesses: parseInt(row.pending_businesses) || 0,
      suspendedBusinesses: parseInt(row.suspended_businesses) || 0,
      newBusinesses30d: parseInt(row.new_businesses_30d) || 0,
      featuredBusinesses: parseInt(row.featured_businesses) || 0,
      avgBusinessRating: parseFloat(row.avg_business_rating) || 0,

      // Subscription metrics
      totalSubscriptions: parseInt(row.total_subscriptions) || 0,
      activeSubscriptions: parseInt(row.active_subscriptions) || 0,
      cancelledSubscriptions: parseInt(row.cancelled_subscriptions) || 0,
      expiredSubscriptions: parseInt(row.expired_subscriptions) || 0,
      freePlanCount: parseInt(row.free_plan_count) || 0,
      starterPlanCount: parseInt(row.starter_plan_count) || 0,
      professionalPlanCount: parseInt(row.professional_plan_count) || 0,
      enterprisePlanCount: parseInt(row.enterprise_plan_count) || 0,
      monthlySubscriptionRevenue: parseFloat(row.monthly_subscription_revenue) || 0,
      totalPotentialRevenue: parseFloat(row.total_potential_revenue) || 0,

      // Booking metrics
      totalBookings: parseInt(row.total_bookings) || 0,
      confirmedBookings: parseInt(row.confirmed_bookings) || 0,
      completedBookings: parseInt(row.completed_bookings) || 0,
      cancelledBookings: parseInt(row.cancelled_bookings) || 0,
      bookings30d: parseInt(row.bookings_30d) || 0,
      bookings7d: parseInt(row.bookings_7d) || 0,
      avgPartySize: parseFloat(row.avg_party_size) || 0,

      // Ad metrics
      totalCampaigns: parseInt(row.total_campaigns) || 0,
      activeCampaigns: parseInt(row.active_campaigns) || 0,
      completedCampaigns: parseInt(row.completed_campaigns) || 0,
      pausedCampaigns: parseInt(row.paused_campaigns) || 0,
      totalAdBudget: parseFloat(row.total_ad_budget) || 0,
      totalAdSpent: parseFloat(row.total_ad_spent) || 0,
      totalImpressions: parseInt(row.total_impressions) || 0,
      totalClicks: parseInt(row.total_clicks) || 0,
      totalConversions: parseInt(row.total_conversions) || 0,
      avgCTR: parseFloat(row.avg_ctr) || 0,

      // Revenue breakdown
      subscriptionRevenue: parseFloat(row.subscription_revenue) || 0,
      adRevenue: parseFloat(row.ad_platform_revenue) || 0,
      commissionRevenue: parseFloat(row.commission_revenue) || 0,
      totalRevenue: parseFloat(row.total_revenue) || 0,

      // Legacy fields for backward compatibility
      monthlyActiveUsers: parseInt(row.new_users_30d) || 0,
      monthlyRevenue: parseFloat(row.total_revenue) || 0,
      monthlyBookings: parseInt(row.bookings_30d) || 0,
      newUsersToday: 0,
      newBusinessesToday: 0,
      newBookingsToday: 0,
      pendingBookings: parseInt(row.confirmed_bookings) || 0,
      revenue30d: parseFloat(row.total_revenue) || 0
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
        u.tenant_id,
        t.name as tenant_name,
        u.status as account_status,
        u.email_verified,
        u.avatar_url,
        u.created_at,
        u.last_login_at,
        (SELECT COUNT(*) FROM bookings WHERE user_id = u.id) as total_bookings,
        (SELECT b.business_name FROM businesses b WHERE b.owner_id = u.id LIMIT 1) as business_name
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
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

// Create a new user (admin only)
router.post('/users', requireAdmin, async (req, res) => {
  console.log('=== CREATE USER REQUEST ===');
  console.log('User making request:', req.user?.email, 'Role:', req.user?.role);
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  const client = await pool.connect();
  try {
    const { email, password, firstName, lastName, phone, role = 'normal_user', status = 'active' } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Email, password, first name, and last name are required'
      });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters'
      });
    }

    await client.query('BEGIN');

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'User with this email already exists'
      });
    }

    // Get default tenant (Itiyum Platform)
    const tenantResult = await client.query(
      "SELECT id FROM tenants WHERE name = 'Itiyum Platform' LIMIT 1"
    );
    const tenantId = tenantResult.rows[0]?.id;

    if (!tenantId) {
      await client.query('ROLLBACK');
      return res.status(500).json({
        error: 'Default tenant not found'
      });
    }

    // Hash password
    const bcryptjs = require('bcryptjs');
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create user
    const result = await client.query(`
      INSERT INTO users (
        email, password_hash, first_name, last_name, phone, tenant_id, account_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, first_name, last_name, phone, tenant_id, account_status, created_at
    `, [
      email, hashedPassword, firstName, lastName, phone || null, tenantId, status
    ]);

    const user = result.rows[0];

    // Map role slug to role name
    const roleNameMap = {
      'business_owner': 'Business Owner',
      'food_enthusiast': 'Food Enthusiast',
      'specialist': 'Specialist',
      'itiyum_admin': 'Itiyum Admin',
      'normal_user': 'Normal User'
    };

    const roleName = roleNameMap[role] || 'Normal User';

    // Get role ID
    const roleResult = await client.query(
      "SELECT id FROM roles WHERE name = $1 LIMIT 1",
      [roleName]
    );

    if (roleResult.rows.length > 0) {
      // Assign role to user
      await client.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
        [user.id, roleResult.rows[0].id]
      );
    }

    await client.query('COMMIT');

    console.log(`Admin created user: ${email} with role: ${role}`);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: role,
        status: user.account_status,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  } finally {
    client.release();
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
        b.business_name,
        b.business_type,
        b.description,
        b.cuisine_types,
        b.price_range,
        b.phone,
        b.email,
        b.website AS website_url,
        b.address,
        b.city,
        b.country,
        b.logo_url,
        b.average_rating,
        b.total_reviews,
        b.total_bookings,
        b.status,
        b.account_status,
        b.is_featured,
        b.is_verified AS email_verified,
        b.created_at,
        b.updated_at,
        COALESCE(u.first_name || ' ' || u.last_name, 'No Owner') as owner_name,
        u.email as owner_email,
        u.id as owner_id
      FROM businesses b
      LEFT JOIN users u ON b.owner_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (b.business_name ILIKE $${paramIndex} OR b.description ILIKE $${paramIndex})`;
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
      countQuery += ` AND (b.business_name ILIKE $${countParamIndex} OR b.description ILIKE $${countParamIndex})`;
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

// Get single business by ID
router.get('/businesses/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        b.id,
        b.business_name,
        b.business_type,
        b.description,
        b.cuisine_types,
        b.price_range,
        b.phone,
        b.email,
        b.website AS website_url,
        b.address,
        b.formatted_address,
        b.city,
        b.state,
        b.country,
        b.postal_code,
        b.latitude,
        b.longitude,
        b.logo_url,
        b.cover_image_url,
        b.average_rating,
        b.total_reviews,
        b.total_bookings,
        b.status,
        b.account_status,
        b.is_featured,
        b.is_verified,
        b.sustainability_ethos,
        b.opens_at,
        b.closes_at,
        b.facilities,
        b.created_at,
        b.updated_at,
        COALESCE(u.first_name || ' ' || u.last_name, 'No Owner') as owner_name,
        u.email as owner_email,
        u.id as owner_id,
        u.phone as owner_phone
      FROM businesses b
      LEFT JOIN users u ON b.owner_id = u.id
      WHERE b.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json({ business: result.rows[0] });
  } catch (error) {
    console.error('Error fetching business:', error);
    res.status(500).json({ error: 'Failed to fetch business', details: error.message });
  }
});

// Verify a business
router.patch('/businesses/:id/verify', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE businesses
      SET is_verified = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, business_name, is_verified
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json({
      message: 'Business verified successfully',
      business: result.rows[0]
    });
  } catch (error) {
    console.error('Error verifying business:', error);
    res.status(500).json({ error: 'Failed to verify business', details: error.message });
  }
});

// Suspend a business
router.patch('/businesses/:id/suspend', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(`
      UPDATE businesses
      SET status = 'suspended', account_status = 'suspended', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, business_name, status, account_status
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Optionally log the suspension reason
    if (reason) {
      console.log(`Business ${id} suspended. Reason: ${reason}`);
    }

    res.json({
      message: 'Business suspended successfully',
      business: result.rows[0],
      reason: reason || null
    });
  } catch (error) {
    console.error('Error suspending business:', error);
    res.status(500).json({ error: 'Failed to suspend business', details: error.message });
  }
});

// Activate a business
router.patch('/businesses/:id/activate', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE businesses
      SET status = 'active', account_status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, business_name, status, account_status
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json({
      message: 'Business activated successfully',
      business: result.rows[0]
    });
  } catch (error) {
    console.error('Error activating business:', error);
    res.status(500).json({ error: 'Failed to activate business', details: error.message });
  }
});

// Feature/Unfeature a business
router.patch('/businesses/:id/feature', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { featured } = req.body;

    const result = await pool.query(`
      UPDATE businesses
      SET is_featured = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, business_name, is_featured
    `, [id, featured !== false]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json({
      message: result.rows[0].is_featured ? 'Business featured successfully' : 'Business unfeatured successfully',
      business: result.rows[0]
    });
  } catch (error) {
    console.error('Error featuring business:', error);
    res.status(500).json({ error: 'Failed to update business feature status', details: error.message });
  }
});

// Delete a business
router.delete('/businesses/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // First check if business exists
    const checkResult = await pool.query('SELECT id, business_name FROM businesses WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessName = checkResult.rows[0].business_name;

    // Delete related records first (cascade should handle most, but let's be explicit)
    // Delete bookings associated with this business
    await pool.query('DELETE FROM bookings WHERE business_id = $1', [id]);

    // Delete business locations
    await pool.query('DELETE FROM business_locations WHERE business_id = $1', [id]);

    // Delete business subscriptions
    await pool.query('DELETE FROM business_subscriptions WHERE business_id = $1', [id]);

    // Delete the business
    await pool.query('DELETE FROM businesses WHERE id = $1', [id]);

    res.json({
      message: 'Business deleted successfully',
      deletedBusiness: { id, business_name: businessName }
    });
  } catch (error) {
    console.error('Error deleting business:', error);
    res.status(500).json({ error: 'Failed to delete business', details: error.message });
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

// ===================================
// ANALYTICS - COMPREHENSIVE PLATFORM ANALYTICS
// ===================================
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    // Get comprehensive platform statistics with revenue breakdown
    const stats = await pool.query(`
      WITH revenue_breakdown AS (
        SELECT
          -- Subscription revenue (monthly recurring)
          COALESCE(SUM(monthly_price), 0) as subscription_revenue,
          -- Commission revenue ($5 per completed booking)
          COALESCE((SELECT COUNT(*) FROM bookings WHERE status = 'completed') * 5.00, 0) as commission_revenue,
          -- Ad revenue (hardcoded to 0 for now - will be implemented when ad system is ready)
          0 as ad_revenue
        FROM business_subscriptions
        WHERE status = 'active'
      )
      SELECT
        -- User metrics
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(DISTINCT ur.user_id) FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.slug = 'business_owner') as business_owners,
        (SELECT COUNT(DISTINCT ur.user_id) FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.slug = 'food_enthusiast') as food_enthusiasts,
        (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_30d,
        (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_users_7d,

        -- Business metrics
        (SELECT COUNT(*) FROM businesses) as total_businesses,
        (SELECT COUNT(*) FROM businesses WHERE status = 'active') as active_businesses,
        (SELECT COUNT(*) FROM businesses WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_businesses_30d,

        -- Subscription metrics
        (SELECT COUNT(*) FROM business_subscriptions WHERE status = 'active') as active_subscriptions,
        (SELECT COUNT(*) FROM business_subscriptions WHERE status = 'cancelled') as cancelled_subscriptions,

        -- Booking metrics
        (SELECT COUNT(*) FROM bookings) as total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as confirmed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'completed') as completed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'cancelled') as cancelled_bookings,
        (SELECT COUNT(*) FROM bookings WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_bookings_30d,
        (SELECT COUNT(*) FROM bookings WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_bookings_7d,
        (SELECT COALESCE(AVG(party_size), 0) FROM bookings) as avg_party_size,

        -- Revenue metrics
        rb.subscription_revenue,
        rb.commission_revenue,
        rb.ad_revenue,
        (rb.subscription_revenue + rb.commission_revenue + rb.ad_revenue) as total_revenue,

        -- 30-day revenue
        (
          SELECT COALESCE(SUM(monthly_price), 0)
          FROM business_subscriptions
          WHERE status = 'active' AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        ) as subscription_revenue_30d,
        (SELECT COUNT(*) FROM bookings WHERE status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '30 days') * 5.00 as commission_revenue_30d,
        0 as ad_revenue_30d
      FROM revenue_breakdown rb
    `);

    // Get user growth (last 12 months)
    const userGrowth = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', u.created_at), 'YYYY-MM') as month,
        TO_CHAR(DATE_TRUNC('month', u.created_at), 'Mon YYYY') as month_label,
        COUNT(DISTINCT u.id) as users,
        COUNT(DISTINCT u.id) FILTER (WHERE r.slug = 'business_owner') as business_owners,
        COUNT(DISTINCT u.id) FILTER (WHERE r.slug = 'food_enthusiast') as food_enthusiasts
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', u.created_at)
      ORDER BY DATE_TRUNC('month', u.created_at) ASC
    `);

    // Get revenue trends (last 12 months) - breakdown by source
    const revenueTrends = await pool.query(`
      WITH monthly_data AS (
        SELECT generate_series(
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months'),
          DATE_TRUNC('month', CURRENT_DATE),
          '1 month'::interval
        ) as month
      ),
      subscription_revenue AS (
        SELECT
          DATE_TRUNC('month', created_at) as month,
          SUM(monthly_price) as revenue
        FROM business_subscriptions
        WHERE status = 'active' AND created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
      ),
      commission_revenue AS (
        SELECT
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) * 5.00 as revenue
        FROM bookings
        WHERE status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
      )
      SELECT
        TO_CHAR(md.month, 'YYYY-MM') as month,
        TO_CHAR(md.month, 'Mon YYYY') as month_label,
        COALESCE(sr.revenue, 0) as subscription_revenue,
        COALESCE(cr.revenue, 0) as commission_revenue,
        0 as ad_revenue,
        COALESCE(sr.revenue, 0) + COALESCE(cr.revenue, 0) as total_revenue
      FROM monthly_data md
      LEFT JOIN subscription_revenue sr ON md.month = sr.month
      LEFT JOIN commission_revenue cr ON md.month = cr.month
      ORDER BY md.month ASC
    `);

    // Get booking trends (last 12 months)
    const bookingTrends = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month_label,
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
      FROM bookings
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `);

    // Get subscription plan distribution
    const subscriptionPlans = await pool.query(`
      SELECT
        plan as plan_type,
        plan::text as name,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COALESCE(SUM(monthly_price) FILTER (WHERE status = 'active'), 0) as total_revenue
      FROM business_subscriptions
      GROUP BY plan
      ORDER BY
        CASE plan
          WHEN 'free' THEN 1
          WHEN 'starter' THEN 2
          WHEN 'professional' THEN 3
          WHEN 'enterprise' THEN 4
        END
    `);

    // Get booking status distribution
    const bookingStatus = await pool.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM bookings
      GROUP BY status
      ORDER BY count DESC
    `);

    // Get top performing businesses (by bookings)
    const topBusinesses = await pool.query(`
      SELECT
        b.id,
        b.name,
        bl.city,
        COUNT(bk.id) as total_bookings,
        COUNT(bk.id) FILTER (WHERE bk.status = 'completed') as completed_bookings,
        COUNT(bk.id) FILTER (WHERE bk.status = 'completed') * 5.00 as commission_earned,
        COALESCE(b.average_rating, 0) as avg_rating
      FROM businesses b
      LEFT JOIN business_locations bl ON b.id = bl.business_id AND bl.is_primary = true
      LEFT JOIN bookings bk ON b.id = bk.business_id
      GROUP BY b.id, b.name, bl.city, b.average_rating
      HAVING COUNT(bk.id) > 0
      ORDER BY total_bookings DESC
      LIMIT 10
    `);

    // Get user role distribution
    const userRoles = await pool.query(`
      SELECT
        role,
        COUNT(*) as count
      FROM users
      GROUP BY role
      ORDER BY count DESC
    `);

    // Get business status distribution
    const businessStatus = await pool.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM businesses
      GROUP BY status
      ORDER BY count DESC
    `);

    // Calculate conversion metrics
    const conversionMetrics = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'business_owner') as total_business_owners,
        (SELECT COUNT(DISTINCT owner_id) FROM businesses) as owners_with_businesses,
        (SELECT COUNT(*) FROM businesses) as total_businesses,
        (SELECT COUNT(*) FROM businesses WHERE status = 'active') as active_businesses,
        (SELECT COUNT(*) FROM business_subscriptions WHERE status = 'active') as active_subscriptions,
        (SELECT COUNT(*) FROM bookings) as total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed' OR status = 'completed') as successful_bookings
    `);

    // Get top countries by user count
    const topCountries = await pool.query(`
      SELECT
        COALESCE(bl.country, 'Unknown') as country,
        COUNT(DISTINCT b.owner_id) as user_count
      FROM business_locations bl
      INNER JOIN businesses b ON bl.business_id = b.id
      WHERE bl.country IS NOT NULL AND bl.country != ''
      GROUP BY bl.country
      ORDER BY user_count DESC
      LIMIT 10
    `);

    // Get business types distribution (by cuisine type)
    const businessTypes = await pool.query(`
      SELECT
        UNNEST(cuisine_types)::text as business_type,
        COUNT(*) as count
      FROM businesses
      WHERE cuisine_types IS NOT NULL AND array_length(cuisine_types, 1) > 0
      GROUP BY UNNEST(cuisine_types)
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get revenue data for charts (same as revenueTrends but formatted for frontend)
    const revenueData = revenueTrends.rows.map(row => ({
      month: row.month_label,
      revenue: parseFloat(row.total_revenue) || 0
    }));

    res.json({
      statistics: {
        ...stats.rows[0],
        // Add conversion rates
        business_owner_conversion: stats.rows[0].total_businesses > 0
          ? (stats.rows[0].total_businesses / stats.rows[0].business_owners * 100).toFixed(2)
          : 0,
        booking_conversion: stats.rows[0].total_bookings > 0
          ? (stats.rows[0].completed_bookings / stats.rows[0].total_bookings * 100).toFixed(2)
          : 0,
        subscription_rate: stats.rows[0].total_businesses > 0
          ? (stats.rows[0].active_subscriptions / stats.rows[0].total_businesses * 100).toFixed(2)
          : 0
      },
      userGrowth: userGrowth.rows,
      revenueData: revenueData,
      revenueTrends: revenueTrends.rows,
      bookingTrends: bookingTrends.rows,
      subscriptionPlans: subscriptionPlans.rows,
      bookingStatus: bookingStatus.rows,
      topBusinesses: topBusinesses.rows,
      topCountries: topCountries.rows,
      businessTypes: businessTypes.rows,
      userRoles: userRoles.rows,
      businessStatus: businessStatus.rows,
      conversionMetrics: conversionMetrics.rows[0]
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
  }
});

// ===================================
// GEOGRAPHICAL DISTRIBUTION
// ===================================
router.get('/geographical-distribution', requireAdmin, async (req, res) => {
  try {
    // Query business locations with aggregated data
    const distribution = await pool.query(`
      SELECT
        bl.city,
        bl.state,
        bl.country,
        bl.latitude,
        bl.longitude,
        COUNT(DISTINCT bl.business_id) as business_count,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT bk.id) as booking_count,
        COALESCE(SUM(CASE WHEN bk.status = 'completed' THEN 5.00 ELSE 0 END), 0) as revenue
      FROM business_locations bl
      LEFT JOIN businesses b ON bl.business_id = b.id
      LEFT JOIN users u ON b.owner_id = u.id
      LEFT JOIN bookings bk ON b.id = bk.business_id
      WHERE bl.latitude IS NOT NULL
        AND bl.longitude IS NOT NULL
        AND bl.city IS NOT NULL
      GROUP BY bl.city, bl.state, bl.country, bl.latitude, bl.longitude
      ORDER BY business_count DESC, booking_count DESC
    `);

    // Transform data for frontend
    const locations = distribution.rows.map((row, index) => ({
      id: `loc-${index + 1}`,
      name: row.city,
      state: row.state,
      country: row.country,
      latitude: parseFloat(row.latitude) || 0,
      longitude: parseFloat(row.longitude) || 0,
      businesses: parseInt(row.business_count) || 0,
      users: parseInt(row.user_count) || 0,
      bookings: parseInt(row.booking_count) || 0,
      revenue: parseFloat(row.revenue) || 0
    }));

    // Get regional aggregation
    const regionalStats = await pool.query(`
      SELECT
        bl.state as region_name,
        COUNT(DISTINCT bl.business_id) as business_count,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT bk.id) as booking_count,
        COALESCE(SUM(CASE WHEN bk.status = 'completed' THEN 5.00 ELSE 0 END), 0) as revenue
      FROM business_locations bl
      LEFT JOIN businesses b ON bl.business_id = b.id
      LEFT JOIN users u ON b.owner_id = u.id
      LEFT JOIN bookings bk ON b.id = bk.business_id
      WHERE bl.state IS NOT NULL
      GROUP BY bl.state
      ORDER BY business_count DESC
      LIMIT 10
    `);

    const regions = regionalStats.rows.map((row, index) => ({
      id: `region-${index + 1}`,
      name: row.region_name,
      businesses: parseInt(row.business_count) || 0,
      users: parseInt(row.user_count) || 0,
      bookings: parseInt(row.booking_count) || 0,
      revenue: parseFloat(row.revenue) || 0
    }));

    res.json({
      locations,
      regions
    });

  } catch (error) {
    console.error('Error fetching geographical distribution:', error);
    res.status(500).json({
      error: 'Failed to fetch geographical distribution',
      details: error.message
    });
  }
});

// ===================================
// AI-POWERED ANALYTICS
// ===================================
router.get('/analytics/ai-insights', requireAdmin, async (req, res) => {
  try {
    // First, get the regular analytics data
    const analyticsResponse = await fetch('http://localhost:3001/api/admin/analytics');
    const analyticsData = await analyticsResponse.json();

    // Generate AI insights
    const [insights, forecast, anomalies] = await Promise.all([
      analyticsAIService.generateInsights(analyticsData),
      analyticsAIService.generateRevenueForecast(analyticsData.revenueTrends),
      analyticsAIService.detectAnomalies(analyticsData)
    ]);

    res.json({
      insights: insights.insights || [],
      forecast: forecast.forecast || [],
      forecastTrend: forecast.trend || 'stable',
      forecastGrowthRate: forecast.growth_rate || 0,
      anomalies: anomalies.anomalies || [],
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating AI insights:', error);
    res.status(500).json({
      error: 'Failed to generate AI insights',
      details: error.message
    });
  }
});

module.exports = router;
