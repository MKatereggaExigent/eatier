const express = require('express');
const pool = require('../config/database');
const router = express.Router();

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

module.exports = router;

