const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// ============================================================================
// ADMIN BLOG ROUTES
// ============================================================================

/**
 * GET /api/admin/blog - Get all blog posts (including drafts)
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category, search } = req.query;
    const offset = (page - 1) * limit;
    const tenantId = req.user.tenant_id;
    
    let query = `
      SELECT 
        bp.*,
        u.first_name || ' ' || u.last_name as author_name,
        u.email as author_email
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      WHERE bp.tenant_id = $1
    `;
    
    const params = [tenantId];
    let paramIndex = 2;
    
    if (status) {
      query += ` AND bp.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (category) {
      query += ` AND bp.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (bp.title ILIKE $${paramIndex} OR bp.excerpt ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Get total count
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    query += ` ORDER BY bp.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
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
    console.error('Error fetching admin blog posts:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

/**
 * GET /api/admin/blog/:id - Get single blog post by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    
    const result = await pool.query(`
      SELECT bp.*, u.first_name || ' ' || u.last_name as author_name
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      WHERE bp.id = $1 AND bp.tenant_id = $2
    `, [id, tenantId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    
    res.json({ post: result.rows[0] });
    
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

/**
 * POST /api/admin/blog - Create new blog post
 */
router.post('/', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const authorId = req.user.id;
    
    const {
      title,
      slug,
      excerpt,
      content,
      featured_image,
      category,
      tags,
      status = 'draft',
      is_featured = false,
      meta_title,
      meta_description,
      meta_keywords
    } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    // Generate slug if not provided
    const finalSlug = slug || title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Check for duplicate slug
    const slugCheck = await pool.query(
      'SELECT id FROM blog_posts WHERE slug = $1 AND tenant_id = $2',
      [finalSlug, tenantId]
    );
    
    if (slugCheck.rows.length > 0) {
      return res.status(400).json({ error: 'A post with this slug already exists' });
    }
    
    const publishedAt = status === 'published' ? new Date() : null;
    
    const result = await pool.query(`
      INSERT INTO blog_posts (
        tenant_id, author_id, title, slug, excerpt, content, featured_image,
        category, tags, status, is_featured, meta_title, meta_description,
        meta_keywords, published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      tenantId, authorId, title, finalSlug, excerpt, content, featured_image,
      category, tags || [], status, is_featured, meta_title, meta_description,
      meta_keywords || [], publishedAt
    ]);
    
    res.status(201).json({
      message: 'Blog post created successfully',
      post: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({ error: 'Failed to create blog post' });
  }
});

/**
 * PUT /api/admin/blog/:id - Update blog post
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const {
      title,
      slug,
      excerpt,
      content,
      featured_image,
      category,
      tags,
      status,
      is_featured,
      meta_title,
      meta_description,
      meta_keywords
    } = req.body;

    // Check post exists
    const existingPost = await pool.query(
      'SELECT * FROM blog_posts WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (existingPost.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    const currentPost = existingPost.rows[0];

    // Check for duplicate slug if slug is being changed
    if (slug && slug !== currentPost.slug) {
      const slugCheck = await pool.query(
        'SELECT id FROM blog_posts WHERE slug = $1 AND tenant_id = $2 AND id != $3',
        [slug, tenantId, id]
      );
      if (slugCheck.rows.length > 0) {
        return res.status(400).json({ error: 'A post with this slug already exists' });
      }
    }

    // Set published_at if publishing for first time
    let publishedAt = currentPost.published_at;
    if (status === 'published' && currentPost.status !== 'published') {
      publishedAt = new Date();
    }

    const result = await pool.query(`
      UPDATE blog_posts SET
        title = COALESCE($1, title),
        slug = COALESCE($2, slug),
        excerpt = COALESCE($3, excerpt),
        content = COALESCE($4, content),
        featured_image = COALESCE($5, featured_image),
        category = COALESCE($6, category),
        tags = COALESCE($7, tags),
        status = COALESCE($8, status),
        is_featured = COALESCE($9, is_featured),
        meta_title = COALESCE($10, meta_title),
        meta_description = COALESCE($11, meta_description),
        meta_keywords = COALESCE($12, meta_keywords),
        published_at = $13,
        updated_at = NOW()
      WHERE id = $14 AND tenant_id = $15
      RETURNING *
    `, [
      title, slug, excerpt, content, featured_image, category,
      tags, status, is_featured, meta_title, meta_description,
      meta_keywords, publishedAt, id, tenantId
    ]);

    res.json({
      message: 'Blog post updated successfully',
      post: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating blog post:', error);
    res.status(500).json({ error: 'Failed to update blog post' });
  }
});

/**
 * DELETE /api/admin/blog/:id - Delete blog post
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(
      'DELETE FROM blog_posts WHERE id = $1 AND tenant_id = $2 RETURNING id, title',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    res.json({
      message: 'Blog post deleted successfully',
      deleted: result.rows[0]
    });

  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
});

/**
 * GET /api/admin/blog/stats - Get blog statistics
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_posts,
        COUNT(*) FILTER (WHERE status = 'published') as published_posts,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_posts,
        SUM(view_count) as total_views,
        SUM(like_count) as total_likes,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as posts_this_month
      FROM blog_posts
      WHERE tenant_id = $1
    `, [tenantId]);

    res.json({ stats: stats.rows[0] });

  } catch (error) {
    console.error('Error fetching blog stats:', error);
    res.status(500).json({ error: 'Failed to fetch blog statistics' });
  }
});

/**
 * GET /api/admin/blog/categories - Get categories for admin
 */
router.get('/categories/list', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      SELECT * FROM blog_categories
      WHERE tenant_id = $1
      ORDER BY sort_order
    `, [tenantId]);

    res.json({ categories: result.rows });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;

