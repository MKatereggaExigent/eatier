const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/**
 * GET /api/industry-news - Get industry news feed
 * Public endpoint for real-time news ticker
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 10, category, breaking_only } = req.query;
    const tenantSlug = req.headers['x-tenant-slug'] || 'itiyum';

    let query = `
      SELECT 
        inf.id,
        inf.title,
        inf.summary,
        inf.source_name,
        inf.source_url,
        inf.image_url,
        inf.category,
        inf.tags,
        inf.is_breaking,
        inf.priority,
        inf.published_at,
        inf.view_count,
        inf.click_count
      FROM industry_news_feed inf
      JOIN tenants t ON inf.tenant_id = t.id
      WHERE inf.is_active = true
        AND t.slug = $1
        AND (inf.expires_at IS NULL OR inf.expires_at > NOW())
    `;

    const params = [tenantSlug];
    let paramIndex = 2;

    if (breaking_only === 'true') {
      query += ` AND inf.is_breaking = true`;
    }

    if (category) {
      query += ` AND inf.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += ` ORDER BY inf.is_breaking DESC, inf.priority DESC, inf.published_at DESC`;
    query += ` LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      news: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching industry news:', error);
    res.status(500).json({ error: 'Failed to fetch industry news' });
  }
});

/**
 * GET /api/industry-news/trends - Get industry trends/statistics
 */
router.get('/trends', async (req, res) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] || 'itiyum';

    const result = await pool.query(`
      SELECT 
        it.id,
        it.trend_name,
        it.trend_type,
        it.description,
        it.current_value,
        it.previous_value,
        it.percentage_change,
        it.unit,
        it.icon,
        it.period_label,
        it.sort_order
      FROM industry_trends it
      JOIN tenants t ON it.tenant_id = t.id
      WHERE it.is_active = true
        AND t.slug = $1
        AND (it.valid_until IS NULL OR it.valid_until > NOW())
      ORDER BY it.sort_order ASC
    `, [tenantSlug]);

    res.json({
      trends: result.rows,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching industry trends:', error);
    res.status(500).json({ error: 'Failed to fetch industry trends' });
  }
});

/**
 * GET /api/industry-news/categories - Get news categories
 */
router.get('/categories', async (req, res) => {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] || 'itiyum';

    const result = await pool.query(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM industry_news_feed inf
      JOIN tenants t ON inf.tenant_id = t.id
      WHERE inf.is_active = true AND t.slug = $1
      GROUP BY category
      ORDER BY count DESC
    `, [tenantSlug]);

    res.json({ categories: result.rows });

  } catch (error) {
    console.error('Error fetching news categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * POST /api/industry-news/:id/click - Track news item click
 */
router.post('/:id/click', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(`
      UPDATE industry_news_feed 
      SET click_count = click_count + 1
      WHERE id = $1
    `, [id]);

    res.json({ success: true });

  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

module.exports = router;

