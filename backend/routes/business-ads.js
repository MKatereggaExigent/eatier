const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// =====================================================
// ADVERTISING SYSTEM API
// =====================================================
// Comprehensive API for business owners and specialists
// to create and manage ads with geo-targeting
// =====================================================

// =====================================================
// 1. GEO-TARGETING ENDPOINTS
// =====================================================

// Get all regions
router.get('/regions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, code, description
      FROM regions
      WHERE is_active = true
      ORDER BY name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

// Get all countries
router.get('/countries', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id, c.name, c.code, c.currency_code, c.currency_symbol,
        c.region_id,
        r.name as region_name
      FROM countries c
      LEFT JOIN regions r ON c.region_id = r.id
      WHERE c.is_active = true
      ORDER BY c.name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

// Get countries by region
router.get('/countries/region/:regionId', async (req, res) => {
  try {
    const { regionId } = req.params;

    const result = await pool.query(`
      SELECT id, name, code, currency_code, currency_symbol
      FROM countries
      WHERE region_id = $1 AND is_active = true
      ORDER BY name ASC
    `, [regionId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching countries by region:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

// =====================================================
// 2. ADS MANAGEMENT ENDPOINTS
// =====================================================

// Get all ads for current user
router.get('/my-ads', async (req, res) => {
  try {
    const { userId } = req.query;
    const { status, page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const offset = (page - 1) * limit;

    let query = `
      SELECT
        ba.*,
        (SELECT json_agg(json_build_object('id', r.id, 'name', r.name, 'code', r.code))
         FROM regions r
         WHERE r.id = ANY(ba.target_regions)) as target_regions_data,
        (SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'code', c.code, 'currency_code', c.currency_code))
         FROM countries c
         WHERE c.id = ANY(ba.target_countries)) as target_countries_data
      FROM business_ads ba
      WHERE ba.advertiser_id = $1
    `;

    const params = [userId];

    if (status) {
      query += ` AND ba.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY ba.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM business_ads
      WHERE advertiser_id = $1
      ${status ? 'AND status = $2' : ''}
    `, status ? [userId, status] : [userId]);

    res.json({
      ads: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total)
      }
    });

  } catch (error) {
    console.error('Error fetching user ads:', error);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

// Get single ad by ID
router.get('/my-ads/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await pool.query(`
      SELECT
        ba.*,
        (SELECT json_agg(json_build_object('id', r.id, 'name', r.name, 'code', r.code))
         FROM regions r
         WHERE r.id = ANY(ba.target_regions)) as target_regions_data,
        (SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'code', c.code))
         FROM countries c
         WHERE c.id = ANY(ba.target_countries)) as target_countries_data
      FROM business_ads ba
      WHERE ba.id = $1 AND ba.advertiser_id = $2
    `, [adId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching ad:', error);
    res.status(500).json({ error: 'Failed to fetch ad' });
  }
});

// Create new ad
router.post('/my-ads', async (req, res) => {
  try {
    const {
      userId,
      userRole,
      tenantId,
      title,
      description,
      imageUrl,
      videoUrl,
      ctaText,
      ctaUrl,
      adType,
      placement,
      targetRegions,
      targetCountries,
      currencyCode,
      totalBudget,
      dailyBudget,
      startDate,
      endDate
    } = req.body;

    // Validation
    if (!userId || !tenantId) {
      return res.status(400).json({ error: 'User ID and Tenant ID are required' });
    }

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    if (!totalBudget || totalBudget < 5) {
      return res.status(400).json({
        error: 'Minimum budget is $5 / €5 / £5',
        minimumBudget: 5
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Check user role (must be business_owner or specialist)
    const allowedRoles = ['business_owner', 'specialist'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Only business owners and specialists can create ads',
        allowedRoles
      });
    }

    const result = await pool.query(`
      INSERT INTO business_ads (
        tenant_id, advertiser_id, advertiser_type,
        title, description, image_url, video_url, cta_text, cta_url,
        ad_type, placement,
        target_regions, target_countries,
        currency_code, total_budget, daily_budget,
        start_date, end_date,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      tenantId, userId, userRole,
      title, description, imageUrl, videoUrl, ctaText || 'Learn More', ctaUrl,
      adType || 'promoted', placement || 'homepage_banner',
      targetRegions || [], targetCountries || [],
      currencyCode || 'USD', totalBudget, dailyBudget,
      startDate, endDate,
      'draft' // New ads start as draft until payment
    ]);

    res.status(201).json({
      message: 'Ad created successfully',
      ad: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating ad:', error);
    res.status(500).json({ error: 'Failed to create ad' });
  }
});

// Update ad
router.put('/my-ads/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const {
      title,
      description,
      imageUrl,
      videoUrl,
      ctaText,
      ctaUrl,
      adType,
      placement,
      targetRegions,
      targetCountries,
      totalBudget,
      dailyBudget,
      startDate,
      endDate,
      status
    } = req.body;

    // Build dynamic update query
    const updates = [];
    const params = [adId, userId];
    let paramCount = 2;

    if (title !== undefined) {
      updates.push(`title = $${++paramCount}`);
      params.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${++paramCount}`);
      params.push(description);
    }
    if (imageUrl !== undefined) {
      updates.push(`image_url = $${++paramCount}`);
      params.push(imageUrl);
    }
    if (videoUrl !== undefined) {
      updates.push(`video_url = $${++paramCount}`);
      params.push(videoUrl);
    }
    if (ctaText !== undefined) {
      updates.push(`cta_text = $${++paramCount}`);
      params.push(ctaText);
    }
    if (ctaUrl !== undefined) {
      updates.push(`cta_url = $${++paramCount}`);
      params.push(ctaUrl);
    }
    if (adType !== undefined) {
      updates.push(`ad_type = $${++paramCount}`);
      params.push(adType);
    }
    if (placement !== undefined) {
      updates.push(`placement = $${++paramCount}`);
      params.push(placement);
    }
    if (targetRegions !== undefined) {
      updates.push(`target_regions = $${++paramCount}`);
      params.push(targetRegions);
    }
    if (targetCountries !== undefined) {
      updates.push(`target_countries = $${++paramCount}`);
      params.push(targetCountries);
    }
    if (totalBudget !== undefined) {
      if (totalBudget < 5) {
        return res.status(400).json({ error: 'Minimum budget is $5 / €5 / £5' });
      }
      updates.push(`total_budget = $${++paramCount}`);
      params.push(totalBudget);
    }
    if (dailyBudget !== undefined) {
      updates.push(`daily_budget = $${++paramCount}`);
      params.push(dailyBudget);
    }
    if (startDate !== undefined) {
      updates.push(`start_date = $${++paramCount}`);
      params.push(startDate);
    }
    if (endDate !== undefined) {
      updates.push(`end_date = $${++paramCount}`);
      params.push(endDate);
    }
    if (status !== undefined) {
      updates.push(`status = $${++paramCount}`);
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const query = `
      UPDATE business_ads
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND advertiser_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    res.json({
      message: 'Ad updated successfully',
      ad: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating ad:', error);
    res.status(500).json({ error: 'Failed to update ad' });
  }
});

// Delete ad
router.delete('/my-ads/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await pool.query(`
      DELETE FROM business_ads
      WHERE id = $1 AND advertiser_id = $2
      RETURNING id, title
    `, [adId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    res.json({
      message: 'Ad deleted successfully',
      deletedAd: result.rows[0]
    });

  } catch (error) {
    console.error('Error deleting ad:', error);
    res.status(500).json({ error: 'Failed to delete ad' });
  }
});

// =====================================================
// 3. AD STATISTICS & ANALYTICS
// =====================================================

// Get ad statistics for current user
router.get('/stats', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await pool.query(`
      SELECT
        COUNT(*) as total_ads,
        COUNT(*) FILTER (WHERE status = 'active') as active_ads,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_ads,
        COUNT(*) FILTER (WHERE status = 'paused') as paused_ads,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_ads,
        COALESCE(SUM(total_budget), 0) as total_budget,
        COALESCE(SUM(spent_amount), 0) as total_spent,
        COALESCE(SUM(impressions), 0) as total_impressions,
        COALESCE(SUM(clicks), 0) as total_clicks,
        COALESCE(SUM(conversions), 0) as total_conversions,
        CASE
          WHEN SUM(impressions) > 0
          THEN ROUND((SUM(clicks)::numeric / SUM(impressions)::numeric * 100), 2)
          ELSE 0
        END as average_ctr,
        CASE
          WHEN SUM(clicks) > 0
          THEN ROUND((SUM(conversions)::numeric / SUM(clicks)::numeric * 100), 2)
          ELSE 0
        END as conversion_rate
      FROM business_ads
      WHERE advertiser_id = $1
    `, [userId]);

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching ad stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// =====================================================
// 4. PAYMENT PROCESSING
// =====================================================

// Process ad payment
router.post('/my-ads/:adId/payment', async (req, res) => {
  try {
    const { adId } = req.params;
    const { userId, paymentId, paymentMethod, amount } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!paymentId || !amount) {
      return res.status(400).json({ error: 'Payment ID and amount are required' });
    }

    // Get the ad
    const adResult = await pool.query(`
      SELECT * FROM business_ads
      WHERE id = $1 AND advertiser_id = $2
    `, [adId, userId]);

    if (adResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    const ad = adResult.rows[0];

    // Verify payment amount matches total budget
    if (parseFloat(amount) < parseFloat(ad.total_budget)) {
      return res.status(400).json({
        error: 'Payment amount is less than total budget',
        required: ad.total_budget,
        provided: amount
      });
    }

    // Update ad with payment information
    const result = await pool.query(`
      UPDATE business_ads
      SET
        payment_status = 'paid',
        payment_id = $1,
        payment_date = CURRENT_TIMESTAMP,
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND advertiser_id = $3
      RETURNING *
    `, [paymentId, adId, userId]);

    res.json({
      message: 'Payment processed successfully. Your ad is now active!',
      ad: result.rows[0]
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// =====================================================
// 5. AD STATUS MANAGEMENT
// =====================================================

// Pause ad
router.post('/my-ads/:adId/pause', async (req, res) => {
  try {
    const { adId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await pool.query(`
      UPDATE business_ads
      SET status = 'paused', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND advertiser_id = $2 AND status = 'active'
      RETURNING *
    `, [adId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found or not active' });
    }

    res.json({
      message: 'Ad paused successfully',
      ad: result.rows[0]
    });

  } catch (error) {
    console.error('Error pausing ad:', error);
    res.status(500).json({ error: 'Failed to pause ad' });
  }
});

// Resume ad
router.post('/my-ads/:adId/resume', async (req, res) => {
  try {
    const { adId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await pool.query(`
      UPDATE business_ads
      SET status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND advertiser_id = $2 AND status = 'paused'
      RETURNING *
    `, [adId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found or not paused' });
    }

    res.json({
      message: 'Ad resumed successfully',
      ad: result.rows[0]
    });

  } catch (error) {
    console.error('Error resuming ad:', error);
    res.status(500).json({ error: 'Failed to resume ad' });
  }
});

// =====================================================
// 6. AD ANALYTICS TRACKING
// =====================================================

// Track ad impression
router.post('/track/impression/:adId', async (req, res) => {
  try {
    const { adId } = req.params;

    await pool.query(`
      UPDATE business_ads
      SET impressions = impressions + 1
      WHERE id = $1 AND status = 'active'
    `, [adId]);

    res.json({ message: 'Impression tracked' });

  } catch (error) {
    console.error('Error tracking impression:', error);
    res.status(500).json({ error: 'Failed to track impression' });
  }
});

// Track ad click
router.post('/track/click/:adId', async (req, res) => {
  try {
    const { adId } = req.params;

    await pool.query(`
      UPDATE business_ads
      SET clicks = clicks + 1
      WHERE id = $1 AND status = 'active'
    `, [adId]);

    res.json({ message: 'Click tracked' });

  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

// Track ad conversion
router.post('/track/conversion/:adId', async (req, res) => {
  try {
    const { adId } = req.params;

    await pool.query(`
      UPDATE business_ads
      SET conversions = conversions + 1
      WHERE id = $1 AND status = 'active'
    `, [adId]);

    res.json({ message: 'Conversion tracked' });

  } catch (error) {
    console.error('Error tracking conversion:', error);
    res.status(500).json({ error: 'Failed to track conversion' });
  }
});

module.exports = router;

