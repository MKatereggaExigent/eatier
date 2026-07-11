const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const adTrackingService = require('../services/adTrackingService');

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
    // Frontend adapts to whatever tiers are available in the database
    // Ads are ordered by tier priority (featured > premium > standard > basic)
    const placementMap = {
      'sidebar_left': { position: 'sidebar', page_location: 'all_pages' },
      'sidebar_right': { position: 'sidebar', page_location: 'all_pages' },
      'header_banner': { position: 'header', page_location: 'homepage' },
      'footer_banner': { position: 'footer', page_location: 'all_pages' },
      'inline_content': { position: 'inline', page_location: 'all_pages' },
      'homepage_banner': { position: 'hero', page_location: 'homepage' },
      'community_feed': { position: 'feed', page_location: 'community' },
      'restaurant_list': { position: 'inline', page_location: 'restaurant_list' },
      'restaurant_list_banner': { position: 'inline', page_location: 'restaurant_list' },
      'specialist_list': { position: 'inline', page_location: 'specialists' },
      'specialist_list_banner': { position: 'inline', page_location: 'specialists' }
    };

    const mappedPlacement = placementMap[placement];

    // Build the WHERE clause based on whether we have a mapped placement
    let whereClause;
    let queryParams;

    if (mappedPlacement) {
      // Match by position and page_location
      // Return all ads for this position, ordered by tier priority
      whereClause = `
        WHERE ac.status = 'active'
          AND ac.is_active = true
          AND ac.start_date <= CURRENT_TIMESTAMP
          AND (ac.end_date IS NULL OR ac.end_date >= CURRENT_TIMESTAMP)
          AND ac.remaining_amount > 0
          AND p.position = $1
          AND p.page_location = $2
      `;
      queryParams = [mappedPlacement.position, mappedPlacement.page_location, parseInt(limit)];
    } else {
      // Fallback: try to match by exact placement name
      whereClause = `
        WHERE ac.status = 'active'
          AND ac.is_active = true
          AND ac.start_date <= CURRENT_TIMESTAMP
          AND (ac.end_date IS NULL OR ac.end_date >= CURRENT_TIMESTAMP)
          AND ac.remaining_amount > 0
          AND (p.name = $1 OR p.position = $1 OR $1 = 'all')
      `;
      queryParams = [placement, parseInt(limit)];
    }

    // Query for active ads matching the placement
    const result = await pool.query(`
      SELECT
        ac.id,
        ac.business_id,
        ac.user_id,
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
        b.phone as business_phone,
        b.website as business_website,
        u.first_name as advertiser_first_name,
        u.last_name as advertiser_last_name
      FROM ad_campaigns ac
      LEFT JOIN ad_space_tiers t ON ac.tier_id = t.id
      LEFT JOIN ad_placements p ON ac.placement_id = p.id
      LEFT JOIN businesses b ON ac.business_id = b.id
      LEFT JOIN users u ON ac.user_id = u.id
      ${whereClause}
      ORDER BY t.priority_weight DESC, ac.created_at DESC
      LIMIT $${queryParams.length}
    `, queryParams);

    console.log(`📢 Ads query for placement "${placement}":`, {
      placement,
      mappedPosition: mappedPlacement?.position,
      mappedPageLocation: mappedPlacement?.page_location,
      foundAds: result.rows.length,
      adTitles: result.rows.map(ad => `${ad.title} (${ad.tier_name} - ${ad.placement_name})`)
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
 * Uses AdTrackingService for consistent CPM-based cost calculation
 */
router.post('/impressions/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
    const result = await adTrackingService.trackImpression(adId, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      placement: req.body.placement || null
    });
    res.json(result);
  } catch (error) {
    console.error('Error tracking impression:', error);
    res.status(500).json({ error: 'Failed to track impression' });
  }
});

/**
 * Track ad click
 * Called when a user clicks on an ad
 * Uses AdTrackingService for consistent CPC-based cost calculation
 */
router.post('/clicks/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
    const result = await adTrackingService.trackClick(adId, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    res.json(result);
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

