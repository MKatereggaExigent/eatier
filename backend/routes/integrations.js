/**
 * Integration Routes
 * 
 * Handles third-party integrations for automated data import:
 * - Google My Business
 * - Yelp
 * - Website scraping
 * - POS systems (Square, Toast, Clover)
 * - CSV/Excel imports
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireBusinessOwner } = require('../middleware/auth');
const googleMyBusinessService = require('../services/integrations/google-my-business.service');

// Apply authentication to all routes
router.use(authenticateToken);

// ===================================
// GOOGLE MY BUSINESS INTEGRATION
// ===================================

/**
 * GET /api/integrations/google/auth-url
 * Get Google OAuth authorization URL
 */
router.get('/google/auth-url', requireBusinessOwner, async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    const authUrl = googleMyBusinessService.getAuthorizationUrl(userId, tenantId);

    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * GET /api/integrations/google/callback
 * OAuth callback - exchanges code for token and saves connection
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing authorization code or state' });
    }

    // Decode state to get userId and tenantId
    const { userId, tenantId } = JSON.parse(Buffer.from(state, 'base64').toString());

    // Exchange code for tokens
    const tokens = await googleMyBusinessService.exchangeCodeForToken(code);

    // Get GMB accounts
    const accounts = await googleMyBusinessService.getAccounts(tokens.access_token);

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'No Google My Business accounts found' });
    }

    // Get business ID for this user
    const businessResult = await pool.query(`
      SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    // Save integration connection
    await pool.query(`
      INSERT INTO integration_connections (
        tenant_id, business_id, integration_type, status, credentials, last_sync_at
      ) VALUES ($1, $2, 'google_my_business', 'active', $3, NOW())
      ON CONFLICT (business_id, integration_type) 
      DO UPDATE SET credentials = $3, status = 'active', updated_at = NOW()
    `, [
      tenantId,
      businessId,
      JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000),
        accounts: accounts.map(a => ({ name: a.name, accountName: a.accountName }))
      })
    ]);

    // Redirect to frontend with success message
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/business/integrations?status=success&integration=google`);
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/business/integrations?status=error&integration=google`);
  }
});

/**
 * POST /api/integrations/google/sync
 * Manually trigger sync from Google My Business
 */
router.post('/google/sync', requireBusinessOwner, async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { syncType = 'all' } = req.body; // 'all', 'profile', 'reviews', 'photos'

    // Get business ID
    const businessResult = await pool.query(`
      SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    // Get integration connection
    const connectionResult = await pool.query(`
      SELECT * FROM integration_connections 
      WHERE business_id = $1 AND integration_type = 'google_my_business' AND status = 'active'
    `, [businessId]);

    if (connectionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Google My Business not connected' });
    }

    const connection = connectionResult.rows[0];
    const credentials = connection.credentials;

    // Check if token needs refresh
    let accessToken = credentials.access_token;
    if (new Date(credentials.expires_at) < new Date()) {
      const newTokens = await googleMyBusinessService.refreshAccessToken(credentials.refresh_token);
      accessToken = newTokens.access_token;

      // Update credentials
      credentials.access_token = accessToken;
      credentials.expires_at = new Date(Date.now() + newTokens.expires_in * 1000);

      await pool.query(`
        UPDATE integration_connections SET credentials = $1 WHERE id = $2
      `, [JSON.stringify(credentials), connection.id]);
    }

    // Get first account and location
    const accountName = credentials.accounts[0].name;
    const locations = await googleMyBusinessService.getLocations(accessToken, accountName);

    if (locations.length === 0) {
      return res.status(404).json({ error: 'No locations found in Google My Business' });
    }

    const locationName = locations[0].name;

    // Perform sync based on type
    const results = {};

    if (syncType === 'all' || syncType === 'profile') {
      results.profile = await googleMyBusinessService.importBusinessProfile(
        tenantId, businessId, accessToken, locationName
      );
    }

    if (syncType === 'all' || syncType === 'reviews') {
      results.reviews = await googleMyBusinessService.importReviews(
        tenantId, businessId, accessToken, locationName
      );
    }

    if (syncType === 'all' || syncType === 'photos') {
      results.photos = await googleMyBusinessService.importPhotos(
        tenantId, businessId, accessToken, locationName
      );
    }

    // Update last sync time
    await pool.query(`
      UPDATE integration_connections SET last_sync_at = NOW() WHERE id = $1
    `, [connection.id]);

    // Log sync history
    await pool.query(`
      INSERT INTO sync_history (
        connection_id, sync_type, status, items_synced, started_at, completed_at
      ) VALUES ($1, $2, 'success', $3, NOW(), NOW())
    `, [
      connection.id,
      syncType,
      (results.reviews?.imported || 0) + (results.photos?.imported || 0)
    ]);

    res.json({
      success: true,
      message: 'Sync completed successfully',
      results
    });
  } catch (error) {
    console.error('Error syncing with Google My Business:', error);
    res.status(500).json({ error: 'Failed to sync with Google My Business' });
  }
});

/**
 * GET /api/integrations/status
 * Get status of all integrations for current business
 */
router.get('/status', requireBusinessOwner, async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    // Get business ID
    const businessResult = await pool.query(`
      SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    // Get all integration connections
    const connectionsResult = await pool.query(`
      SELECT 
        integration_type,
        status,
        last_sync_at,
        next_sync_at,
        created_at
      FROM integration_connections
      WHERE business_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC
    `, [businessId, tenantId]);

    // Get recent sync history
    const historyResult = await pool.query(`
      SELECT 
        ic.integration_type,
        sh.sync_type,
        sh.status,
        sh.items_synced,
        sh.items_failed,
        sh.error_message,
        sh.completed_at
      FROM sync_history sh
      JOIN integration_connections ic ON sh.connection_id = ic.id
      WHERE ic.business_id = $1 AND ic.tenant_id = $2
      ORDER BY sh.completed_at DESC
      LIMIT 10
    `, [businessId, tenantId]);

    res.json({
      connections: connectionsResult.rows,
      recentSyncs: historyResult.rows
    });
  } catch (error) {
    console.error('Error fetching integration status:', error);
    res.status(500).json({ error: 'Failed to fetch integration status' });
  }
});

/**
 * DELETE /api/integrations/:type/disconnect
 * Disconnect an integration
 */
router.delete('/:type/disconnect', requireBusinessOwner, async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { type } = req.params;

    // Get business ID
    const businessResult = await pool.query(`
      SELECT id FROM businesses WHERE owner_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessResult.rows[0].id;

    // Delete integration connection
    await pool.query(`
      DELETE FROM integration_connections
      WHERE business_id = $1 AND tenant_id = $2 AND integration_type = $3
    `, [businessId, tenantId, type]);

    res.json({
      success: true,
      message: `${type} integration disconnected successfully`
    });
  } catch (error) {
    console.error('Error disconnecting integration:', error);
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

module.exports = router;

