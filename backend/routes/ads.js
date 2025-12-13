const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// =====================================================
// STATIC ROUTES (must be defined before parameterized routes)
// =====================================================

/**
 * GET /api/ads/tiers
 * Get all ad tiers with pricing
 */
router.get('/tiers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        t.id,
        t.name,
        t.display_name,
        t.description,
        t.base_price_daily,
        t.base_price_weekly,
        t.base_price_monthly,
        t.currency,
        t.max_width,
        t.max_height,
        t.supports_video,
        t.supports_animation,
        t.rotation_speed_seconds,
        t.priority_weight,
        t.max_ads_per_rotation,
        t.features,
        COUNT(p.id) as placement_count
      FROM ad_space_tiers t
      LEFT JOIN ad_placements p ON t.id = p.tier_id AND p.is_active = true
      WHERE t.is_active = true
      GROUP BY t.id
      ORDER BY t.sort_order
    `);

    res.json({
      tiers: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching ad tiers:', error);
    res.status(500).json({ error: 'Failed to fetch tiers' });
  }
});

/**
 * GET /api/ads/placements
 * Get all ad placements, optionally filtered by tier
 */
router.get('/placements', async (req, res) => {
  try {
    const { tierId } = req.query;

    let query = `
      SELECT
        p.id,
        p.name,
        p.display_name,
        p.description,
        p.tier_id,
        t.name as tier_name,
        t.display_name as tier_display_name,
        p.page_location,
        p.position,
        p.width,
        p.height,
        COALESCE(p.custom_price_daily, t.base_price_daily) as price_daily,
        COALESCE(p.custom_price_weekly, t.base_price_weekly) as price_weekly,
        COALESCE(p.custom_price_monthly, t.base_price_monthly) as price_monthly,
        p.rotation_interval_ms,
        p.max_concurrent_ads
      FROM ad_placements p
      JOIN ad_space_tiers t ON p.tier_id = t.id
      WHERE p.is_active = true AND t.is_active = true
    `;

    const params = [];
    if (tierId) {
      params.push(tierId);
      query += ` AND p.tier_id = $1`;
    }

    query += ` ORDER BY t.sort_order, p.sort_order`;

    const result = await pool.query(query, params);

    res.json({
      placements: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching ad placements:', error);
    res.status(500).json({ error: 'Failed to fetch placements' });
  }
});

// =====================================================
// PARAMETERIZED ROUTES
// =====================================================

// Get all campaigns for a user
router.get('/campaigns/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        ac.*,
        COUNT(acds.id) as daily_stats_count
      FROM ad_campaigns ac
      LEFT JOIN ad_campaign_daily_stats acds ON ac.id = acds.campaign_id
      WHERE ac.user_id = $1
    `;

    const params = [userId];

    if (status) {
      query += ` AND ac.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` GROUP BY ac.id ORDER BY ac.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      campaigns: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Get single campaign
router.get('/campaigns/:userId/:campaignId', async (req, res) => {
  try {
    const { userId, campaignId } = req.params;

    const result = await pool.query(`
      SELECT * FROM ad_campaigns
      WHERE id = $1 AND user_id = $2
    `, [campaignId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// Create new campaign
router.post('/campaigns', async (req, res) => {
  try {
    const {
      userId,
      title,
      description,
      type,
      totalBudget,
      dailyBudget,
      currency,
      targetLocations,
      targetAgeMin,
      targetAgeMax,
      targetGender,
      targetInterests,
      headline,
      bodyText,
      callToAction,
      mediaUrls,
      destinationUrl,
      startDate,
      endDate
    } = req.body;

    const result = await pool.query(`
      INSERT INTO ad_campaigns (
        user_id, title, description, type, status,
        total_budget, daily_budget, spent_amount, remaining_amount, currency,
        target_locations, target_age_min, target_age_max, target_gender, target_interests,
        headline, body_text, call_to_action, media_urls, destination_url,
        start_date, end_date, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *
    `, [
      userId, title, description, type, 'draft',
      totalBudget, dailyBudget, 0, totalBudget, currency || 'USD',
      targetLocations, targetAgeMin, targetAgeMax, targetGender, targetInterests,
      headline, bodyText, callToAction, mediaUrls, destinationUrl,
      startDate, endDate, false
    ]);

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Update campaign
router.put('/campaigns/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'userId') {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(campaignId);

    const result = await pool.query(`
      UPDATE ad_campaigns
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// Delete campaign
router.delete('/campaigns/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const result = await pool.query(`
      DELETE FROM ad_campaigns
      WHERE id = $1
      RETURNING id
    `, [campaignId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ message: 'Campaign deleted successfully' });

  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// Get campaign analytics
router.get('/campaigns/:campaignId/analytics', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT
        date,
        impressions,
        clicks,
        conversions,
        spend,
        reach,
        engagement_likes,
        engagement_shares,
        engagement_comments,
        engagement_saves,
        profile_visits,
        website_clicks
      FROM ad_campaign_daily_stats
      WHERE campaign_id = $1
    `;

    const params = [campaignId];

    if (startDate) {
      query += ` AND date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND date <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY date DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get payment methods for user
router.get('/payment-methods/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(`
      SELECT * FROM payment_methods
      WHERE user_id = $1 AND is_active = true
      ORDER BY is_default DESC, created_at DESC
    `, [userId]);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// Add payment method
router.post('/payment-methods', async (req, res) => {
  try {
    const {
      userId,
      type,
      cardNumber,
      expiryDate,
      cardholderName,
      isDefault,
      billingStreet,
      billingCity,
      billingState,
      billingPostalCode,
      billingCountry
    } = req.body;

    // If this is set as default, unset other defaults
    if (isDefault) {
      await pool.query(`
        UPDATE payment_methods
        SET is_default = false
        WHERE user_id = $1
      `, [userId]);
    }

    const result = await pool.query(`
      INSERT INTO payment_methods (
        user_id, type, card_number, expiry_date, cardholder_name, is_default,
        billing_street, billing_city, billing_state, billing_postal_code, billing_country
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      userId, type, cardNumber, expiryDate, cardholderName, isDefault,
      billingStreet, billingCity, billingState, billingPostalCode, billingCountry
    ]);

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Error adding payment method:', error);
    res.status(500).json({ error: 'Failed to add payment method' });
  }
});

/**
 * GET /api/ads/public
 * Get active ads for display - supports tier-based priority rotation
 * Query params:
 *   - placement: specific placement name (e.g., 'sidebar_left', 'homepage_hero_banner')
 *   - tier: filter by tier ('premium', 'standard', 'basic')
 *   - limit: max number of ads to return
 */
router.get('/public', async (req, res) => {
  try {
    const { limit = 10, placement, tier } = req.query;

    let query = `
      SELECT
        ac.id,
        ac.business_id,
        ac.title,
        ac.description,
        ac.type,
        ac.headline,
        ac.body_text as body_text,
        ac.call_to_action,
        ac.cta_type,
        ac.cta_url,
        ac.cta_phone,
        ac.media_urls,
        ac.video_urls,
        ac.target_locations,
        ac.target_cities,
        ac.priority_score,
        ac.daily_budget,
        b.business_name,
        b.background_image,
        b.profile_photos,
        b.address,
        b.phone,
        b.website,
        t.name as tier_name,
        t.priority_weight as tier_priority,
        t.rotation_speed_seconds,
        p.name as placement_name,
        p.display_name as placement_display_name,
        p.width as placement_width,
        p.height as placement_height,
        p.rotation_interval_ms
      FROM ad_campaigns ac
      LEFT JOIN businesses b ON ac.business_id = b.id
      LEFT JOIN ad_space_tiers t ON ac.tier_id = t.id
      LEFT JOIN ad_placements p ON ac.placement_id = p.id
      WHERE ac.is_active = true
        AND ac.status = 'active'
        AND (ac.start_date IS NULL OR ac.start_date <= CURRENT_DATE)
        AND (ac.end_date IS NULL OR ac.end_date >= CURRENT_DATE)
        AND (ac.remaining_amount > 0 OR ac.total_budget = 0)
    `;

    const params = [];

    // Filter by placement
    if (placement) {
      params.push(placement);
      query += ` AND p.name = $${params.length}`;
    }

    // Filter by tier
    if (tier) {
      params.push(tier);
      query += ` AND t.name = $${params.length}`;
    }

    // Order by: tier priority (premium first), then by priority_score, then daily_budget (higher paying first)
    query += ` ORDER BY COALESCE(t.priority_weight, 0) DESC, ac.priority_score DESC, ac.daily_budget DESC, ac.created_at DESC`;
    params.push(parseInt(limit));
    query += ` LIMIT $${params.length}`;

    const result = await pool.query(query, params);

    // Increment impressions for returned ads
    if (result.rows.length > 0) {
      const adIds = result.rows.map(ad => ad.id);
      await pool.query(`
        UPDATE ad_campaigns
        SET impressions = impressions + 1
        WHERE id = ANY($1)
      `, [adIds]);
    }

    res.json({
      ads: result.rows.map(ad => ({
        ...ad,
        image_url: ad.media_urls?.[0] || null,
        video_url: ad.video_urls?.[0] || null
      })),
      count: result.rows.length,
      placement: placement || 'all',
      tier: tier || 'all'
    });

  } catch (error) {
    console.error('Error fetching public ads:', error);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

// Track ad click
router.post('/click/:adId', async (req, res) => {
  try {
    const { adId } = req.params;

    await pool.query(`
      UPDATE ad_campaigns
      SET clicks = clicks + 1
      WHERE id = $1
    `, [adId]);

    res.json({ success: true });

  } catch (error) {
    console.error('Error tracking ad click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

module.exports = router;
