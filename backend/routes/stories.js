const express = require('express');
const pool = require('../config/database');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// POST /api/stories - Create a story (expires in 24h)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { mediaUrl, mediaType, caption } = req.body;

    if (!mediaUrl) {
      return res.status(400).json({ error: 'Media URL is required' });
    }

    if (!mediaType || !['image', 'video'].includes(mediaType)) {
      return res.status(400).json({ error: 'Media type must be image or video' });
    }

    // Set expires_at to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const result = await pool.query(`
      INSERT INTO stories (user_id, tenant_id, media_url, media_type, caption, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, tenantId, mediaUrl, mediaType, caption || null, expiresAt]);

    // Record activity
    await pool.query(`
      INSERT INTO user_activity_feed (user_id, tenant_id, activity_type, reference_type, reference_id, metadata, is_public)
      VALUES ($1, $2, 'story', 'story', $3, $4, true)
    `, [userId, tenantId, result.rows[0].id, JSON.stringify({ mediaType })]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({ error: 'Failed to create story' });
  }
});

// GET /api/stories/feed - Get active stories from followed users
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      SELECT s.*, u.id as user_id, u.first_name, u.last_name, u.avatar_url,
        COALESCE(v.view_count, 0) as view_count,
        CASE WHEN sv.viewer_id IS NOT NULL THEN true ELSE false END as viewed
      FROM stories s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN (SELECT story_id, COUNT(*) as view_count FROM story_views GROUP BY story_id) v ON v.story_id = s.id
      LEFT JOIN story_views sv ON sv.story_id = s.id AND sv.viewer_id = $1
      WHERE s.tenant_id = $2
        AND s.is_active = true
        AND s.expires_at > NOW()
        AND (s.user_id IN (SELECT following_id FROM user_follows WHERE follower_id = $3) OR s.user_id = $4)
      ORDER BY s.created_at DESC
    `, [userId, tenantId, userId, userId]);

    // Group stories by user
    const storiesByUser = {};
    for (const story of result.rows) {
      const userIdKey = story.user_id;
      if (!storiesByUser[userIdKey]) {
        storiesByUser[userIdKey] = {
          user: {
            id: story.user_id,
            firstName: story.first_name,
            lastName: story.last_name,
            avatar: story.avatar_url
          },
          stories: []
        };
      }
      storiesByUser[userIdKey].stories.push({
        id: story.id,
        mediaUrl: story.media_url,
        mediaType: story.media_type,
        caption: story.caption,
        expiresAt: story.expires_at,
        viewed: story.viewed,
        viewCount: parseInt(story.view_count) || 0,
        createdAt: story.created_at
      });
    }

    res.json({ users: Object.values(storiesByUser) });
  } catch (error) {
    console.error('Error fetching story feed:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// GET /api/stories/user/:userId - Get active stories for a specific user
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { userId } = req.params;

    const result = await pool.query(`
      SELECT s.*, u.id as user_id, u.first_name, u.last_name, u.avatar_url,
        COALESCE(v.view_count, 0) as view_count,
        CASE WHEN sv.viewer_id IS NOT NULL THEN true ELSE false END as viewed
      FROM stories s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN (SELECT story_id, COUNT(*) as view_count FROM story_views GROUP BY story_id) v ON v.story_id = s.id
      LEFT JOIN story_views sv ON sv.story_id = s.id AND sv.viewer_id = $1
      WHERE s.user_id = $2
        AND s.is_active = true
        AND s.expires_at > NOW()
      ORDER BY s.created_at DESC
    `, [currentUserId, userId]);

    res.json({ stories: result.rows });
  } catch (error) {
    console.error('Error fetching user stories:', error);
    res.status(500).json({ error: 'Failed to fetch user stories' });
  }
});

// POST /api/stories/:storyId/view - Mark story as viewed
router.post('/:storyId/view', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { storyId } = req.params;

    await pool.query(`
      INSERT INTO story_views (story_id, viewer_id)
      VALUES ($1, $2)
      ON CONFLICT (story_id, viewer_id) DO NOTHING
    `, [storyId, userId]);

    res.json({ message: 'Story marked as viewed' });
  } catch (error) {
    console.error('Error marking story as viewed:', error);
    res.status(500).json({ error: 'Failed to mark story as viewed' });
  }
});

// GET /api/stories/:storyId/views - Get viewers of a story
router.get('/:storyId/views', authenticateToken, async (req, res) => {
  try {
    const { storyId } = req.params;

    const result = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.avatar_url, sv.viewed_at
      FROM story_views sv
      JOIN users u ON sv.viewer_id = u.id
      WHERE sv.story_id = $1
      ORDER BY sv.viewed_at DESC
    `, [storyId]);

    res.json({ views: result.rows });
  } catch (error) {
    console.error('Error fetching story views:', error);
    res.status(500).json({ error: 'Failed to fetch story views' });
  }
});

// DELETE /api/stories/:storyId - Delete own story
router.delete('/:storyId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { storyId } = req.params;

    const result = await pool.query(
      'UPDATE stories SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING id',
      [storyId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found or not yours' });
    }

    res.json({ message: 'Story deleted' });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

module.exports = router;
