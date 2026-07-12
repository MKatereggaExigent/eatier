const express = require('express');
const pool = require('../config/database');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// POST /api/posts - Create a post
router.post('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { content, imageUrls, videoUrl } = req.body;

    if (!content && (!imageUrls || imageUrls.length === 0) && !videoUrl) {
      return res.status(400).json({ error: 'Post must have content, images, or video' });
    }

    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO user_posts (user_id, tenant_id, content, image_urls, video_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [userId, tenantId, content || null, JSON.stringify(imageUrls || []), videoUrl || null]);

    const post = result.rows[0];

    // Record activity for feed
    await client.query(`
      INSERT INTO user_activity_feed (user_id, tenant_id, activity_type, reference_type, reference_id, metadata, is_public)
      VALUES ($1, $2, 'post', 'user_post', $3, $4, true)
    `, [userId, tenantId, post.id, JSON.stringify({ preview: content?.substring(0, 150) || 'Shared a post', hasImages: !!(imageUrls?.length), hasVideo: !!videoUrl })]);

    await client.query('COMMIT');

    const userResult = await pool.query('SELECT id, first_name, last_name, avatar_url FROM users WHERE id = $1', [userId]);

    res.status(201).json({
      ...post,
      first_name: userResult.rows[0]?.first_name,
      last_name: userResult.rows[0]?.last_name,
      avatar_url: userResult.rows[0]?.avatar_url,
      like_count: 0,
      comment_count: 0,
      is_liked: false
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  } finally {
    client.release();
  }
});

// GET /api/posts/feed - Get posts from followed users
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { limit = 20, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT p.*, u.id as user_id, u.first_name, u.last_name, u.avatar_url,
        COALESCE(l.like_count, 0) as like_count,
        COALESCE(c.comment_count, 0) as comment_count,
        CASE WHEN ul.user_id IS NOT NULL THEN true ELSE false END as is_liked
      FROM user_posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN (SELECT post_id, COUNT(*) as like_count FROM post_likes GROUP BY post_id) l ON l.post_id = p.id
      LEFT JOIN (SELECT post_id, COUNT(*) as comment_count FROM post_comments GROUP BY post_id) c ON c.post_id = p.id
      LEFT JOIN post_likes ul ON ul.post_id = p.id AND ul.user_id = $1
      WHERE p.tenant_id = $2
        AND p.is_active = true
        AND (p.user_id IN (SELECT following_id FROM user_follows WHERE follower_id = $3) OR p.user_id = $4)
      ORDER BY p.created_at DESC
      LIMIT $5 OFFSET $6
    `, [userId, tenantId, userId, userId, parseInt(limit), parseInt(offset)]);

    res.json({ posts: result.rows });
  } catch (error) {
    console.error('Error fetching post feed:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// GET /api/posts/user/:userId - Get posts for a specific user
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT p.*, u.id as user_id, u.first_name, u.last_name, u.avatar_url,
        COALESCE(l.like_count, 0) as like_count,
        COALESCE(c.comment_count, 0) as comment_count,
        CASE WHEN ul.user_id IS NOT NULL THEN true ELSE false END as is_liked
      FROM user_posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN (SELECT post_id, COUNT(*) as like_count FROM post_likes GROUP BY post_id) l ON l.post_id = p.id
      LEFT JOIN (SELECT post_id, COUNT(*) as comment_count FROM post_comments GROUP BY post_id) c ON c.post_id = p.id
      LEFT JOIN post_likes ul ON ul.post_id = p.id AND ul.user_id = $1
      WHERE p.user_id = $2 AND p.is_active = true
      ORDER BY p.created_at DESC
      LIMIT $3 OFFSET $4
    `, [currentUserId, userId, parseInt(limit), parseInt(offset)]);

    res.json({ posts: result.rows });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
});

// GET /api/posts/:postId - Get single post
router.get('/:postId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId } = req.params;

    const result = await pool.query(`
      SELECT p.*, u.id as user_id, u.first_name, u.last_name, u.avatar_url,
        COALESCE(l.like_count, 0) as like_count,
        COALESCE(c.comment_count, 0) as comment_count,
        CASE WHEN ul.user_id IS NOT NULL THEN true ELSE false END as is_liked
      FROM user_posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN (SELECT post_id, COUNT(*) as like_count FROM post_likes GROUP BY post_id) l ON l.post_id = p.id
      LEFT JOIN (SELECT post_id, COUNT(*) as comment_count FROM post_comments GROUP BY post_id) c ON c.post_id = p.id
      LEFT JOIN post_likes ul ON ul.post_id = p.id AND ul.user_id = $1
      WHERE p.id = $2 AND p.is_active = true
    `, [userId, postId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// DELETE /api/posts/:postId - Delete own post
router.delete('/:postId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId } = req.params;

    const result = await pool.query(
      'UPDATE user_posts SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING id',
      [postId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found or not yours' });
    }

    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// POST /api/posts/:postId/like - Toggle like
router.post('/:postId/like', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.userId;
    const { postId } = req.params;

    await client.query('BEGIN');

    // Check if already liked
    const existing = await client.query(
      'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    let isLiked;
    if (existing.rows.length > 0) {
      await client.query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
      await client.query('UPDATE user_posts SET likes_count = likes_count - 1 WHERE id = $1', [postId]);
      isLiked = false;
    } else {
      await client.query('INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)', [postId, userId]);
      await client.query('UPDATE user_posts SET likes_count = likes_count + 1 WHERE id = $1', [postId]);
      isLiked = true;

      // Record activity for like
      const postOwner = await client.query('SELECT user_id FROM user_posts WHERE id = $1', [postId]);
      if (postOwner.rows.length > 0 && postOwner.rows[0].user_id !== userId) {
        await client.query(`
          INSERT INTO user_activity_feed (user_id, tenant_id, activity_type, reference_type, reference_id, metadata, is_public)
          VALUES ($1, $2, 'like', 'user_post', $3, $4, true)
        `, [userId, req.user.tenant_id, postId, JSON.stringify({ postId })]);
      }
    }

    await client.query('COMMIT');

    const count = await pool.query('SELECT likes_count FROM user_posts WHERE id = $1', [postId]);

    res.json({ isLiked, likesCount: parseInt(count.rows[0]?.likes_count) || 0 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  } finally {
    client.release();
  }
});

// GET /api/posts/:postId/likes - Get users who liked
router.get('/:postId/likes', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;

    const result = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.avatar_url, pl.created_at
      FROM post_likes pl
      JOIN users u ON pl.user_id = u.id
      WHERE pl.post_id = $1
      ORDER BY pl.created_at DESC
    `, [postId]);

    res.json({ likes: result.rows });
  } catch (error) {
    console.error('Error fetching likes:', error);
    res.status(500).json({ error: 'Failed to fetch likes' });
  }
});

// POST /api/posts/:postId/comments - Add comment
router.post('/:postId/comments', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.userId;
    const { postId } = req.params;
    const { content, parentId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO post_comments (post_id, user_id, content, parent_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [postId, userId, content.trim(), parentId || null]);

    await client.query('UPDATE user_posts SET comments_count = comments_count + 1 WHERE id = $1', [postId]);

    const userResult = await client.query('SELECT id, first_name, last_name, avatar_url FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');

    const comment = result.rows[0];
    res.status(201).json({
      ...comment,
      user_id: comment.user_id,
      first_name: userResult.rows[0].first_name,
      last_name: userResult.rows[0].last_name,
      avatar_url: userResult.rows[0].avatar_url,
      like_count: 0,
      is_liked: false
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  } finally {
    client.release();
  }
});

// GET /api/posts/:postId/comments - Get comments (with likes and replies)
router.get('/:postId/comments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId } = req.params;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_comment_likes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(comment_id, user_id)
      )
    `);

    const result = await pool.query(`
      SELECT pc.*, u.id as user_id, u.first_name, u.last_name, u.avatar_url,
             COALESCE(lc.like_count, 0) as like_count,
             CASE WHEN ul.id IS NOT NULL THEN true ELSE false END as is_liked
      FROM post_comments pc
      JOIN users u ON pc.user_id = u.id
      LEFT JOIN (SELECT comment_id, COUNT(*) as like_count FROM post_comment_likes GROUP BY comment_id) lc ON lc.comment_id = pc.id
      LEFT JOIN post_comment_likes ul ON ul.comment_id = pc.id AND ul.user_id = $2
      WHERE pc.post_id = $1
      ORDER BY pc.created_at ASC
    `, [postId, userId]);

    res.json({ comments: result.rows });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/posts/comments/:commentId/like - Toggle like on a comment
router.post('/comments/:commentId/like', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.userId;
    const { commentId } = req.params;

    const existing = await client.query(
      'SELECT id FROM post_comment_likes WHERE comment_id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (existing.rows.length > 0) {
      await client.query('DELETE FROM post_comment_likes WHERE id = $1', [existing.rows[0].id]);
      const countResult = await client.query('SELECT COUNT(*) as count FROM post_comment_likes WHERE comment_id = $1', [commentId]);
      res.json({ isLiked: false, likesCount: parseInt(countResult.rows[0].count) });
    } else {
      const result = await client.query(
        'INSERT INTO post_comment_likes (comment_id, user_id) VALUES ($1, $2) RETURNING id',
        [commentId, userId]
      );
      const countResult = await client.query('SELECT COUNT(*) as count FROM post_comment_likes WHERE comment_id = $1', [commentId]);
      res.json({ isLiked: true, likesCount: parseInt(countResult.rows[0].count) });
    }
  } catch (error) {
    console.error('Error toggling comment like:', error);
    res.status(500).json({ error: 'Failed to toggle comment like' });
  } finally {
    client.release();
  }
});

// DELETE /api/posts/comments/:commentId - Delete own comment
router.delete('/comments/:commentId', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.userId;
    const { commentId } = req.params;

    await client.query('BEGIN');

    const comment = await client.query(
      'SELECT post_id FROM post_comments WHERE id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (comment.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Comment not found or not yours' });
    }

    await client.query('DELETE FROM post_comments WHERE id = $1', [commentId]);
    await client.query('UPDATE user_posts SET comments_count = comments_count - 1 WHERE id = $1', [comment.rows[0].post_id]);

    await client.query('COMMIT');

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  } finally {
    client.release();
  }
});

module.exports = router;
