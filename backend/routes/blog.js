const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { optionalAuth } = require('../middleware/auth');

// ============================================================================
// PUBLIC BLOG ROUTES
// ============================================================================

/**
 * GET /api/blog - Get published blog posts
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      tag,
      featured,
      search 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Get tenant from header or default to itiyum
    const tenantSlug = req.headers['x-tenant-slug'] || 'itiyum';
    
    let query = `
      SELECT 
        bp.id,
        bp.title,
        bp.slug,
        bp.excerpt,
        bp.featured_image,
        bp.category,
        bp.tags,
        bp.is_featured,
        bp.view_count,
        bp.like_count,
        bp.published_at,
        bp.created_at,
        u.first_name || ' ' || u.last_name as author_name,
        u.profile_photo as author_avatar
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      JOIN tenants t ON bp.tenant_id = t.id
      WHERE bp.status = 'published'
        AND t.slug = $1
    `;
    
    const params = [tenantSlug];
    let paramIndex = 2;
    
    if (category) {
      query += ` AND bp.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (tag) {
      query += ` AND $${paramIndex} = ANY(bp.tags)`;
      params.push(tag);
      paramIndex++;
    }
    
    if (featured === 'true') {
      query += ` AND bp.is_featured = true`;
    }
    
    if (search) {
      query += ` AND (bp.title ILIKE $${paramIndex} OR bp.excerpt ILIKE $${paramIndex} OR bp.content ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Get total count
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Add ordering and pagination
    query += ` ORDER BY bp.is_featured DESC, bp.published_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    
    res.json({
      posts: result.rows,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        hasMore: offset + result.rows.length < total
      }
    });
    
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

/**
 * GET /api/blog/categories - Get blog categories
 */
router.get('/categories', async (req, res) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] || 'itiyum';
    
    const result = await pool.query(`
      SELECT bc.id, bc.name, bc.slug, bc.description, bc.icon, bc.sort_order,
             COUNT(bp.id) as post_count
      FROM blog_categories bc
      JOIN tenants t ON bc.tenant_id = t.id
      LEFT JOIN blog_posts bp ON bp.category = bc.name AND bp.status = 'published' AND bp.tenant_id = bc.tenant_id
      WHERE t.slug = $1
      GROUP BY bc.id, bc.name, bc.slug, bc.description, bc.icon, bc.sort_order
      ORDER BY bc.sort_order
    `, [tenantSlug]);
    
    res.json({ categories: result.rows });
    
  } catch (error) {
    console.error('Error fetching blog categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * GET /api/blog/:slug - Get single blog post by slug
 */
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const tenantSlug = req.headers['x-tenant-slug'] || 'itiyum';
    
    const result = await pool.query(`
      SELECT 
        bp.*,
        u.first_name || ' ' || u.last_name as author_name,
        u.profile_photo as author_avatar,
        u.bio as author_bio
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      JOIN tenants t ON bp.tenant_id = t.id
      WHERE bp.slug = $1 AND t.slug = $2 AND bp.status = 'published'
    `, [slug, tenantSlug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    
    const post = result.rows[0];
    
    // Increment view count
    await pool.query(
      'UPDATE blog_posts SET view_count = view_count + 1 WHERE id = $1',
      [post.id]
    );
    
    // Check if user has liked this post
    let userLiked = false;
    if (req.user) {
      const likeCheck = await pool.query(
        'SELECT id FROM blog_post_likes WHERE post_id = $1 AND user_id = $2',
        [post.id, req.user.id]
      );
      userLiked = likeCheck.rows.length > 0;
    }
    
    res.json({ 
      post: {
        ...post,
        view_count: post.view_count + 1,
        user_liked: userLiked
      }
    });
    
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

/**
 * POST /api/blog/:slug/like - Toggle like on a blog post
 */
router.post('/:slug/like', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required to like posts' });
    }

    const { slug } = req.params;
    const userId = req.user.id;
    const tenantSlug = req.headers['x-tenant-slug'] || 'itiyum';

    // Get post
    const postResult = await pool.query(`
      SELECT bp.id FROM blog_posts bp
      JOIN tenants t ON bp.tenant_id = t.id
      WHERE bp.slug = $1 AND t.slug = $2 AND bp.status = 'published'
    `, [slug, tenantSlug]);

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    const postId = postResult.rows[0].id;

    // Check if already liked
    const existingLike = await pool.query(
      'SELECT id FROM blog_post_likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    let liked;
    if (existingLike.rows.length > 0) {
      // Unlike
      await pool.query('DELETE FROM blog_post_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
      await pool.query('UPDATE blog_posts SET like_count = like_count - 1 WHERE id = $1', [postId]);
      liked = false;
    } else {
      // Like
      await pool.query('INSERT INTO blog_post_likes (post_id, user_id) VALUES ($1, $2)', [postId, userId]);
      await pool.query('UPDATE blog_posts SET like_count = like_count + 1 WHERE id = $1', [postId]);
      liked = true;
    }

    // Get updated like count
    const countResult = await pool.query('SELECT like_count FROM blog_posts WHERE id = $1', [postId]);

    res.json({
      liked,
      like_count: countResult.rows[0].like_count
    });

  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

/**
 * GET /api/blog/related/:slug - Get related blog posts
 */
router.get('/related/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { limit = 3 } = req.query;
    const tenantSlug = req.headers['x-tenant-slug'] || 'itiyum';

    // Get current post category and tags
    const currentPost = await pool.query(`
      SELECT bp.id, bp.category, bp.tags FROM blog_posts bp
      JOIN tenants t ON bp.tenant_id = t.id
      WHERE bp.slug = $1 AND t.slug = $2
    `, [slug, tenantSlug]);

    if (currentPost.rows.length === 0) {
      return res.json({ posts: [] });
    }

    const { id, category, tags } = currentPost.rows[0];

    // Find related posts by category or tags
    const result = await pool.query(`
      SELECT
        bp.id, bp.title, bp.slug, bp.excerpt, bp.featured_image,
        bp.category, bp.published_at,
        u.first_name || ' ' || u.last_name as author_name
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      JOIN tenants t ON bp.tenant_id = t.id
      WHERE bp.status = 'published'
        AND t.slug = $1
        AND bp.id != $2
        AND (bp.category = $3 OR bp.tags && $4::text[])
      ORDER BY bp.published_at DESC
      LIMIT $5
    `, [tenantSlug, id, category, tags || [], parseInt(limit)]);

    res.json({ posts: result.rows });

  } catch (error) {
    console.error('Error fetching related posts:', error);
    res.status(500).json({ error: 'Failed to fetch related posts' });
  }
});

module.exports = router;

