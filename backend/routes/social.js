const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// ============================================================================
// POST /api/social/follow/:userId - Follow a user
// ============================================================================
router.post('/follow/:userId', authenticateToken, async (req, res) => {
  try {
    const followerId = req.user.userId;
    const followingId = req.params.userId;
    const tenantId = req.user.tenant_id;

    if (followerId === followingId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    // Check if user exists
    const userCheck = await pool.query(
      `SELECT id FROM users WHERE id = $1`,
      [followingId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create follow relationship
    await pool.query(
      `INSERT INTO user_follows (follower_id, following_id, tenant_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (follower_id, following_id) DO NOTHING`,
      [followerId, followingId, tenantId]
    );

    // Record activity
    await pool.query(
      `INSERT INTO user_activity_feed (user_id, tenant_id, activity_type, reference_type, reference_id)
       VALUES ($1, $2, 'follow', 'user', $3)`,
      [followerId, tenantId, followingId]
    );

    res.json({ message: 'Successfully followed user' });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// ============================================================================
// DELETE /api/social/follow/:userId - Unfollow a user
// ============================================================================
router.delete('/follow/:userId', authenticateToken, async (req, res) => {
  try {
    const followerId = req.user.userId;
    const followingId = req.params.userId;

    await pool.query(
      `DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );

    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// ============================================================================
// GET /api/social/followers - Get user's followers
// ============================================================================
router.get('/followers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.avatar_url, u.role, uf.created_at as followed_at
       FROM user_follows uf
       JOIN users u ON uf.follower_id = u.id
       WHERE uf.following_id = $1
       ORDER BY uf.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM user_follows WHERE following_id = $1`,
      [userId]
    );

    res.json({
      followers: result.rows.map(f => ({
        id: f.id,
        user_id: f.id,
        first_name: f.first_name,
        last_name: f.last_name,
        email: f.email,
        profile_image_url: f.avatar_url,
        avatar_url: f.avatar_url,
        role: f.role,
        followed_at: f.followed_at
      })),
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// ============================================================================
// GET /api/social/following - Get users the current user follows
// ============================================================================
router.get('/following', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.avatar_url, u.role, uf.created_at as followed_at
       FROM user_follows uf
       JOIN users u ON uf.following_id = u.id
       WHERE uf.follower_id = $1
       ORDER BY uf.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM user_follows WHERE follower_id = $1`,
      [userId]
    );

    res.json({
      following: result.rows.map(f => ({
        id: f.id,
        user_id: f.id,
        first_name: f.first_name,
        last_name: f.last_name,
        email: f.email,
        profile_image_url: f.avatar_url,
        avatar_url: f.avatar_url,
        role: f.role,
        followed_at: f.followed_at
      })),
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

// ============================================================================
// GET /api/social/feed - Alias for activity-feed (for frontend compatibility)
// ============================================================================
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { limit = 20, offset = 0 } = req.query;

    // Get activity from users the current user follows
    const result = await pool.query(
      `SELECT uaf.*, u.first_name, u.last_name, u.avatar_url
       FROM user_activity_feed uaf
       JOIN users u ON uaf.user_id = u.id
       WHERE uaf.tenant_id = $1
         AND uaf.is_public = true
         AND (uaf.user_id IN (SELECT following_id FROM user_follows WHERE follower_id = $2) OR uaf.user_id = $2)
       ORDER BY uaf.created_at DESC
       LIMIT $3 OFFSET $4`,
      [tenantId, userId, parseInt(limit), parseInt(offset)]
    );

    res.json({
      activities: result.rows.map(a => ({
        id: a.id,
        actorName: `${a.first_name} ${a.last_name}`,
        activityType: a.activity_type,
        contentType: a.reference_type,
        contentPreview: a.metadata?.preview || '',
        businessName: a.metadata?.business_name || '',
        createdAt: a.created_at,
        user: {
          id: a.user_id,
          firstName: a.first_name,
          lastName: a.last_name,
          avatar: a.avatar_url
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// ============================================================================
// GET /api/social/activity-feed - Get activity feed from followed users
// ============================================================================
router.get('/activity-feed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { limit = 20, offset = 0 } = req.query;

    // Get activity from users the current user follows
    const result = await pool.query(
      `SELECT uaf.*, u.first_name, u.last_name, u.avatar_url
       FROM user_activity_feed uaf
       JOIN users u ON uaf.user_id = u.id
       WHERE uaf.tenant_id = $1
         AND uaf.is_public = true
         AND (uaf.user_id IN (SELECT following_id FROM user_follows WHERE follower_id = $2) OR uaf.user_id = $2)
       ORDER BY uaf.created_at DESC
       LIMIT $3 OFFSET $4`,
      [tenantId, userId, parseInt(limit), parseInt(offset)]
    );

    res.json({
      activities: result.rows.map(a => ({
        id: a.id,
        activityType: a.activity_type,
        referenceType: a.reference_type,
        referenceId: a.reference_id,
        metadata: a.metadata,
        user: {
          id: a.user_id,
          firstName: a.first_name,
          lastName: a.last_name,
          avatar: a.avatar_url
        },
        createdAt: a.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// ============================================================================
// POST /api/social/share - Share content
// ============================================================================
router.post('/share', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { shareType, referenceId, platform } = req.body;

    if (!shareType || !referenceId) {
      return res.status(400).json({ error: 'Share type and reference ID are required' });
    }

    await pool.query(
      `INSERT INTO user_shares (user_id, tenant_id, share_type, reference_id, platform)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, tenantId, shareType, referenceId, platform]
    );

    // Record activity
    await pool.query(
      `INSERT INTO user_activity_feed (user_id, tenant_id, activity_type, reference_type, reference_id, metadata)
       VALUES ($1, $2, 'share', $3, $4, $5)`,
      [userId, tenantId, shareType, referenceId, JSON.stringify({ platform })]
    );

    res.json({ message: 'Successfully shared' });
  } catch (error) {
    console.error('Error sharing:', error);
    res.status(500).json({ error: 'Failed to share' });
  }
});

// ============================================================================
// GET /api/social/discover - Discover users to follow
// ============================================================================
router.get('/discover', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { limit = 10 } = req.query;

    // Find users with similar activity or popular users
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url,
              (SELECT COUNT(*) FROM reviews r WHERE r.user_id = u.id) as review_count,
              (SELECT COUNT(*) FROM user_follows uf WHERE uf.following_id = u.id) as follower_count
       FROM users u
       WHERE u.id != $1
         AND u.id NOT IN (SELECT following_id FROM user_follows WHERE follower_id = $1)
         AND u.account_status = 'active'
       ORDER BY follower_count DESC, review_count DESC
       LIMIT $2`,
      [userId, parseInt(limit)]
    );

    res.json({
      users: result.rows.map(u => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        avatar: u.avatar_url,
        reviewCount: parseInt(u.review_count),
        followerCount: parseInt(u.follower_count)
      }))
    });
  } catch (error) {
    console.error('Error discovering users:', error);
    res.status(500).json({ error: 'Failed to discover users' });
  }
});

module.exports = router;

