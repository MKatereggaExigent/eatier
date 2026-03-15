const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================
// POST /api/presence/update
// Update user's presence status
// ============================================
router.post('/update', async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const { status, deviceInfo } = req.body;

    // Validate status
    const validStatuses = ['online', 'away', 'offline', 'busy'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Upsert presence
    const result = await pool.query(`
      INSERT INTO user_presence (tenant_id, user_id, status, last_seen, last_activity, device_info)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $4)
      ON CONFLICT (tenant_id, user_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        last_seen = CURRENT_TIMESTAMP,
        last_activity = CURRENT_TIMESTAMP,
        device_info = EXCLUDED.device_info,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [tenantId, userId, status || 'online', JSON.stringify(deviceInfo || {})]);

    res.json({
      message: 'Presence updated',
      presence: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating presence:', error);
    res.status(500).json({ error: 'Failed to update presence' });
  }
});

// ============================================
// POST /api/presence/heartbeat
// Keep-alive heartbeat
// ============================================
router.post('/heartbeat', async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    await pool.query(`
      UPDATE user_presence
      SET last_activity = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND user_id = $2
    `, [tenantId, userId]);

    res.json({ message: 'Heartbeat received' });

  } catch (error) {
    console.error('Error processing heartbeat:', error);
    res.status(500).json({ error: 'Failed to process heartbeat' });
  }
});

// ============================================
// GET /api/presence/online
// Get list of online users
// ============================================
router.get('/online', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    // Get online users from followers/following
    const result = await pool.query(`
      SELECT DISTINCT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url,
        u.role,
        up.status,
        up.last_seen,
        up.last_activity,
        CASE
          WHEN f1.follower_id IS NOT NULL THEN true
          ELSE false
        END as is_following,
        CASE
          WHEN f2.following_id IS NOT NULL THEN true
          ELSE false
        END as is_follower
      FROM users u
      JOIN user_presence up ON u.id = up.user_id AND up.tenant_id = $1
      LEFT JOIN user_follows f1 ON f1.following_id = u.id AND f1.follower_id = $2 AND f1.tenant_id = $1
      LEFT JOIN user_follows f2 ON f2.follower_id = u.id AND f2.following_id = $2 AND f2.tenant_id = $1
      WHERE up.tenant_id = $1
        AND up.status IN ('online', 'away', 'busy')
        AND up.last_activity > (CURRENT_TIMESTAMP - INTERVAL '5 minutes')
        AND u.id != $2
        AND (f1.follower_id IS NOT NULL OR f2.following_id IS NOT NULL)
      ORDER BY up.last_activity DESC
      LIMIT 100
    `, [tenantId, userId]);

    res.json({
      online_users: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
});

// ============================================
// GET /api/presence/status/:userId
// Get specific user's presence status
// ============================================
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const tenantId = req.user.tenantId;

    const result = await pool.query(`
      SELECT status, last_seen, last_activity
      FROM user_presence
      WHERE tenant_id = $1 AND user_id = $2
    `, [tenantId, userId]);

    if (result.rows.length === 0) {
      return res.json({ status: 'offline', last_seen: null });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching user status:', error);
    res.status(500).json({ error: 'Failed to fetch user status' });
  }
});

module.exports = router;

