const express = require('express');
const pool = require('../config/database');
const paystackService = require('../services/paystackService');
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
// 2. ADS MANAGEMENT ENDPOINTS (Using ad_campaigns table)
// =====================================================

// Get all ads for current user/business
router.get('/my-ads', async (req, res) => {
  try {
    const { userId, businessId } = req.query;
    const { status, page = 1, limit = 10 } = req.query;

    if (!userId && !businessId) {
      return res.status(400).json({ error: 'User ID or Business ID is required' });
    }

    const offset = (page - 1) * limit;

    let query = `
      SELECT
        ac.*,
        t.name as tier_name,
        t.display_name as tier_display_name,
        t.base_price_daily as tier_price_daily,
        t.priority_weight as tier_priority,
        p.name as placement_name,
        p.display_name as placement_display_name,
        p.page_location,
        p.position,
        b.business_name
      FROM ad_campaigns ac
      LEFT JOIN ad_space_tiers t ON ac.tier_id = t.id
      LEFT JOIN ad_placements p ON ac.placement_id = p.id
      LEFT JOIN businesses b ON ac.business_id = b.id
      WHERE 1=1
    `;

    const params = [];

    if (userId) {
      params.push(userId);
      query += ` AND ac.user_id = $${params.length}`;
    }

    if (businessId) {
      params.push(businessId);
      query += ` AND ac.business_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND ac.status = $${params.length}`;
    }

    query += ` ORDER BY ac.created_at DESC`;
    params.push(parseInt(limit));
    query += ` LIMIT $${params.length}`;
    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM ad_campaigns ac WHERE 1=1`;
    const countParams = [];

    if (userId) {
      countParams.push(userId);
      countQuery += ` AND ac.user_id = $${countParams.length}`;
    }
    if (businessId) {
      countParams.push(businessId);
      countQuery += ` AND ac.business_id = $${countParams.length}`;
    }
    if (status) {
      countParams.push(status);
      countQuery += ` AND ac.status = $${countParams.length}`;
    }

    const countResult = await pool.query(countQuery, countParams);

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
        ac.*,
        t.name as tier_name,
        t.display_name as tier_display_name,
        t.base_price_daily as tier_price_daily,
        t.priority_weight as tier_priority,
        t.supports_video,
        t.supports_animation,
        p.name as placement_name,
        p.display_name as placement_display_name,
        p.page_location,
        p.position,
        p.width as placement_width,
        p.height as placement_height,
        b.business_name
      FROM ad_campaigns ac
      LEFT JOIN ad_space_tiers t ON ac.tier_id = t.id
      LEFT JOIN ad_placements p ON ac.placement_id = p.id
      LEFT JOIN businesses b ON ac.business_id = b.id
      WHERE ac.id = $1 AND ac.user_id = $2
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

/**
 * Create new ad campaign
 * RBAC: Only business owners and specialists can create ads
 * Multi-tenancy: Uses user's tenant_id from database
 */
router.post('/my-ads', async (req, res) => {
  try {
    const {
      userId,
      tenantId: providedTenantId,
      businessId: providedBusinessId,
      tierId,
      placementId,
      title,
      description,
      headline,
      bodyText,
      callToAction,
      ctaType,
      ctaUrl,
      ctaPhone,
      mediaUrls,
      videoUrls,
      targetRegions,
      targetLocations,
      targetCities,
      currency,
      totalBudget,
      dailyBudget,
      startDate,
      endDate
    } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!tierId || !placementId) {
      return res.status(400).json({ error: 'Tier ID and Placement ID are required' });
    }

    if (!totalBudget || totalBudget < 5) {
      return res.status(400).json({
        error: 'Minimum budget is $5',
        minimumBudget: 5
      });
    }

    // Look up user's tenant_id and business_id from database
    const userQuery = await pool.query(`
      SELECT u.tenant_id, b.id as business_id
      FROM users u
      LEFT JOIN businesses b ON b.owner_id = u.id
      WHERE u.id = $1
    `, [userId]);

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Use provided values or fall back to database values
    const tenantId = providedTenantId || userQuery.rows[0].tenant_id;
    const businessId = providedBusinessId || userQuery.rows[0].business_id;

    if (!tenantId) {
      return res.status(400).json({ error: 'User is not associated with a tenant' });
    }

    // Verify the tier and placement exist and match
    const tierCheck = await pool.query(`
      SELECT t.id, t.priority_weight, p.id as placement_id, p.tier_id
      FROM ad_space_tiers t
      JOIN ad_placements p ON p.tier_id = t.id
      WHERE t.id = $1 AND p.id = $2 AND t.is_active = true AND p.is_active = true
    `, [tierId, placementId]);

    if (tierCheck.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid tier or placement selection',
        details: 'The selected placement does not match the tier'
      });
    }

    // Calculate priority score based on tier and budget
    const tierPriority = tierCheck.rows[0].priority_weight;
    const priorityScore = Math.floor(tierPriority + (parseFloat(dailyBudget || 0) / 10));

    const result = await pool.query(`
      INSERT INTO ad_campaigns (
        tenant_id, user_id, business_id,
        tier_id, placement_id,
        title, description, headline, body_text,
        call_to_action, cta_type, cta_url, cta_phone,
        media_urls, video_urls,
        target_regions, target_locations, target_cities,
        currency, total_budget, daily_budget, remaining_amount,
        start_date, end_date,
        priority_score, payment_required,
        status, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $20, $22, $23, $24, true, 'draft', false)
      RETURNING *
    `, [
      tenantId, userId, businessId || null,
      tierId, placementId,
      title, description || null, headline || null, bodyText || null,
      callToAction || 'Learn More', ctaType || 'learn_more', ctaUrl || null, ctaPhone || null,
      mediaUrls || [], videoUrls || [],
      targetRegions || [], targetLocations || [], targetCities || [],
      currency || 'USD', totalBudget, dailyBudget || totalBudget,
      startDate || new Date(), endDate || null,
      priorityScore
    ]);

    const adCampaign = result.rows[0];

    // Initialize Paystack payment for the ad campaign
    // Get user email for payment
    const userResult = await pool.query(`SELECT email FROM users WHERE id = $1`, [userId]);
    const userEmail = userResult.rows[0]?.email;

    if (userEmail && totalBudget > 0) {
      try {
        const reference = `AD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const paymentResult = await paystackService.initializeTransaction({
          email: userEmail,
          amount: totalBudget,
          reference,
          callback_url: process.env.PAYSTACK_CALLBACK_URL,
          metadata: {
            type: 'ad_campaign',
            ad_campaign_id: adCampaign.id,
            tier_id: tierId,
            user_id: userId,
            tenant_id: tenantId
          }
        });

        // Store pending payment transaction
        await pool.query(`
          INSERT INTO payment_transactions (tenant_id, user_id, reference, email, amount, currency, status, ad_campaign_id, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
        `, [tenantId, userId, reference, userEmail, totalBudget, currency || 'ZAR', adCampaign.id, { tier_id: tierId }]);

        res.status(201).json({
          message: 'Ad campaign created successfully. Complete payment to activate.',
          ad: adCampaign,
          paymentRequired: true,
          payment: {
            authorization_url: paymentResult.authorization_url,
            reference: paymentResult.reference,
            amount: totalBudget
          }
        });
      } catch (paymentError) {
        console.error('Payment initialization failed:', paymentError);
        res.status(201).json({
          message: 'Ad campaign created. Payment initialization failed - please try again from the ad management page.',
          ad: adCampaign,
          paymentRequired: true,
          paymentError: paymentError.message
        });
      }
    } else {
      res.status(201).json({
        message: 'Ad campaign created successfully. Payment required to activate.',
        ad: adCampaign,
        paymentRequired: true
      });
    }

  } catch (error) {
    console.error('Error creating ad:', error);
    res.status(500).json({ error: 'Failed to create ad', details: error.message });
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
      targetCities,
      targetLocations,
      targetAgeMin,
      targetAgeMax,
      targetGender,
      targetInterests,
      totalBudget,
      dailyBudget,
      startDate,
      endDate,
      status,
      headline,
      bodyText,
      callToAction,
      ctaType,
      ctaPhone,
      mediaUrls,
      videoUrls,
      tierId,
      placementId
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
    if (headline !== undefined) {
      updates.push(`headline = $${++paramCount}`);
      params.push(headline);
    }
    if (bodyText !== undefined) {
      updates.push(`body_text = $${++paramCount}`);
      params.push(bodyText);
    }
    if (callToAction !== undefined) {
      updates.push(`call_to_action = $${++paramCount}`);
      params.push(callToAction);
    }
    if (ctaType !== undefined) {
      updates.push(`cta_type = $${++paramCount}`);
      params.push(ctaType);
    }
    if (ctaPhone !== undefined) {
      updates.push(`cta_phone = $${++paramCount}`);
      params.push(ctaPhone);
    }
    if (mediaUrls !== undefined) {
      updates.push(`media_urls = $${++paramCount}`);
      params.push(mediaUrls);
    }
    if (videoUrls !== undefined) {
      updates.push(`video_urls = $${++paramCount}`);
      params.push(videoUrls);
    }
    if (tierId !== undefined) {
      updates.push(`tier_id = $${++paramCount}`);
      params.push(tierId);
    }
    if (placementId !== undefined) {
      updates.push(`placement_id = $${++paramCount}`);
      params.push(placementId);
    }
    if (targetCities !== undefined) {
      updates.push(`target_cities = $${++paramCount}`);
      params.push(targetCities);
    }
    if (targetLocations !== undefined) {
      updates.push(`target_locations = $${++paramCount}`);
      params.push(targetLocations);
    }
    if (targetAgeMin !== undefined) {
      updates.push(`target_age_min = $${++paramCount}`);
      params.push(targetAgeMin);
    }
    if (targetAgeMax !== undefined) {
      updates.push(`target_age_max = $${++paramCount}`);
      params.push(targetAgeMax);
    }
    if (targetGender !== undefined) {
      updates.push(`target_gender = $${++paramCount}`);
      params.push(targetGender);
    }
    if (targetInterests !== undefined) {
      updates.push(`target_interests = $${++paramCount}`);
      params.push(targetInterests);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const query = `
      UPDATE ad_campaigns
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
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
      DELETE FROM ad_campaigns
      WHERE id = $1 AND user_id = $2
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
    const { userId, businessId } = req.query;

    if (!userId && !businessId) {
      return res.status(400).json({ error: 'User ID or Business ID is required' });
    }

    let whereClause = '';
    const params = [];

    if (userId) {
      params.push(userId);
      whereClause = `user_id = $${params.length}`;
    }
    if (businessId) {
      if (whereClause) whereClause += ' OR ';
      params.push(businessId);
      whereClause += `business_id = $${params.length}`;
    }

    const result = await pool.query(`
      SELECT
        COUNT(*) as total_ads,
        COUNT(*) FILTER (WHERE status = 'active') as active_ads,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_ads,
        COUNT(*) FILTER (WHERE status = 'paused') as paused_ads,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_ads,
        COALESCE(SUM(total_budget), 0) as total_budget,
        COALESCE(SUM(total_budget - remaining_amount), 0) as total_spent,
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
      FROM ad_campaigns
      WHERE ${whereClause}
    `, params);

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching ad stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// =====================================================
// 4. PAYMENT PROCESSING
// =====================================================

/**
 * Initialize Paystack payment for an existing ad campaign
 * Returns payment authorization URL for redirect
 */
router.post('/my-ads/:adId/payment', async (req, res) => {
  try {
    const { adId } = req.params;
    const { userId, email } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get the ad with tier info
    const adResult = await pool.query(`
      SELECT ac.*, t.base_price_daily, t.display_name as tier_name, u.email as user_email
      FROM ad_campaigns ac
      LEFT JOIN ad_space_tiers t ON ac.tier_id = t.id
      LEFT JOIN users u ON ac.user_id = u.id
      WHERE ac.id = $1 AND ac.user_id = $2
    `, [adId, userId]);

    if (adResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    const ad = adResult.rows[0];
    const userEmail = email || ad.user_email;

    if (!userEmail) {
      return res.status(400).json({ error: 'Email is required for payment' });
    }

    if (!ad.payment_required) {
      return res.status(400).json({ error: 'This ad has already been paid for' });
    }

    // Initialize Paystack payment
    const reference = `AD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const paymentResult = await paystackService.initializeTransaction({
      email: userEmail,
      amount: parseFloat(ad.total_budget),
      reference,
      callback_url: process.env.PAYSTACK_CALLBACK_URL,
      metadata: {
        type: 'ad_campaign',
        ad_campaign_id: adId,
        tier_id: ad.tier_id,
        user_id: userId,
        tenant_id: ad.tenant_id
      }
    });

    // Store pending payment transaction
    await pool.query(`
      INSERT INTO payment_transactions (tenant_id, user_id, reference, email, amount, currency, status, ad_campaign_id, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
      ON CONFLICT (reference) DO NOTHING
    `, [ad.tenant_id, userId, reference, userEmail, ad.total_budget, ad.currency || 'ZAR', adId, { tier_id: ad.tier_id }]);

    res.json({
      success: true,
      message: 'Payment initialized. Redirect to complete payment.',
      payment: {
        authorization_url: paymentResult.authorization_url,
        reference: paymentResult.reference,
        amount: ad.total_budget
      },
      ad: { id: ad.id, title: ad.title, tier_name: ad.tier_name }
    });

  } catch (error) {
    console.error('Error initializing payment:', error);
    res.status(500).json({ error: 'Failed to initialize payment' });
  }
});

/**
 * Verify ad payment (called after Paystack redirect)
 * Activates the ad campaign if payment is successful
 */
router.post('/my-ads/:adId/verify-payment', async (req, res) => {
  try {
    const { adId } = req.params;
    const { reference, userId } = req.body;

    if (!reference) {
      return res.status(400).json({ error: 'Payment reference is required' });
    }

    // Verify payment with Paystack
    const paymentResult = await paystackService.verifyTransaction(reference);

    if (paymentResult.status !== 'success') {
      return res.status(400).json({
        error: 'Payment not successful',
        status: paymentResult.status
      });
    }

    // Update payment transaction
    await pool.query(`
      UPDATE payment_transactions
      SET status = 'success', paid_at = NOW(), channel = $1
      WHERE reference = $2
    `, [paymentResult.channel, reference]);

    // Activate the ad campaign
    const result = await pool.query(`
      UPDATE ad_campaigns
      SET
        payment_required = false,
        payment_completed_at = CURRENT_TIMESTAMP,
        status = 'active',
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [adId]);

    res.json({
      success: true,
      message: 'Payment verified! Your ad is now active!',
      ad: result.rows[0]
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// =====================================================
// 5. AD STATUS MANAGEMENT
// =====================================================

// Start ad (activate a draft ad without payment - for testing/demo purposes)
router.post('/my-ads/:adId/start', async (req, res) => {
  try {
    const { adId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await pool.query(`
      UPDATE ad_campaigns
      SET status = 'active', is_active = true, payment_required = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND status = 'draft'
      RETURNING *
    `, [adId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found or not in draft status' });
    }

    res.json({
      message: 'Ad started successfully',
      ad: result.rows[0]
    });

  } catch (error) {
    console.error('Error starting ad:', error);
    res.status(500).json({ error: 'Failed to start ad' });
  }
});

// Pause ad
router.post('/my-ads/:adId/pause', async (req, res) => {
  try {
    const { adId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await pool.query(`
      UPDATE ad_campaigns
      SET status = 'paused', is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND status = 'active'
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
      UPDATE ad_campaigns
      SET status = 'active', is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND status = 'paused'
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
      UPDATE ad_campaigns
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
      UPDATE ad_campaigns
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
      UPDATE ad_campaigns
      SET conversions = conversions + 1
      WHERE id = $1 AND status = 'active'
    `, [adId]);

    res.json({ message: 'Conversion tracked' });

  } catch (error) {
    console.error('Error tracking conversion:', error);
    res.status(500).json({ error: 'Failed to track conversion' });
  }
});

// =====================================================
// 7. AD TIERS & PLACEMENTS (for business dashboard)
// =====================================================

// Get available tiers for ad creation
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
        t.features,
        json_agg(json_build_object(
          'id', p.id,
          'name', p.name,
          'display_name', p.display_name,
          'page_location', p.page_location,
          'position', p.position,
          'width', p.width,
          'height', p.height
        )) FILTER (WHERE p.id IS NOT NULL) as placements
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

// Get placements for a specific tier
router.get('/placements/:tierId', async (req, res) => {
  try {
    const { tierId } = req.params;

    const result = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.display_name,
        p.description,
        p.page_location,
        p.position,
        p.width,
        p.height,
        p.aspect_ratio,
        p.max_concurrent_ads,
        p.rotation_interval_ms,
        COALESCE(p.custom_price_daily, t.base_price_daily) as price_daily,
        COALESCE(p.custom_price_weekly, t.base_price_weekly) as price_weekly,
        COALESCE(p.custom_price_monthly, t.base_price_monthly) as price_monthly
      FROM ad_placements p
      JOIN ad_space_tiers t ON p.tier_id = t.id
      WHERE p.tier_id = $1 AND p.is_active = true
      ORDER BY p.sort_order
    `, [tierId]);

    res.json({
      placements: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching placements:', error);
    res.status(500).json({ error: 'Failed to fetch placements' });
  }
});

module.exports = router;

