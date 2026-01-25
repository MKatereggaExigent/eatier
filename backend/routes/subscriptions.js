const express = require('express');
const pool = require('../config/database');
const paystackService = require('../services/paystackService');
const router = express.Router();

// =====================================================
// SUBSCRIPTION PLANS API
// =====================================================

// Get all subscription plans for a user type
router.get('/plans', async (req, res) => {
  try {
    const { userType } = req.query;
    const tenantSlug = req.headers['x-tenant-slug'] || 'itiyum';

    let query = `
      SELECT sp.*, t.slug as tenant_slug
      FROM subscription_plans sp
      JOIN tenants t ON sp.tenant_id = t.id
      WHERE t.slug = $1 AND sp.is_active = true
    `;
    const params = [tenantSlug];

    if (userType) {
      query += ` AND sp.user_type = $2`;
      params.push(userType);
    }

    query += ` ORDER BY sp.user_type, sp.display_order`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
});

// Get single plan by ID
router.get('/plans/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    const result = await pool.query(`
      SELECT * FROM subscription_plans WHERE id = $1
    `, [planId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    res.status(500).json({ error: 'Failed to fetch subscription plan' });
  }
});

// Get user's current subscription
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(`
      SELECT us.*, sp.name as plan_name, sp.plan_code, sp.features, sp.user_type,
             sp.max_menu_items, sp.max_images, sp.max_locations, sp.advertising_credits
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.json({ subscription: null });
    }

    res.json({ subscription: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Initialize subscription payment with Paystack
router.post('/subscribe', async (req, res) => {
  try {
    const { userId, planId, billingCycle, email, callbackUrl } = req.body;
    const tenantSlug = req.headers['x-tenant-slug'] || 'itiyum';

    if (!userId || !planId || !email) {
      return res.status(400).json({ error: 'userId, planId, and email are required' });
    }

    // Get plan details
    const planResult = await pool.query(`
      SELECT sp.*, t.id as tenant_id
      FROM subscription_plans sp
      JOIN tenants t ON sp.tenant_id = t.id
      WHERE sp.id = $1 AND t.slug = $2
    `, [planId, tenantSlug]);

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const plan = planResult.rows[0];
    const cycle = billingCycle || 'monthly';
    const amount = cycle === 'yearly' ? plan.yearly_price : plan.monthly_price;

    // Free plans - activate immediately
    if (amount === 0 || amount === '0.00') {
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 100); // "Forever" for free plans

      await pool.query(`
        INSERT INTO user_subscriptions (tenant_id, user_id, plan_id, status, billing_cycle, current_price, start_date, end_date, next_billing_date)
        VALUES ($1, $2, $3, 'active', $4, 0, NOW(), $5, NULL)
        ON CONFLICT (user_id) DO UPDATE SET
          plan_id = $3, status = 'active', billing_cycle = $4, current_price = 0,
          start_date = NOW(), end_date = $5, next_billing_date = NULL, updated_at = NOW()
      `, [plan.tenant_id, userId, planId, cycle, endDate]);

      return res.json({
        success: true,
        message: 'Free plan activated successfully',
        subscription: { status: 'active', plan_name: plan.name }
      });
    }

    // Generate unique reference
    const reference = `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Initialize Paystack payment
    const paymentResult = await paystackService.initializeTransaction({
      email,
      amount,
      reference,
      callback_url: callbackUrl || process.env.PAYSTACK_CALLBACK_URL,
      metadata: {
        type: 'subscription',
        user_id: userId,
        plan_id: planId,
        plan_name: plan.name,
        billing_cycle: cycle,
        tenant_id: plan.tenant_id
      }
    });

    // Store pending transaction
    await pool.query(`
      INSERT INTO payment_transactions (tenant_id, user_id, reference, email, amount, currency, status, subscription_id, metadata)
      VALUES ($1, $2, $3, $4, $5, 'ZAR', 'pending', NULL, $6)
    `, [plan.tenant_id, userId, reference, email, amount, { plan_id: planId, billing_cycle: cycle }]);

    res.json({
      success: true,
      authorization_url: paymentResult.authorization_url,
      reference: paymentResult.reference,
      plan: { id: plan.id, name: plan.name, amount, billing_cycle: cycle }
    });
  } catch (error) {
    console.error('Error initializing subscription payment:', error);
    res.status(500).json({ error: 'Failed to initialize subscription payment' });
  }
});

// Activate subscription after successful payment
router.post('/activate', async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ error: 'Payment reference is required' });
    }

    // Verify payment with Paystack
    const paymentResult = await paystackService.verifyTransaction(reference);

    if (paymentResult.status !== 'success') {
      return res.status(400).json({ error: 'Payment not successful', status: paymentResult.status });
    }

    const metadata = paymentResult.metadata;
    if (!metadata || metadata.type !== 'subscription') {
      return res.status(400).json({ error: 'Invalid subscription payment' });
    }

    const { user_id, plan_id, billing_cycle, tenant_id } = metadata;

    // Calculate end date based on billing cycle
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
    const subscriptionResult = await pool.query(`
      INSERT INTO user_subscriptions (
        tenant_id, user_id, plan_id, status, billing_cycle, current_price,
        start_date, end_date, next_billing_date, payment_reference
      )
      VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) DO UPDATE SET
        plan_id = $3, status = 'active', billing_cycle = $4, current_price = $5,
        start_date = $6, end_date = $7, next_billing_date = $8, payment_reference = $9,
        updated_at = NOW()
      RETURNING *
    `, [tenant_id, user_id, plan_id, billing_cycle, paymentResult.amount, startDate, endDate, nextBillingDate, reference]);

    // Update payment transaction
    await pool.query(`
      UPDATE payment_transactions
      SET status = 'success', paid_at = NOW(), subscription_id = $1
      WHERE reference = $2
    `, [subscriptionResult.rows[0].id, reference]);

    // Get plan details for response
    const planResult = await pool.query(`SELECT name, plan_code FROM subscription_plans WHERE id = $1`, [plan_id]);

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      subscription: {
        ...subscriptionResult.rows[0],
        plan_name: planResult.rows[0]?.name,
        plan_code: planResult.rows[0]?.plan_code
      }
    });
  } catch (error) {
    console.error('Error activating subscription:', error);
    res.status(500).json({ error: 'Failed to activate subscription' });
  }
});

// Cancel subscription
router.post('/cancel/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(`
      UPDATE user_subscriptions
      SET status = 'cancelled', cancelled_at = NOW(), auto_renew = false, updated_at = NOW()
      WHERE user_id = $1 AND status = 'active'
      RETURNING *
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    res.json({
      success: true,
      message: 'Subscription cancelled. You will have access until the end of your billing period.',
      subscription: result.rows[0]
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

module.exports = router;

