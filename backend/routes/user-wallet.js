const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// ============================================================================
// GET /api/wallet - Get user's wallet
// ============================================================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;

    // Get or create wallet
    let result = await pool.query(
      `SELECT * FROM user_wallets WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    if (result.rows.length === 0) {
      // Create wallet if doesn't exist
      result = await pool.query(
        `INSERT INTO user_wallets (user_id, tenant_id) VALUES ($1, $2) RETURNING *`,
        [userId, tenantId]
      );
    }

    const wallet = result.rows[0];

    res.json({
      id: wallet.id,
      cashbackBalance: parseFloat(wallet.cashback_balance),
      loyaltyPoints: wallet.loyalty_points,
      totalCashbackEarned: parseFloat(wallet.total_cashback_earned),
      totalCashbackUsed: parseFloat(wallet.total_cashback_used),
      totalPointsEarned: wallet.total_points_earned,
      totalPointsUsed: wallet.total_points_used
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

module.exports = router;

