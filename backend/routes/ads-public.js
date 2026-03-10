const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/**
 * Get active ads by placement
 * Public endpoint - no authentication required
 * Returns ads that are:
 * - Status: active
 * - is_active: true
 * - Start date <= now
 * - End date >= now OR end_date is null
 * - Have remaining budget (remaining_amount > 0)
 */
router.get('/placements/:placement', async (req, res) => {
  try {
    const { placement } = req.params;
    const { limit = 5, page_location } = req.query;

    // Map frontend placement names to backend position/page_location
    const placementMap = {
      'sidebar_left': { position: 'sidebar', page_location: 'all_pages' },
      'sidebar_right': { position: 'sidebar', page_location: 'all_pages' },
      'header_banner': { position: 'header', page_location: 'homepage' },
      'footer_banner': { position: 'footer', page_location: 'all_pages' },
      'inline_content': { position: 'inline', page_location: 'all_pages' },
      'homepage_banner': { position: 'hero', page_location: 'homepage' }
    };

    const mappedPlacement = placementMap[placement];

    // Query for active ads matching the placement
    const result = await pool.query(`
      SELECT
        ac.id,
        ac.title,
        ac.description,
        ac.headline,
        ac.body_text,
        ac.call_to_action,
        ac.cta_type,
        ac.cta_url,
        ac.cta_phone,
        ac.media_urls,
        ac.video_urls,
        ac.target_regions,
        ac.target_locations,
        ac.target_cities,
        ac.start_date,
        ac.end_date,
        ac.impressions,
        ac.clicks,
        t.name as tier_name,
        t.display_name as tier_display_name,
        t.priority_weight as tier_priority,
        p.name as placement_name,
        p.display_name as placement_display_name,
        p.page_location,
        p.position,
        p.width as placement_width,
        p.height as placement_height,
        b.business_name,
        b.logo_url as business_logo,
        u.first_name as advertiser_first_name,
        u.last_name as advertiser_last_name
      FROM ad_campaigns ac
      LEFT JOIN ad_space_tiers t ON ac.tier_id = t.id
      LEFT JOIN ad_placements p ON ac.placement_id = p.id
      LEFT JOIN businesses b ON ac.business_id = b.id
      LEFT JOIN users u ON ac.user_id = u.id
      WHERE ac.status = 'active'
        AND ac.is_active = true
        AND ac.start_date <= CURRENT_TIMESTAMP
        AND (ac.end_date IS NULL OR ac.end_date >= CURRENT_TIMESTAMP)
        AND ac.remaining_amount > 0
        AND (
          -- Match by exact name
          p.name = $1
          -- Or match by mapped position and page_location
          OR (p.position = $2 AND p.page_location = $3)
          -- Or match by position only for flexible placement
          OR p.position = $1
          -- Or show all if requested
          OR $1 = 'all'
        )
      ORDER BY t.priority_weight DESC, ac.created_at DESC
      LIMIT $4
    `, [
      placement,
      mappedPlacement?.position || placement,
      mappedPlacement?.page_location || 'all_pages',
      parseInt(limit)
    ]);

    console.log(`📢 Ads query for placement "${placement}":`, {
      placement,
      mappedPosition: mappedPlacement?.position,
      mappedPageLocation: mappedPlacement?.page_location,
      foundAds: result.rows.length
    });

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

    await pool.query(`
      UPDATE ad_campaigns
      SET impressions = impressions + 1
      WHERE id = $1 AND status = 'active'
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

    await pool.query(`
      UPDATE ad_campaigns
      SET clicks = clicks + 1
      WHERE id = $1 AND status = 'active'
    `, [adId]);

    res.json({ success: true });

  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

/**
 * Get all active ads
 * Public endpoint - returns all currently active ads
 */
router.get('/active', async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await pool.query(`
      SELECT
        ac.id,
        ac.title,
        ac.description,
        ac.headline,
        ac.body_text,
        ac.call_to_action,
        ac.cta_type,
        ac.cta_url,
        ac.cta_phone,
        ac.media_urls,
        ac.video_urls,
        ac.target_regions,
        ac.target_locations,
        ac.target_cities,
        ac.start_date,
        ac.end_date,
        ac.impressions,
        ac.clicks,
        t.name as tier_name,
        t.display_name as tier_display_name,
        t.priority_weight as tier_priority,
        p.name as placement_name,
        p.display_name as placement_display_name,
        p.page_location,
        p.position,
        p.width as placement_width,
        p.height as placement_height,
        b.business_name,
        b.logo_url as business_logo,
        u.first_name as advertiser_first_name,
        u.last_name as advertiser_last_name
      FROM ad_campaigns ac
      LEFT JOIN ad_space_tiers t ON ac.tier_id = t.id
      LEFT JOIN ad_placements p ON ac.placement_id = p.id
      LEFT JOIN businesses b ON ac.business_id = b.id
      LEFT JOIN users u ON ac.user_id = u.id
      WHERE ac.status = 'active'
        AND ac.is_active = true
        AND ac.start_date <= CURRENT_TIMESTAMP
        AND (ac.end_date IS NULL OR ac.end_date >= CURRENT_TIMESTAMP)
        AND ac.remaining_amount > 0
      ORDER BY t.priority_weight DESC, ac.created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), offset]);

    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM ad_campaigns ac
      WHERE ac.status = 'active'
        AND ac.is_active = true
        AND ac.start_date <= CURRENT_TIMESTAMP
        AND (ac.end_date IS NULL OR ac.end_date >= CURRENT_TIMESTAMP)
        AND ac.remaining_amount > 0
    `);

    res.json({
      ads: result.rows,
      count: result.rows.length,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Error fetching active ads:', error);
    res.status(500).json({ error: 'Failed to fetch active ads' });
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

