const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/**
 * Get active ads by placement
 * Public endpoint - no authentication required
 * Returns ads that are:
 * - Status: active
 * - Start date <= now
 * - End date >= now
 * - Have remaining budget (spent_amount < total_budget)
 */
router.get('/placements/:placement', async (req, res) => {
  try {
    const { placement } = req.params;
    const { limit = 5 } = req.query;

    // Get tenant ID
    const tenantResult = await pool.query(`
      SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1
    `);

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenantId = tenantResult.rows[0].id;

    // Get active ads for this placement
    const adsQuery = `
      SELECT
        ba.id,
        ba.title,
        ba.description,
        ba.image_url,
        ba.video_url,
        ba.cta_text,
        ba.cta_url,
        ba.ad_type,
        ba.placement,
        ba.impressions,
        ba.clicks,
        ba.advertiser_id,
        ba.advertiser_type,
        u.first_name || ' ' || u.last_name as advertiser_name,
        CASE
          WHEN ba.advertiser_type = 'business_owner' THEN b.name
          WHEN ba.advertiser_type = 'specialist' THEN sp.business_name
          ELSE NULL
        END as business_name
      FROM business_ads ba
      LEFT JOIN users u ON ba.advertiser_id = u.id
      LEFT JOIN businesses b ON ba.advertiser_id = b.owner_id AND ba.advertiser_type = 'business_owner'
      LEFT JOIN specialist_profiles sp ON ba.advertiser_id = sp.user_id AND ba.advertiser_type = 'specialist'
      WHERE ba.tenant_id = $1
        AND ba.placement = $2
        AND ba.status = 'active'
        AND ba.start_date <= NOW()
        AND ba.end_date >= NOW()
        AND (ba.spent_amount < ba.total_budget OR ba.spent_amount IS NULL)
      ORDER BY RANDOM()
      LIMIT $3
    `;

    const result = await pool.query(adsQuery, [tenantId, placement, limit]);

    res.json({
      placement,
      ads: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching ads by placement:', error);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

/**
 * Track ad impression
 * Called when an ad is displayed to a user
 */
router.post('/impressions/:adId', async (req, res) => {
  try {
    const { adId } = req.params;

    // Increment impression count
    await pool.query(`
      UPDATE business_ads
      SET impressions = COALESCE(impressions, 0) + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [adId]);

    res.json({ success: true });

  } catch (error) {
    console.error('Error tracking impression:', error);
    res.status(500).json({ error: 'Failed to track impression' });
  }
});

/**
 * Track ad click
 * Called when a user clicks on an ad
 */
router.post('/clicks/:adId', async (req, res) => {
  try {
    const { adId } = req.params;

    // Increment click count
    await pool.query(`
      UPDATE business_ads
      SET clicks = COALESCE(clicks, 0) + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [adId]);

    res.json({ success: true });

  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

/**
 * Get all available ad placements
 * Returns list of placement types with descriptions
 */
router.get('/placements', async (req, res) => {
  try {
    const placements = [
      {
        id: 'homepage_banner',
        name: 'Homepage Banner',
        description: 'Large banner at the top of the homepage',
        dimensions: '1200x300',
        position: 'top'
      },
      {
        id: 'sidebar_ad',
        name: 'Sidebar Ad',
        description: 'Vertical ad in the sidebar',
        dimensions: '300x600',
        position: 'sidebar'
      },
      {
        id: 'inline_content',
        name: 'Inline Content',
        description: 'Ad within content flow',
        dimensions: '728x90',
        position: 'inline'
      },
      {
        id: 'footer_banner',
        name: 'Footer Banner',
        description: 'Banner at the bottom of pages',
        dimensions: '970x90',
        position: 'footer'
      },
      {
        id: 'mobile_banner',
        name: 'Mobile Banner',
        description: 'Banner optimized for mobile devices',
        dimensions: '320x50',
        position: 'mobile'
      },
      {
        id: 'featured_spot',
        name: 'Featured Spot',
        description: 'Premium featured placement',
        dimensions: '600x400',
        position: 'featured'
      }
    ];

    res.json({ placements });

  } catch (error) {
    console.error('Error fetching placements:', error);
    res.status(500).json({ error: 'Failed to fetch placements' });
  }
});

module.exports = router;

