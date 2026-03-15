const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================
// POST /api/pokes/send
// Send a poke/nudge to a user
// ============================================
router.post('/send', async (req, res) => {
  try {
    const pokerId = req.user.userId;
    const tenantId = req.user.tenantId;
    const { pokedId, message } = req.body;

    if (!pokedId) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }

    if (pokerId === pokedId) {
      return res.status(400).json({ error: 'Cannot poke yourself' });
    }

    // Check if users are connected (following each other)
    const connectionCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM followers
      WHERE tenant_id = $1
        AND (
          (follower_id = $2 AND following_id = $3) OR
          (follower_id = $3 AND following_id = $2)
        )
    `, [tenantId, pokerId, pokedId]);

    if (parseInt(connectionCheck.rows[0].count) === 0) {
      return res.status(403).json({ error: 'You can only poke users you follow or who follow you' });
    }

    // Create poke
    const result = await pool.query(`
      INSERT INTO pokes (tenant_id, poker_id, poked_id, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [tenantId, pokerId, pokedId, message || null]);

    // Get poker info
    const pokerInfo = await pool.query(`
      SELECT first_name, last_name, avatar_url
      FROM users
      WHERE id = $1
    `, [pokerId]);

    res.json({
      message: 'Poke sent successfully',
      poke: {
        ...result.rows[0],
        poker_first_name: pokerInfo.rows[0].first_name,
        poker_last_name: pokerInfo.rows[0].last_name,
        poker_avatar_url: pokerInfo.rows[0].avatar_url
      }
    });

  } catch (error) {
    console.error('Error sending poke:', error);
    res.status(500).json({ error: 'Failed to send poke' });
  }
});

// ============================================
// GET /api/pokes/received
// Get pokes received by the current user
// ============================================
router.get('/received', async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const unreadOnly = req.query.unread === 'true';

    let query = `
      SELECT 
        p.*,
        u.first_name as poker_first_name,
        u.last_name as poker_last_name,
        u.avatar_url as poker_avatar_url,
        u.role as poker_role
      FROM pokes p
      JOIN users u ON p.poker_id = u.id
      WHERE p.tenant_id = $1 AND p.poked_id = $2
    `;

    if (unreadOnly) {
      query += ' AND p.is_read = false';
    }

    query += ' ORDER BY p.created_at DESC LIMIT 50';

    const result = await pool.query(query, [tenantId, userId]);

    res.json({
      pokes: result.rows,
      unread_count: result.rows.filter(p => !p.is_read).length
    });

  } catch (error) {
    console.error('Error fetching pokes:', error);
    res.status(500).json({ error: 'Failed to fetch pokes' });
  }
});

// ============================================
// PUT /api/pokes/:pokeId/read
// Mark a poke as read
// ============================================
router.put('/:pokeId/read', async (req, res) => {
  try {
    const { pokeId } = req.params;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    const result = await pool.query(`
      UPDATE pokes
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2 AND poked_id = $3
      RETURNING *
    `, [pokeId, tenantId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Poke not found' });
    }

    res.json({
      message: 'Poke marked as read',
      poke: result.rows[0]
    });

  } catch (error) {
    console.error('Error marking poke as read:', error);
    res.status(500).json({ error: 'Failed to mark poke as read' });
  }
});

// ============================================
// GET /api/pokes/unread-count
// Get count of unread pokes
// ============================================
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM pokes
      WHERE tenant_id = $1 AND poked_id = $2 AND is_read = false
    `, [tenantId, userId]);

    res.json({ unread_count: parseInt(result.rows[0].count) });

  } catch (error) {
    console.error('Error fetching unread poke count:', error);
    res.status(500).json({ error: 'Failed to fetch unread poke count' });
  }
});

module.exports = router;

