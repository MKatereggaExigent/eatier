const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

/**
 * Middleware to ensure user is a specialist
 */
const ensureSpecialist = (req, res, next) => {
  if (req.user.role !== 'specialist') {
    return res.status(403).json({ error: 'Access denied. Specialist role required.' });
  }
  next();
};

// ============================================
// PORTFOLIO IMAGES ENDPOINTS
// ============================================

/**
 * GET /api/specialist/portfolio/images
 * Get all portfolio images for the logged-in specialist
 */
router.get('/images', authenticateToken, ensureSpecialist, async (req, res) => {
  try {
    const specialistId = req.user.id;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      SELECT id, url, title, description, category, event_type, is_main, display_order, created_at, updated_at
      FROM specialist_portfolio_images
      WHERE specialist_id = $1 AND tenant_id = $2
      ORDER BY display_order ASC, created_at DESC
    `, [specialistId, tenantId]);

    res.json({ images: result.rows });
  } catch (error) {
    console.error('Error fetching portfolio images:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio images' });
  }
});

/**
 * POST /api/specialist/portfolio/images
 * Add a new portfolio image
 */
router.post('/images', authenticateToken, ensureSpecialist, async (req, res) => {
  try {
    const specialistId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { url, title, description, category, eventType, isMain } = req.body;

    if (!url || !title) {
      return res.status(400).json({ error: 'URL and title are required' });
    }

    // If setting as main, unset other main images first
    if (isMain) {
      await pool.query(`
        UPDATE specialist_portfolio_images SET is_main = false
        WHERE specialist_id = $1 AND tenant_id = $2
      `, [specialistId, tenantId]);
    }

    const result = await pool.query(`
      INSERT INTO specialist_portfolio_images (specialist_id, tenant_id, url, title, description, category, event_type, is_main)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [specialistId, tenantId, url, title, description, category, eventType, isMain || false]);

    res.status(201).json({ image: result.rows[0] });
  } catch (error) {
    console.error('Error adding portfolio image:', error);
    res.status(500).json({ error: 'Failed to add portfolio image' });
  }
});

/**
 * PUT /api/specialist/portfolio/images/:id
 * Update a portfolio image
 */
router.put('/images/:id', authenticateToken, ensureSpecialist, async (req, res) => {
  try {
    const specialistId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { title, description, category, eventType, isMain } = req.body;

    // Verify ownership
    const existing = await pool.query(`
      SELECT id FROM specialist_portfolio_images WHERE id = $1 AND specialist_id = $2 AND tenant_id = $3
    `, [id, specialistId, tenantId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // If setting as main, unset other main images first
    if (isMain) {
      await pool.query(`
        UPDATE specialist_portfolio_images SET is_main = false
        WHERE specialist_id = $1 AND tenant_id = $2 AND id != $3
      `, [specialistId, tenantId, id]);
    }

    const result = await pool.query(`
      UPDATE specialist_portfolio_images
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          category = COALESCE($3, category),
          event_type = COALESCE($4, event_type),
          is_main = COALESCE($5, is_main),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND specialist_id = $7 AND tenant_id = $8
      RETURNING *
    `, [title, description, category, eventType, isMain, id, specialistId, tenantId]);

    res.json({ image: result.rows[0] });
  } catch (error) {
    console.error('Error updating portfolio image:', error);
    res.status(500).json({ error: 'Failed to update portfolio image' });
  }
});

/**
 * DELETE /api/specialist/portfolio/images/:id
 * Delete a portfolio image
 */
router.delete('/images/:id', authenticateToken, ensureSpecialist, async (req, res) => {
  try {
    const specialistId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM specialist_portfolio_images
      WHERE id = $1 AND specialist_id = $2 AND tenant_id = $3
      RETURNING id
    `, [id, specialistId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Error deleting portfolio image:', error);
    res.status(500).json({ error: 'Failed to delete portfolio image' });
  }
});

// ============================================
// PORTFOLIO VIDEOS ENDPOINTS
// ============================================

/**
 * GET /api/specialist/portfolio/videos
 * Get all portfolio videos for the logged-in specialist
 */
router.get('/videos', authenticateToken, ensureSpecialist, async (req, res) => {
  try {
    const specialistId = req.user.id;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      SELECT id, url, thumbnail_url, title, description, duration_seconds, display_order, created_at, updated_at
      FROM specialist_portfolio_videos
      WHERE specialist_id = $1 AND tenant_id = $2
      ORDER BY display_order ASC, created_at DESC
    `, [specialistId, tenantId]);

    res.json({ videos: result.rows });
  } catch (error) {
    console.error('Error fetching portfolio videos:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio videos' });
  }
});

/**
 * POST /api/specialist/portfolio/videos
 * Add a new portfolio video
 */
router.post('/videos', authenticateToken, ensureSpecialist, async (req, res) => {
  try {
    const specialistId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { url, thumbnailUrl, title, description, durationSeconds } = req.body;

    if (!url || !title) {
      return res.status(400).json({ error: 'URL and title are required' });
    }

    const result = await pool.query(`
      INSERT INTO specialist_portfolio_videos (specialist_id, tenant_id, url, thumbnail_url, title, description, duration_seconds)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [specialistId, tenantId, url, thumbnailUrl, title, description, durationSeconds || 0]);

    res.status(201).json({ video: result.rows[0] });
  } catch (error) {
    console.error('Error adding portfolio video:', error);
    res.status(500).json({ error: 'Failed to add portfolio video' });
  }
});

/**
 * PUT /api/specialist/portfolio/videos/:id
 * Update a portfolio video
 */
router.put('/videos/:id', authenticateToken, ensureSpecialist, async (req, res) => {
  try {
    const specialistId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { title, description, thumbnailUrl, durationSeconds } = req.body;

    const result = await pool.query(`
      UPDATE specialist_portfolio_videos
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          thumbnail_url = COALESCE($3, thumbnail_url),
          duration_seconds = COALESCE($4, duration_seconds),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND specialist_id = $6 AND tenant_id = $7
      RETURNING *
    `, [title, description, thumbnailUrl, durationSeconds, id, specialistId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ video: result.rows[0] });
  } catch (error) {
    console.error('Error updating portfolio video:', error);
    res.status(500).json({ error: 'Failed to update portfolio video' });
  }
});

/**
 * DELETE /api/specialist/portfolio/videos/:id
 * Delete a portfolio video
 */
router.delete('/videos/:id', authenticateToken, ensureSpecialist, async (req, res) => {
  try {
    const specialistId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM specialist_portfolio_videos
      WHERE id = $1 AND specialist_id = $2 AND tenant_id = $3
      RETURNING id
    `, [id, specialistId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Error deleting portfolio video:', error);
    res.status(500).json({ error: 'Failed to delete portfolio video' });
  }
});

// ============================================
// TESTIMONIALS ENDPOINTS
// ============================================

/**
 * GET /api/specialist/portfolio/testimonials
 * Get all testimonials for the logged-in specialist
 */
router.get('/testimonials', authenticateToken, ensureSpecialist, async (req, res) => {
  try {
    const specialistId = req.user.id;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      SELECT id, client_name, client_avatar_url, rating, review, event_type, event_date,
             is_public, is_featured, is_verified, booking_id, created_at, updated_at
      FROM specialist_testimonials
      WHERE specialist_id = $1 AND tenant_id = $2
      ORDER BY is_featured DESC, created_at DESC
    `, [specialistId, tenantId]);

    res.json({ testimonials: result.rows });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

/**
 * PUT /api/specialist/portfolio/testimonials/:id
 * Moderate a testimonial (specialists can only toggle visibility, not edit content)
 * Testimonials are created by CLIENTS after completed bookings, not by specialists
 */
router.put('/testimonials/:id', authenticateToken, ensureSpecialist, async (req, res) => {
  try {
    const specialistId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { isPublic, isFeatured } = req.body;

    // Specialists can only moderate visibility - not edit the actual content
    const result = await pool.query(`
      UPDATE specialist_testimonials
      SET is_public = COALESCE($1, is_public),
          is_featured = COALESCE($2, is_featured),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND specialist_id = $4 AND tenant_id = $5
      RETURNING *
    `, [isPublic, isFeatured, id, specialistId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }

    res.json({ testimonial: result.rows[0] });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    res.status(500).json({ error: 'Failed to update testimonial' });
  }
});

/**
 * DELETE /api/specialist/portfolio/testimonials/:id
 * Delete a testimonial
 */
router.delete('/testimonials/:id', authenticateToken, ensureSpecialist, async (req, res) => {
  try {
    const specialistId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM specialist_testimonials
      WHERE id = $1 AND specialist_id = $2 AND tenant_id = $3
      RETURNING id
    `, [id, specialistId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }

    res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    res.status(500).json({ error: 'Failed to delete testimonial' });
  }
});

// ============================================
// PORTFOLIO SETTINGS ENDPOINTS
// ============================================

/**
 * GET /api/specialist/portfolio/settings
 * Get portfolio settings for the logged-in specialist
 */
router.get('/settings', authenticateToken, ensureSpecialist, async (req, res) => {
  try {
    const specialistId = req.user.id;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      SELECT id, portfolio_title, portfolio_description, show_contact_info, allow_downloads, watermark_images, theme, created_at, updated_at
      FROM specialist_portfolio_settings
      WHERE specialist_id = $1 AND tenant_id = $2
    `, [specialistId, tenantId]);

    if (result.rows.length === 0) {
      // Return default settings if none exist
      return res.json({
        settings: {
          portfolio_title: null,
          portfolio_description: null,
          show_contact_info: true,
          allow_downloads: false,
          watermark_images: true,
          theme: 'default'
        }
      });
    }

    res.json({ settings: result.rows[0] });
  } catch (error) {
    console.error('Error fetching portfolio settings:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio settings' });
  }
});

/**
 * PUT /api/specialist/portfolio/settings
 * Update or create portfolio settings
 */
router.put('/settings', authenticateToken, ensureSpecialist, async (req, res) => {
  try {
    const specialistId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { portfolioTitle, portfolioDescription, showContactInfo, allowDownloads, watermarkImages, theme } = req.body;

    const result = await pool.query(`
      INSERT INTO specialist_portfolio_settings (specialist_id, tenant_id, portfolio_title, portfolio_description, show_contact_info, allow_downloads, watermark_images, theme)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (specialist_id, tenant_id)
      DO UPDATE SET
        portfolio_title = COALESCE($3, specialist_portfolio_settings.portfolio_title),
        portfolio_description = COALESCE($4, specialist_portfolio_settings.portfolio_description),
        show_contact_info = COALESCE($5, specialist_portfolio_settings.show_contact_info),
        allow_downloads = COALESCE($6, specialist_portfolio_settings.allow_downloads),
        watermark_images = COALESCE($7, specialist_portfolio_settings.watermark_images),
        theme = COALESCE($8, specialist_portfolio_settings.theme),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [specialistId, tenantId, portfolioTitle, portfolioDescription, showContactInfo, allowDownloads, watermarkImages, theme]);

    res.json({ settings: result.rows[0] });
  } catch (error) {
    console.error('Error updating portfolio settings:', error);
    res.status(500).json({ error: 'Failed to update portfolio settings' });
  }
});

// ============================================
// PUBLIC PORTFOLIO ENDPOINT
// ============================================

/**
 * GET /api/specialist/portfolio/public/:specialistId
 * Get public portfolio for a specialist (no auth required)
 */
router.get('/public/:specialistId', async (req, res) => {
  try {
    const { specialistId } = req.params;
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Get images
    const images = await pool.query(`
      SELECT id, url, title, description, category, event_type, is_main, display_order
      FROM specialist_portfolio_images
      WHERE specialist_id = $1 AND tenant_id = $2
      ORDER BY display_order ASC, created_at DESC
    `, [specialistId, tenantId]);

    // Get videos
    const videos = await pool.query(`
      SELECT id, url, thumbnail_url, title, description, duration_seconds, display_order
      FROM specialist_portfolio_videos
      WHERE specialist_id = $1 AND tenant_id = $2
      ORDER BY display_order ASC, created_at DESC
    `, [specialistId, tenantId]);

    // Get public testimonials
    const testimonials = await pool.query(`
      SELECT id, client_name, client_avatar_url, rating, review, event_type, event_date, is_featured
      FROM specialist_testimonials
      WHERE specialist_id = $1 AND tenant_id = $2 AND is_public = true
      ORDER BY is_featured DESC, created_at DESC
    `, [specialistId, tenantId]);

    // Get settings
    const settings = await pool.query(`
      SELECT portfolio_title, portfolio_description, show_contact_info, theme
      FROM specialist_portfolio_settings
      WHERE specialist_id = $1 AND tenant_id = $2
    `, [specialistId, tenantId]);

    res.json({
      images: images.rows,
      videos: videos.rows,
      testimonials: testimonials.rows,
      settings: settings.rows[0] || { portfolio_title: null, portfolio_description: null, show_contact_info: true, theme: 'default' }
    });
  } catch (error) {
    console.error('Error fetching public portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

module.exports = router;

