const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// ===================================
// USER NOTIFICATIONS (FEED)
// ===================================

// System-wide notifications for non-authenticated users
const systemNotifications = [
  {
    id: 'sys-1',
    user_id: null,
    type: 'info',
    title: '🎉 New Feature: Advanced Search',
    message: 'Search across restaurants, dishes, and reviews with our enhanced search feature!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: false,
    action_url: null,
    icon: '🔍'
  },
  {
    id: 'sys-2',
    user_id: null,
    type: 'info',
    title: '📱 Mobile App Coming Soon',
    message: 'Download our mobile app for iOS and Android. Launching next month!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: false,
    action_url: null,
    icon: '📱'
  },
  {
    id: 'sys-3',
    user_id: null,
    type: 'success',
    title: '✨ Platform Update',
    message: 'We\'ve improved performance and added new features. Check out what\'s new!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    read: false,
    action_url: '/about',
    icon: '🚀'
  },
  {
    id: 'sys-4',
    user_id: null,
    type: 'info',
    title: '🎁 Special Promotion',
    message: 'Sign up today and get 20% off your first booking at participating restaurants!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 days ago
    read: false,
    action_url: '/auth/register',
    icon: '🎁'
  },
  {
    id: 'sys-5',
    user_id: null,
    type: 'info',
    title: '🔐 Login to See Your Notifications',
    message: 'Create an account or login to receive personalized notifications about your bookings, reviews, and more.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96), // 4 days ago
    read: false,
    action_url: '/auth/login',
    icon: '👤'
  }
];

/**
 * GET /api/notifications
 * Get notifications - user-specific if authenticated, system-wide if not
 * Public endpoint that adapts based on authentication status
 */
router.get('/', async (req, res) => {
  try {
    // Check if user is authenticated (token in Authorization header or cookie)
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

    if (token) {
      // User is authenticated - try to get user-specific notifications from database
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this-in-production');
        const userId = decoded.id;

        // Query user-specific notifications from database
        const result = await pool.query(`
          SELECT
            id,
            type,
            title,
            message,
            created_at as timestamp,
            is_read as read,
            data->>'action_url' as action_url,
            CASE
              WHEN type = 'booking' THEN '📅'
              WHEN type = 'review' THEN '⭐'
              WHEN type = 'message' THEN '💬'
              WHEN type = 'success' THEN '✅'
              WHEN type = 'warning' THEN '⚠️'
              WHEN type = 'error' THEN '❌'
              ELSE 'ℹ️'
            END as icon
          FROM notifications
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 20
        `, [userId]);

        if (result.rows.length > 0) {
          return res.json(result.rows);
        }

        // If no notifications in database, return empty array with a welcome message
        return res.json([
          {
            id: 'welcome-1',
            type: 'info',
            title: '👋 Welcome to Itiyum!',
            message: 'You\'ll see your personalized notifications here - bookings, reviews, messages, and more.',
            timestamp: new Date(),
            read: false,
            action_url: null,
            icon: '🎉'
          }
        ]);

      } catch (jwtError) {
        console.error('JWT verification failed:', jwtError);
        // Token invalid, fall through to system notifications
      }
    }

    // User is NOT authenticated - return system-wide notifications
    res.json(systemNotifications);

  } catch (error) {
    console.error('Error fetching notifications:', error);
    // Fallback to system notifications on error
    res.json(systemNotifications);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read
 */
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

    if (!token) {
      // For system notifications (non-authenticated), just return success
      return res.json({ success: true });
    }

    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this-in-production');
      const userId = decoded.id;

      // Update notification in database
      await pool.query(`
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE id = $1 AND user_id = $2
      `, [id, userId]);

      res.json({ success: true });
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      res.json({ success: true }); // Return success anyway for UX
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for current user
 */
router.patch('/read-all', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

    if (!token) {
      // For system notifications (non-authenticated), just return success
      return res.json({ success: true });
    }

    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this-in-production');
      const userId = decoded.id;

      // Mark all notifications as read in database
      await pool.query(`
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE user_id = $1 AND is_read = false
      `, [userId]);

      res.json({ success: true });
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      res.json({ success: true }); // Return success anyway for UX
    }
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a specific notification
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

    if (!token) {
      // For system notifications (non-authenticated), just return success
      return res.json({ success: true });
    }

    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this-in-production');
      const userId = decoded.id;

      // Delete notification from database
      await pool.query(`
        DELETE FROM notifications
        WHERE id = $1 AND user_id = $2
      `, [id, userId]);

      res.json({ success: true });
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      res.json({ success: true }); // Return success anyway for UX
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// ===================================
// NOTIFICATION SETTINGS
// Apply authentication to settings routes only
// ===================================

/**
 * GET /api/notifications/settings
 * Get notification settings for current user
 * Requires authentication
 */
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      SELECT
        email_messages,
        email_updates,
        email_customer_alerts,
        email_marketing,
        email_system,
        email_frequency,
        push_messages,
        push_updates,
        push_customer_alerts,
        push_bookings,
        push_reviews,
        sms_enabled,
        sms_bookings,
        sms_urgent_only,
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end,
        timezone
      FROM notification_settings
      WHERE user_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (result.rows.length === 0) {
      // Create default settings if they don't exist
      const defaultSettings = await pool.query(`
        INSERT INTO notification_settings (tenant_id, user_id)
        VALUES ($1, $2)
        RETURNING
          email_messages,
          email_updates,
          email_customer_alerts,
          email_marketing,
          email_system,
          email_frequency,
          push_messages,
          push_updates,
          push_customer_alerts,
          push_bookings,
          push_reviews,
          sms_enabled,
          sms_bookings,
          sms_urgent_only,
          quiet_hours_enabled,
          quiet_hours_start,
          quiet_hours_end,
          timezone
      `, [tenantId, userId]);

      return res.json({ settings: defaultSettings.rows[0] });
    }

    res.json({ settings: result.rows[0] });

  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

/**
 * PUT /api/notifications/settings
 * Update notification settings for current user
 * Requires authentication
 */
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const {
      email_messages,
      email_updates,
      email_customer_alerts,
      email_marketing,
      email_system,
      email_frequency,
      push_messages,
      push_updates,
      push_customer_alerts,
      push_bookings,
      push_reviews,
      sms_enabled,
      sms_bookings,
      sms_urgent_only,
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end,
      timezone
    } = req.body;

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [userId, tenantId];
    let paramCount = 2;

    const fields = {
      email_messages,
      email_updates,
      email_customer_alerts,
      email_marketing,
      email_system,
      email_frequency,
      push_messages,
      push_updates,
      push_customer_alerts,
      push_bookings,
      push_reviews,
      sms_enabled,
      sms_bookings,
      sms_urgent_only,
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end,
      timezone
    };

    Object.keys(fields).forEach(key => {
      if (fields[key] !== undefined) {
        paramCount++;
        updates.push(`${key} = $${paramCount}`);
        values.push(fields[key]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);

    const query = `
      UPDATE notification_settings
      SET ${updates.join(', ')}
      WHERE user_id = $1 AND tenant_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification settings not found' });
    }

    res.json({
      message: 'Notification settings updated successfully',
      settings: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// ===================================
// ACTIVITY LOG
// ===================================

/**
 * GET /api/notifications/activity-log
 * Get activity log for current user
 */
router.get('/activity-log', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { page = 1, limit = 20, action, entity_type } = req.query;
    const offset = (page - 1) * limit;

    // Build query
    let query = `
      SELECT
        id,
        action,
        entity_type,
        entity_id,
        details,
        ip_address,
        user_agent,
        device_type,
        browser,
        os,
        country,
        city,
        status,
        created_at
      FROM activity_log
      WHERE user_id = $1 AND tenant_id = $2
    `;

    const params = [userId, tenantId];

    if (action) {
      query += ` AND action = $${params.length + 1}`;
      params.push(action);
    }

    if (entity_type) {
      query += ` AND entity_type = $${params.length + 1}`;
      params.push(entity_type);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM activity_log
      WHERE user_id = $1 AND tenant_id = $2
    `;
    const countParams = [userId, tenantId];

    if (action) {
      countQuery += ` AND action = $3`;
      countParams.push(action);
    }

    if (entity_type) {
      countQuery += ` AND entity_type = $${countParams.length + 1}`;
      countParams.push(entity_type);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      activities: result.rows,
      total: totalCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: result.rows.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

/**
 * POST /api/notifications/activity-log
 * Log a new activity (internal use)
 */
router.post('/activity-log', async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const {
      action,
      entity_type,
      entity_id,
      details,
      status = 'success'
    } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    // Extract request metadata
    const ip_address = req.ip || req.connection.remoteAddress;
    const user_agent = req.headers['user-agent'];

    const result = await pool.query(`
      INSERT INTO activity_log (
        tenant_id,
        user_id,
        action,
        entity_type,
        entity_id,
        details,
        ip_address,
        user_agent,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [tenantId, userId, action, entity_type, entity_id, details, ip_address, user_agent, status]);

    res.json({
      message: 'Activity logged successfully',
      activity: result.rows[0]
    });

  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

module.exports = router;

