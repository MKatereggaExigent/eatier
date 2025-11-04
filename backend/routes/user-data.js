const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ===================================
// USER STATISTICS
// ===================================

/**
 * GET /api/users/:userId/stats
 * Get user statistics (reviews, bookings, favorites, photos)
 */
router.get('/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const tenantId = req.user.tenant_id;

    // Verify user can access this data (own data or admin)
    if (req.user.id !== userId && req.user.role !== 'itiyum-admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get review count
    const reviewsResult = await pool.query(`
      SELECT COUNT(*) as count FROM reviews
      WHERE user_id = $1 AND tenant_id = $2 AND status = 'published'
    `, [userId, tenantId]);

    // Get booking count
    const bookingsResult = await pool.query(`
      SELECT COUNT(*) as count FROM bookings
      WHERE user_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    // Get favorites count
    const favoritesResult = await pool.query(`
      SELECT COUNT(*) as count FROM favorites
      WHERE user_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    // Get photos count (from reviews with images)
    const photosResult = await pool.query(`
      SELECT COUNT(*) as count FROM reviews
      WHERE user_id = $1 AND tenant_id = $2 AND images IS NOT NULL AND array_length(images, 1) > 0
    `, [userId, tenantId]);

    res.json({
      totalReviews: parseInt(reviewsResult.rows[0].count),
      totalBookings: parseInt(bookingsResult.rows[0].count),
      totalFavorites: parseInt(favoritesResult.rows[0].count),
      totalPhotos: parseInt(photosResult.rows[0].count)
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// ===================================
// USER ACTIVITY
// ===================================

/**
 * GET /api/users/:userId/activity
 * Get user recent activity (reviews, bookings, favorites)
 */
router.get('/:userId/activity', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    const tenantId = req.user.tenant_id;

    // Verify user can access this data
    if (req.user.id !== userId && req.user.role !== 'itiyum-admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get recent reviews
    const reviewsQuery = `
      SELECT
        r.id,
        'review' as type,
        b.business_name,
        'Wrote a review' as action,
        r.rating,
        r.created_at
      FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      WHERE r.user_id = $1 AND r.tenant_id = $2 AND r.status = 'published'
      ORDER BY r.created_at DESC
      LIMIT $3
    `;

    // Get recent bookings
    const bookingsQuery = `
      SELECT
        bk.id,
        'booking' as type,
        b.business_name,
        'Made a booking' as action,
        bk.status,
        bk.created_at
      FROM bookings bk
      JOIN businesses b ON bk.business_id = b.id
      WHERE bk.user_id = $1 AND bk.tenant_id = $2
      ORDER BY bk.created_at DESC
      LIMIT $3
    `;

    // Get recent favorites
    const favoritesQuery = `
      SELECT
        f.id,
        'favorite' as type,
        b.business_name,
        'Added to favorites' as action,
        f.created_at
      FROM favorites f
      JOIN businesses b ON f.business_id = b.id
      WHERE f.user_id = $1 AND f.tenant_id = $2
      ORDER BY f.created_at DESC
      LIMIT $3
    `;

    // Execute all queries
    const [reviews, bookings, favorites] = await Promise.all([
      pool.query(reviewsQuery, [userId, tenantId, limit]),
      pool.query(bookingsQuery, [userId, tenantId, limit]),
      pool.query(favoritesQuery, [userId, tenantId, limit])
    ]);

    // Combine and sort by date
    const activities = [
      ...reviews.rows,
      ...bookings.rows,
      ...favorites.rows
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
     .slice(0, parseInt(limit));

    res.json({ activities });

  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

// ===================================
// USER FAVORITES
// ===================================

/**
 * GET /api/users/:userId/favorites
 * Get user's favorite businesses
 */
router.get('/:userId/favorites', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const tenantId = req.user.tenant_id;

    // Verify user can access this data
    if (req.user.id !== userId && req.user.role !== 'itiyum-admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(`
      SELECT
        f.id,
        f.user_id,
        f.business_id,
        b.business_name,
        b.business_type,
        b.address,
        (SELECT AVG(rating) FROM reviews WHERE business_id = b.id AND status = 'published') as business_rating,
        f.created_at
      FROM favorites f
      JOIN businesses b ON f.business_id = b.id
      WHERE f.user_id = $1 AND f.tenant_id = $2
      ORDER BY f.created_at DESC
      LIMIT $3 OFFSET $4
    `, [userId, tenantId, limit, offset]);

    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) FROM favorites
      WHERE user_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      favorites: result.rows,
      total: totalCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: result.rows.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

/**
 * POST /api/users/:userId/favorites
 * Add a business to favorites
 */
router.post('/:userId/favorites', async (req, res) => {
  try {
    const { userId } = req.params;
    const { business_id } = req.body;
    const tenantId = req.user.tenant_id;

    // Verify user can modify this data
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!business_id) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    // Check if already favorited
    const existingResult = await pool.query(`
      SELECT id FROM favorites
      WHERE user_id = $1 AND business_id = $2 AND tenant_id = $3
    `, [userId, business_id, tenantId]);

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Business already in favorites' });
    }

    // Add to favorites
    const result = await pool.query(`
      INSERT INTO favorites (user_id, business_id, tenant_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [userId, business_id, tenantId]);

    res.status(201).json({
      message: 'Added to favorites',
      favorite: result.rows[0]
    });

  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

/**
 * DELETE /api/users/:userId/favorites/:favoriteId
 * Remove a business from favorites
 */
router.delete('/:userId/favorites/:favoriteId', async (req, res) => {
  try {
    const { userId, favoriteId } = req.params;
    const tenantId = req.user.tenant_id;

    // Verify user can modify this data
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete favorite
    const result = await pool.query(`
      DELETE FROM favorites
      WHERE id = $1 AND user_id = $2 AND tenant_id = $3
      RETURNING id
    `, [favoriteId, userId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    res.json({ message: 'Removed from favorites' });

  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

module.exports = router;

