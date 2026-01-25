const express = require('express');
const pool = require('../config/database');
const paystackService = require('../services/paystackService');
const router = express.Router();

// =====================================================
// PREMIUM LISTINGS API
// Revenue stream for featured placements
// =====================================================

// Pricing for premium listings (in ZAR)
const PREMIUM_PRICING = {
  featured_badge: { monthly: 199, yearly: 1990, name: 'Featured Badge', description: 'Stand out with a featured badge in search results' },
  priority_listing: { monthly: 499, yearly: 4990, name: 'Priority Listing', description: 'Appear at the top of search results' },
  spotlight: { monthly: 999, yearly: 9990, name: 'Spotlight', description: 'Featured on homepage and category pages' },
  premium_profile: { monthly: 299, yearly: 2990, name: 'Premium Profile', description: 'Enhanced profile with additional features' }
};

// Get available premium listing options
router.get('/options', (req, res) => {
  const options = Object.entries(PREMIUM_PRICING).map(([key, value]) => ({
    id: key,
    ...value
  }));
  res.json(options);
});

// Initialize premium listing payment
router.post('/purchase', async (req, res) => {
  try {
    const { userId, email, listingType, billingCycle, businessId, specialistId } = req.body;
    const tenantSlug = req.headers['x-tenant-slug'] || 'itiyum';

    if (!userId || !email || !listingType) {
      return res.status(400).json({ error: 'userId, email, and listingType are required' });
    }

    if (!businessId && !specialistId) {
      return res.status(400).json({ error: 'Either businessId or specialistId is required' });
    }

    const pricing = PREMIUM_PRICING[listingType];
    if (!pricing) {
      return res.status(400).json({ error: 'Invalid listing type' });
    }

    const cycle = billingCycle || 'monthly';
    const amount = cycle === 'yearly' ? pricing.yearly : pricing.monthly;
    const durationMonths = cycle === 'yearly' ? 12 : 1;

    // Get tenant ID
    const tenantResult = await pool.query(`SELECT id FROM tenants WHERE slug = $1`, [tenantSlug]);
    const tenantId = tenantResult.rows[0]?.id;

    // Generate unique reference
    const reference = `PL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Initialize Paystack payment
    const paymentResult = await paystackService.initializeTransaction({
      email,
      amount,
      reference,
      callback_url: process.env.PAYSTACK_CALLBACK_URL,
      metadata: {
        type: 'premium_listing',
        user_id: userId,
        business_id: businessId || null,
        specialist_id: specialistId || null,
        listing_type: listingType,
        duration_months: durationMonths,
        tenant_id: tenantId
      }
    });

    // Store pending transaction
    await pool.query(`
      INSERT INTO payment_transactions (tenant_id, user_id, reference, email, amount, currency, status, metadata)
      VALUES ($1, $2, $3, $4, $5, 'ZAR', 'pending', $6)
    `, [tenantId, userId, reference, email, amount, { 
      listing_type: listingType, 
      business_id: businessId, 
      specialist_id: specialistId,
      billing_cycle: cycle 
    }]);

    res.json({
      success: true,
      authorization_url: paymentResult.authorization_url,
      reference: paymentResult.reference,
      listing: { type: listingType, name: pricing.name, amount, billing_cycle: cycle }
    });
  } catch (error) {
    console.error('Error initializing premium listing payment:', error);
    res.status(500).json({ error: 'Failed to initialize payment' });
  }
});

// Get user's active premium listings
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get businesses with premium status
    const businesses = await pool.query(`
      SELECT id, business_name, is_featured, featured_until
      FROM businesses
      WHERE owner_id = $1 AND is_featured = true AND featured_until > NOW()
    `, [userId]);

    // Get specialists with premium status
    const specialists = await pool.query(`
      SELECT id, display_name, is_featured, featured_until
      FROM specialists
      WHERE user_id = $1 AND is_featured = true AND featured_until > NOW()
    `, [userId]);

    res.json({
      businesses: businesses.rows,
      specialists: specialists.rows
    });
  } catch (error) {
    console.error('Error fetching premium listings:', error);
    res.status(500).json({ error: 'Failed to fetch premium listings' });
  }
});

module.exports = router;

