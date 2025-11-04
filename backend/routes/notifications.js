const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ===================================
// USER NOTIFICATIONS (FEED)
// ===================================

// Mock notifications for demo
const mockNotifications = [
  {
    id: '1',
    user_id: null,
    type: 'booking',
    title: 'Booking Confirmed',
    message: 'Your table reservation at The Savory Kitchen has been confirmed for tomorrow at 7:00 PM.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    read: false,
    action_url: '/dashboard/bookings',
    icon: '📅'
  },
  {
    id: '2',
    user_id: null,
    type: 'review',
    title: 'New Review',
    message: 'Someone left a 5-star review for your restaurant!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
    action_url: '/dashboard/reviews',
    icon: '⭐'
  },
  {
    id: '3',
    user_id: null,
    type: 'success',
    title: 'Payment Successful',
    message: 'Your payment of $45.00 has been processed successfully.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    read: true,
    icon: '✅'
  },
  {
    id: '4',
    user_id: null,
    type: 'info',
    title: 'Profile Update',
    message: 'Your profile has been successfully updated.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: true,
    icon: 'ℹ️'
  },
  {
    id: '5',
    user_id: null,
    type: 'message',
    title: 'New Message',
    message: 'You have a new message from Urban Brew Cafe.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    read: true,
    action_url: '/messages',
    icon: '💬'
  }
];

/**
 * GET /api/notifications
 * Get all notifications for the current user
 */
router.get('/', async (req, res) => {
  try {
    // Return mock notifications for now
    // TODO: Replace with actual database query when notifications table is created
    res.json(mockNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read
 */
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    // Update mock notification
    const notification = mockNotifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
    }

    res.json({ success: true });
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
    mockNotifications.forEach(n => {
      n.read = true;
    });

    res.json({ success: true });
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

    const index = mockNotifications.findIndex(n => n.id === id);
    if (index > -1) {
      mockNotifications.splice(index, 1);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// ===================================
// NOTIFICATION SETTINGS
// ===================================

/**
 * GET /api/notifications/settings
 * Get notification settings for current user
 */
router.get('/settings', async (req, res) => {
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
 */
router.put('/settings', async (req, res) => {
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

