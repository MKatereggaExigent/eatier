const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// ============================================================================
// Helper: Get or create wallet for user
// ============================================================================
async function getOrCreateWallet(client, userId, tenantId) {
  let result = await client.query(
    `SELECT * FROM user_wallets WHERE user_id = $1 AND tenant_id = $2`,
    [userId, tenantId]
  );

  if (result.rows.length === 0) {
    result = await client.query(
      `INSERT INTO user_wallets (user_id, tenant_id) VALUES ($1, $2) RETURNING *`,
      [userId, tenantId]
    );
  }

  return result.rows[0];
}

// ============================================================================
// Helper: Calculate tier based on lifetime spend
// ============================================================================
function calculateTier(lifetimeSpend) {
  if (lifetimeSpend >= 5000) return { tier: 'platinum', progress: 100 };
  if (lifetimeSpend >= 2000) return { tier: 'gold', progress: Math.round((lifetimeSpend - 2000) / 30) };
  if (lifetimeSpend >= 500) return { tier: 'silver', progress: Math.round((lifetimeSpend - 500) / 15) };
  return { tier: 'bronze', progress: Math.round(lifetimeSpend / 5) };
}

// ============================================================================
// GET /api/wallet - Get user's wallet with full details
// ============================================================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;

    const wallet = await getOrCreateWallet(pool, userId, tenantId);

    // Get tier info
    const tierResult = await pool.query(
      `SELECT * FROM wallet_tiers WHERE tenant_id = $1 AND tier_name = $2`,
      [tenantId, wallet.tier || 'bronze']
    );
    const tierInfo = tierResult.rows[0] || null;

    // Get next tier info
    const nextTierResult = await pool.query(
      `SELECT * FROM wallet_tiers WHERE tenant_id = $1 AND tier_order > $2 ORDER BY tier_order LIMIT 1`,
      [tenantId, tierInfo?.tier_order || 1]
    );
    const nextTier = nextTierResult.rows[0] || null;

    res.json({
      id: wallet.id,
      cashbackBalance: parseFloat(wallet.cashback_balance || 0),
      loyaltyPoints: wallet.loyalty_points || 0,
      pendingCashback: parseFloat(wallet.pending_cashback || 0),
      pendingPoints: wallet.pending_points || 0,
      totalCashbackEarned: parseFloat(wallet.total_cashback_earned || 0),
      totalCashbackUsed: parseFloat(wallet.total_cashback_used || 0),
      totalPointsEarned: wallet.total_points_earned || 0,
      totalPointsUsed: wallet.total_points_used || 0,
      totalEarned: parseFloat(wallet.total_cashback_earned || 0) + ((wallet.total_points_earned || 0) / 100),
      totalRedeemed: parseFloat(wallet.total_cashback_used || 0) + ((wallet.total_points_used || 0) / 100),
      referralCode: wallet.referral_code,
      referralCount: wallet.referral_count || 0,
      referralEarnings: parseFloat(wallet.referral_earnings || 0),
      tier: wallet.tier || 'bronze',
      tierProgress: wallet.tier_progress || 0,
      lifetimeSpend: parseFloat(wallet.lifetime_spend || 0),
      status: wallet.status || 'active',
      pointsExpiryDate: wallet.points_expiry_date,
      tierInfo: tierInfo ? {
        name: tierInfo.tier_name,
        cashbackRate: parseFloat(tierInfo.cashback_rate),
        pointsMultiplier: parseFloat(tierInfo.points_multiplier),
        freeDelivery: tierInfo.free_delivery,
        prioritySupport: tierInfo.priority_support,
        exclusiveDeals: tierInfo.exclusive_deals,
        badgeColor: tierInfo.badge_color,
        badgeIcon: tierInfo.badge_icon
      } : null,
      nextTier: nextTier ? {
        name: nextTier.tier_name,
        minSpend: parseFloat(nextTier.min_spend),
        spendToReach: parseFloat(nextTier.min_spend) - parseFloat(wallet.lifetime_spend || 0)
      } : null
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// ============================================================================
// GET /api/wallet/transactions - Get wallet transaction history
// ============================================================================
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { type, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT wt.*, uw.cashback_balance, uw.loyalty_points
      FROM wallet_transactions wt
      JOIN user_wallets uw ON wt.wallet_id = uw.id
      WHERE wt.user_id = $1 AND wt.tenant_id = $2
    `;
    const params = [userId, tenantId];
    let paramIndex = 3;

    if (type) {
      query += ` AND wt.transaction_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ` ORDER BY wt.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      transactions: result.rows.map(tx => ({
        id: tx.id,
        type: tx.transaction_type,
        amountType: tx.amount_type,
        amount: parseFloat(tx.amount),
        referenceType: tx.reference_type,
        referenceId: tx.reference_id,
        balanceAfter: parseFloat(tx.balance_after),
        description: tx.description,
        createdAt: tx.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ============================================================================
// POST /api/wallet/redeem - Redeem wallet credits
// ============================================================================
router.post('/redeem', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { amount, amountType = 'cashback', orderId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Get wallet
    const walletResult = await client.query(
      `SELECT * FROM user_wallets WHERE user_id = $1 AND tenant_id = $2 FOR UPDATE`,
      [userId, tenantId]
    );

    if (walletResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const wallet = walletResult.rows[0];

    // Check balance
    if (amountType === 'cashback' && wallet.cashback_balance < amount) {
      return res.status(400).json({ error: 'Insufficient cashback balance' });
    }
    if (amountType === 'loyalty_points' && wallet.loyalty_points < amount) {
      return res.status(400).json({ error: 'Insufficient loyalty points' });
    }

    // Update wallet
    const newBalance = amountType === 'cashback' 
      ? wallet.cashback_balance - amount 
      : wallet.loyalty_points - amount;

    await client.query(
      `UPDATE user_wallets SET 
        ${amountType === 'cashback' ? 'cashback_balance' : 'loyalty_points'} = $1,
        ${amountType === 'cashback' ? 'total_cashback_used' : 'total_points_used'} = 
        ${amountType === 'cashback' ? 'total_cashback_used' : 'total_points_used'} + $2,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newBalance, amount, wallet.id]
    );

    // Record transaction
    await client.query(
      `INSERT INTO wallet_transactions 
       (wallet_id, user_id, tenant_id, transaction_type, amount_type, amount, reference_type, reference_id, balance_after, description)
       VALUES ($1, $2, $3, 'debit', $4, $5, $6, $7, $8, $9)`,
      [wallet.id, userId, tenantId, amountType, amount, orderId ? 'order' : 'manual', orderId, newBalance, 'Redeemed for order']
    );

    await client.query('COMMIT');

    res.json({
      message: 'Successfully redeemed',
      amountRedeemed: amount,
      newBalance: newBalance
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error redeeming wallet:', error);
    res.status(500).json({ error: 'Failed to redeem' });
  } finally {
    client.release();
  }
});

// ============================================================================
// POST /api/wallet/convert-points - Convert loyalty points to cashback
// ============================================================================
router.post('/convert-points', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { points } = req.body;

    if (!points || points < 100) {
      return res.status(400).json({ error: 'Minimum 100 points required for conversion' });
    }

    const walletResult = await client.query(
      `SELECT * FROM user_wallets WHERE user_id = $1 AND tenant_id = $2 FOR UPDATE`,
      [userId, tenantId]
    );

    if (walletResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const wallet = walletResult.rows[0];

    if (wallet.loyalty_points < points) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    // Conversion rate: 100 points = $1
    const cashbackAmount = points / 100;
    const newPoints = wallet.loyalty_points - points;
    const newCashback = parseFloat(wallet.cashback_balance) + cashbackAmount;

    await client.query(
      `UPDATE user_wallets SET
        loyalty_points = $1,
        cashback_balance = $2,
        total_points_used = total_points_used + $3,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newPoints, newCashback, points, wallet.id]
    );

    // Record debit transaction (points)
    await client.query(
      `INSERT INTO wallet_transactions
       (wallet_id, user_id, tenant_id, transaction_type, amount_type, amount, reference_type, balance_after, description)
       VALUES ($1, $2, $3, 'debit', 'loyalty_points', $4, 'conversion', $5, 'Converted points to cashback')`,
      [wallet.id, userId, tenantId, points, newPoints]
    );

    // Record credit transaction (cashback)
    await client.query(
      `INSERT INTO wallet_transactions
       (wallet_id, user_id, tenant_id, transaction_type, amount_type, amount, reference_type, balance_after, description)
       VALUES ($1, $2, $3, 'credit', 'cashback', $4, 'conversion', $5, 'Cashback from points conversion')`,
      [wallet.id, userId, tenantId, cashbackAmount, newCashback]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Points converted successfully',
      pointsConverted: points,
      cashbackReceived: cashbackAmount,
      newPointsBalance: newPoints,
      newCashbackBalance: newCashback
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error converting points:', error);
    res.status(500).json({ error: 'Failed to convert points' });
  } finally {
    client.release();
  }
});

// ============================================================================
// GET /api/wallet/referral - Get referral info and code
// ============================================================================
router.get('/referral', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;

    const wallet = await getOrCreateWallet(pool, userId, tenantId);

    // Get referral history
    const referralsResult = await pool.query(
      `SELECT rr.*, u.first_name, u.last_name, u.email
       FROM referral_rewards rr
       JOIN users u ON rr.referred_id = u.id
       WHERE rr.referrer_id = $1 AND rr.tenant_id = $2
       ORDER BY rr.created_at DESC
       LIMIT 20`,
      [userId, tenantId]
    );

    res.json({
      referralCode: wallet.referral_code,
      referralCount: wallet.referral_count || 0,
      referralEarnings: parseFloat(wallet.referral_earnings || 0),
      referralLink: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/signup?ref=${wallet.referral_code}`,
      referrals: referralsResult.rows.map(r => ({
        id: r.id,
        referredName: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email?.split('@')[0],
        status: r.status,
        reward: parseFloat(r.referrer_reward),
        credited: r.referrer_credited,
        createdAt: r.created_at,
        completedAt: r.completed_at
      }))
    });
  } catch (error) {
    console.error('Error fetching referral info:', error);
    res.status(500).json({ error: 'Failed to fetch referral info' });
  }
});

// ============================================================================
// POST /api/wallet/apply-referral - Apply a referral code
// ============================================================================
router.post('/apply-referral', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({ error: 'Referral code is required' });
    }

    // Check if user already has a referrer
    const userWalletResult = await client.query(
      `SELECT * FROM user_wallets WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    if (userWalletResult.rows.length > 0 && userWalletResult.rows[0].referred_by) {
      return res.status(400).json({ error: 'You have already used a referral code' });
    }

    // Find referrer by code
    const referrerResult = await client.query(
      `SELECT uw.*, u.first_name, u.last_name FROM user_wallets uw
       JOIN users u ON uw.user_id = u.id
       WHERE uw.referral_code = $1 AND uw.tenant_id = $2`,
      [referralCode.toUpperCase(), tenantId]
    );

    if (referrerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    const referrer = referrerResult.rows[0];

    // Can't refer yourself
    if (referrer.user_id === userId) {
      return res.status(400).json({ error: 'You cannot use your own referral code' });
    }

    // Create or update user's wallet with referrer
    await client.query(
      `INSERT INTO user_wallets (user_id, tenant_id, referred_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, tenant_id)
       DO UPDATE SET referred_by = $3, updated_at = CURRENT_TIMESTAMP`,
      [userId, tenantId, referrer.user_id]
    );

    // Create referral reward record
    await client.query(
      `INSERT INTO referral_rewards (referrer_id, referred_id, tenant_id, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (referrer_id, referred_id) DO NOTHING`,
      [referrer.user_id, userId, tenantId]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Referral code applied successfully',
      referrerName: `${referrer.first_name || ''} ${referrer.last_name || ''}`.trim()
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error applying referral:', error);
    res.status(500).json({ error: 'Failed to apply referral code' });
  } finally {
    client.release();
  }
});

// ============================================================================
// GET /api/wallet/tiers - Get all wallet tiers
// ============================================================================
router.get('/tiers', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const result = await pool.query(
      `SELECT * FROM wallet_tiers WHERE tenant_id = $1 ORDER BY tier_order`,
      [tenantId]
    );

    res.json({
      tiers: result.rows.map(t => ({
        id: t.id,
        name: t.tier_name,
        order: t.tier_order,
        minSpend: parseFloat(t.min_spend),
        cashbackRate: parseFloat(t.cashback_rate),
        pointsMultiplier: parseFloat(t.points_multiplier),
        freeDelivery: t.free_delivery,
        prioritySupport: t.priority_support,
        exclusiveDeals: t.exclusive_deals,
        badgeColor: t.badge_color,
        badgeIcon: t.badge_icon
      }))
    });
  } catch (error) {
    console.error('Error fetching tiers:', error);
    res.status(500).json({ error: 'Failed to fetch tiers' });
  }
});

// ============================================================================
// POST /api/wallet/add-credit (Admin/System use - for order completion, etc.)
// ============================================================================
router.post('/add-credit', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const { amount, amountType = 'cashback', referenceType, referenceId, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const wallet = await getOrCreateWallet(client, userId, tenantId);

    const newBalance = amountType === 'cashback'
      ? parseFloat(wallet.cashback_balance) + amount
      : wallet.loyalty_points + amount;

    await client.query(
      `UPDATE user_wallets SET
        ${amountType === 'cashback' ? 'cashback_balance' : 'loyalty_points'} = $1,
        ${amountType === 'cashback' ? 'total_cashback_earned' : 'total_points_earned'} =
        ${amountType === 'cashback' ? 'total_cashback_earned' : 'total_points_earned'} + $2,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newBalance, amount, wallet.id]
    );

    await client.query(
      `INSERT INTO wallet_transactions
       (wallet_id, user_id, tenant_id, transaction_type, amount_type, amount, reference_type, reference_id, balance_after, description)
       VALUES ($1, $2, $3, 'credit', $4, $5, $6, $7, $8, $9)`,
      [wallet.id, userId, tenantId, amountType, amount, referenceType || 'manual', referenceId, newBalance, description || 'Credit added']
    );

    await client.query('COMMIT');

    res.json({
      message: 'Credit added successfully',
      amountAdded: amount,
      newBalance: newBalance
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding credit:', error);
    res.status(500).json({ error: 'Failed to add credit' });
  } finally {
    client.release();
  }
});

// ============================================================================
// GET /api/wallet/summary - Get wallet summary for dashboard
// ============================================================================
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;

    const wallet = await getOrCreateWallet(pool, userId, tenantId);

    // Get recent transaction count
    const txCountResult = await pool.query(
      `SELECT COUNT(*) as count FROM wallet_transactions
       WHERE user_id = $1 AND tenant_id = $2 AND created_at > NOW() - INTERVAL '30 days'`,
      [userId, tenantId]
    );

    // Get earnings this month
    const monthlyEarningsResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions
       WHERE user_id = $1 AND tenant_id = $2
       AND transaction_type = 'credit'
       AND created_at > DATE_TRUNC('month', CURRENT_DATE)`,
      [userId, tenantId]
    );

    res.json({
      cashbackBalance: parseFloat(wallet.cashback_balance || 0),
      loyaltyPoints: wallet.loyalty_points || 0,
      tier: wallet.tier || 'bronze',
      recentTransactions: parseInt(txCountResult.rows[0].count),
      monthlyEarnings: parseFloat(monthlyEarningsResult.rows[0].total),
      referralCode: wallet.referral_code
    });
  } catch (error) {
    console.error('Error fetching wallet summary:', error);
    res.status(500).json({ error: 'Failed to fetch wallet summary' });
  }
});

module.exports = router;

