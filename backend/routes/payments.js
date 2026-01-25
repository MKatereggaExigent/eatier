/**
 * Payment Routes
 * 
 * Handles Paystack payment gateway operations:
 * - Initialize payments
 * - Verify payments
 * - Handle webhooks
 * - Get payment configuration
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const paystackService = require('../services/paystackService');

/**
 * Get Paystack public key for frontend
 * GET /api/payments/config
 */
router.get('/config', (req, res) => {
  res.json({
    publicKey: process.env.PAYSTACK_PUBLIC_KEY,
    callbackUrl: process.env.PAYSTACK_CALLBACK_URL
  });
});

/**
 * Initialize a payment transaction
 * POST /api/payments/initialize
 */
router.post('/initialize', async (req, res) => {
  try {
    const { email, amount, reference, metadata, callback_url } = req.body;

    if (!email || !amount) {
      return res.status(400).json({ error: 'Email and amount are required' });
    }

    const result = await paystackService.initializeTransaction({
      email,
      amount,
      reference,
      callback_url: callback_url || process.env.PAYSTACK_CALLBACK_URL,
      metadata: metadata || {}
    });

    // Store pending transaction in database
    await pool.query(`
      INSERT INTO payment_transactions (
        reference, email, amount, status, metadata, created_at
      ) VALUES ($1, $2, $3, 'pending', $4, CURRENT_TIMESTAMP)
      ON CONFLICT (reference) DO UPDATE SET
        email = EXCLUDED.email,
        amount = EXCLUDED.amount,
        updated_at = CURRENT_TIMESTAMP
    `, [result.reference, email, amount, JSON.stringify(metadata || {})]);

    res.json(result);
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ error: error.message || 'Failed to initialize payment' });
  }
});

/**
 * Verify a payment transaction
 * GET /api/payments/verify/:reference
 */
router.get('/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;

    const result = await paystackService.verifyTransaction(reference);

    // Update transaction in database
    await pool.query(`
      UPDATE payment_transactions
      SET status = $1, paid_at = $2, channel = $3, updated_at = CURRENT_TIMESTAMP
      WHERE reference = $4
    `, [result.status, result.paid_at, result.channel, reference]);

    res.json(result);
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify payment' });
  }
});

/**
 * Paystack Webhook Handler
 * POST /api/payments/webhook
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const payload = req.body.toString();

    // Validate webhook signature
    if (!paystackService.validateWebhook(signature, payload)) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(payload);
    console.log('Paystack webhook event:', event.event);

    // Handle different event types
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;
      case 'transfer.success':
        await handleTransferSuccess(event.data);
        break;
      case 'transfer.failed':
        await handleTransferFailed(event.data);
        break;
      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle successful charge - Process different payment types
 */
async function handleChargeSuccess(data) {
  const { reference, amount, customer, metadata } = data;

  // Update payment transaction status
  await pool.query(`
    UPDATE payment_transactions
    SET status = 'success',
        paid_at = CURRENT_TIMESTAMP,
        customer_email = $1,
        amount = $2,
        channel = $3,
        updated_at = CURRENT_TIMESTAMP
    WHERE reference = $4
  `, [customer.email, amount / 100, data.channel, reference]);

  console.log(`Payment successful: ${reference} - ${amount / 100}`);

  // Handle based on payment type in metadata
  if (metadata && metadata.type) {
    switch (metadata.type) {
      case 'subscription':
        await handleSubscriptionPayment(data);
        break;
      case 'ad_campaign':
        await handleAdCampaignPayment(data);
        break;
      case 'booking':
        await handleBookingPayment(data);
        break;
      case 'premium_listing':
        await handlePremiumListingPayment(data);
        break;
      default:
        console.log('Unknown payment type:', metadata.type);
    }
  }
}

/**
 * Handle subscription payment activation
 */
async function handleSubscriptionPayment(data) {
  const { reference, amount, metadata } = data;
  const { user_id, plan_id, billing_cycle, tenant_id } = metadata;

  // Calculate subscription dates
  const startDate = new Date();
  const endDate = new Date();
  const nextBillingDate = new Date();

  if (billing_cycle === 'yearly') {
    endDate.setFullYear(endDate.getFullYear() + 1);
    nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  }

  // Create or update subscription
  const result = await pool.query(`
    INSERT INTO user_subscriptions (
      tenant_id, user_id, plan_id, status, billing_cycle, current_price,
      start_date, end_date, next_billing_date, payment_reference
    )
    VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8, $9)
    ON CONFLICT (user_id) DO UPDATE SET
      plan_id = $3, status = 'active', billing_cycle = $4, current_price = $5,
      start_date = $6, end_date = $7, next_billing_date = $8, payment_reference = $9,
      updated_at = NOW()
    RETURNING id
  `, [tenant_id, user_id, plan_id, billing_cycle, amount / 100, startDate, endDate, nextBillingDate, reference]);

  // Link subscription to payment transaction
  await pool.query(`
    UPDATE payment_transactions SET subscription_id = $1 WHERE reference = $2
  `, [result.rows[0].id, reference]);

  console.log(`Subscription activated for user ${user_id}, plan ${plan_id}`);
}

/**
 * Handle ad campaign payment activation
 */
async function handleAdCampaignPayment(data) {
  const { reference, amount, metadata } = data;
  const { ad_campaign_id, user_id, tenant_id } = metadata;

  // Activate the ad campaign
  await pool.query(`
    UPDATE ad_campaigns
    SET payment_required = false,
        payment_completed_at = CURRENT_TIMESTAMP,
        status = 'active',
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [ad_campaign_id]);

  // Link to payment transaction
  await pool.query(`
    UPDATE payment_transactions SET ad_campaign_id = $1 WHERE reference = $2
  `, [ad_campaign_id, reference]);

  console.log(`Ad campaign ${ad_campaign_id} activated after payment`);
}

/**
 * Handle booking payment with commission
 */
async function handleBookingPayment(data) {
  const { reference, metadata } = data;
  const { booking_id } = metadata;

  // Update booking status
  await pool.query(`
    UPDATE bookings
    SET status = 'confirmed',
        confirmed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [booking_id]);

  // Link to payment transaction
  await pool.query(`
    UPDATE payment_transactions SET booking_id = $1 WHERE reference = $2
  `, [booking_id, reference]);

  console.log(`Booking ${booking_id} confirmed after payment`);
}

/**
 * Handle premium listing payment
 */
async function handlePremiumListingPayment(data) {
  const { reference, metadata } = data;
  const { business_id, specialist_id, listing_type, duration_months } = metadata;

  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + (duration_months || 1));

  if (business_id) {
    await pool.query(`
      UPDATE businesses
      SET is_featured = true, featured_until = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [endDate, business_id]);
    console.log(`Business ${business_id} premium listing activated`);
  }

  if (specialist_id) {
    await pool.query(`
      UPDATE specialists
      SET is_featured = true, featured_until = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [endDate, specialist_id]);
    console.log(`Specialist ${specialist_id} premium listing activated`);
  }
}

async function handleTransferSuccess(data) {
  console.log('Transfer successful:', data.reference);
}

async function handleTransferFailed(data) {
  console.log('Transfer failed:', data.reference);
}

/**
 * Get available banks
 * GET /api/payments/banks
 */
router.get('/banks', async (req, res) => {
  try {
    const country = req.query.country || 'south africa';
    const banks = await paystackService.getBanks(country);
    res.json({ banks });
  } catch (error) {
    console.error('Error fetching banks:', error);
    res.status(500).json({ error: 'Failed to fetch banks' });
  }
});

module.exports = router;

