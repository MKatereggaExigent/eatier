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
    const userEmail = req.user.email;

    // Verify user can access this data (own data or admin)
    if (req.user.id !== userId && req.user.role !== 'itiyum-admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get review count (filtered by user_id and tenant_id for proper multi-tenancy)
    const reviewsResult = await pool.query(`
      SELECT COUNT(*) as count FROM reviews
      WHERE user_id = $1 AND tenant_id = $2 AND status = 'published'
    `, [userId, tenantId]);

    // Get booking count (include guest bookings made with user's email)
    const bookingsResult = await pool.query(`
      SELECT COUNT(*) as count FROM bookings
      WHERE (user_id = $1 AND tenant_id = $2)
         OR (user_id IS NULL AND LOWER(contact_email) = LOWER($3))
    `, [userId, tenantId, userEmail]);

    // Get favorites count
    const favoritesResult = await pool.query(`
      SELECT COUNT(*) as count FROM favorites
      WHERE user_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    // Get photos count (from reviews with images - images is JSONB)
    const photosResult = await pool.query(`
      SELECT COUNT(*) as count FROM reviews
      WHERE user_id = $1 AND tenant_id = $2 AND images IS NOT NULL AND jsonb_array_length(images) > 0
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
    const userEmail = req.user.email;

    // Verify user can access this data
    if (req.user.id !== userId && req.user.role !== 'itiyum-admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get recent reviews (filtered by tenant_id for multi-tenancy)
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

    // Get recent bookings (include guest bookings made with user's email)
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
      WHERE (bk.user_id = $1 AND bk.tenant_id = $2)
         OR (bk.user_id IS NULL AND LOWER(bk.contact_email) = LOWER($4))
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
      pool.query(bookingsQuery, [userId, tenantId, limit, userEmail]),
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

    // Query by user_id and tenant_id for proper multi-tenancy
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

    // Check if already favorited (with tenant_id for multi-tenancy)
    const existingResult = await pool.query(`
      SELECT id FROM favorites
      WHERE user_id = $1 AND business_id = $2 AND tenant_id = $3
    `, [userId, business_id, tenantId]);

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Business already in favorites' });
    }

    // Add to favorites with user's tenant_id
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

    // Delete favorite (with tenant_id for multi-tenancy)
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

// ===================================
// USER RECOMMENDATIONS
// ===================================

/**
 * GET /api/users/:userId/recommendations
 * Get personalized restaurant recommendations for user
 */
router.get('/:userId/recommendations', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    const tenantId = req.user.tenant_id;

    // Verify user can access this data
    if (req.user.id !== userId && req.user.role !== 'itiyum-admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get user preferences
    const prefsResult = await pool.query(
      `SELECT cuisine_preferences, dietary_restrictions, price_preference
       FROM user_preferences WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );
    const prefs = prefsResult.rows[0];

    // Get businesses the user has already favorited or reviewed
    const excludeResult = await pool.query(
      `SELECT DISTINCT business_id FROM (
        SELECT business_id FROM favorites WHERE user_id = $1 AND tenant_id = $2
        UNION
        SELECT business_id FROM reviews WHERE user_id = $1 AND tenant_id = $2
      ) excluded`,
      [userId, tenantId]
    );
    const excludeIds = excludeResult.rows.map(r => r.business_id);

    // Build recommendation query
    let query = `
      SELECT
        b.id,
        b.business_name as name,
        b.cuisine_types as cuisine,
        COALESCE(b.cover_image_url, b.profile_photos->0->>'url', b.profile_photos->>0) as image,
        b.address,
        COALESCE(AVG(r.rating), 0) as rating,
        COUNT(DISTINCT r.id) as review_count
      FROM businesses b
      LEFT JOIN reviews r ON b.id = r.business_id AND r.status = 'published'
      WHERE b.account_status = 'active'
        AND b.tenant_id = $1
    `;

    const params = [tenantId];
    let paramIndex = 2;

    // Exclude already interacted businesses
    if (excludeIds.length > 0) {
      query += ` AND b.id != ALL($${paramIndex}::uuid[])`;
      params.push(excludeIds);
      paramIndex++;
    }

    // Filter by cuisine preferences if available
    if (prefs?.cuisine_preferences && prefs.cuisine_preferences.length > 0) {
      query += ` AND b.cuisine_types && $${paramIndex}::text[]`;
      params.push(prefs.cuisine_preferences);
      paramIndex++;
    }

    query += `
      GROUP BY b.id, b.business_name, b.cuisine_types, b.cover_image_url, b.profile_photos, b.address
      ORDER BY rating DESC, review_count DESC
      LIMIT $${paramIndex}
    `;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    const businesses = result.rows.map(b => ({
      id: b.id,
      name: b.name,
      cuisine: Array.isArray(b.cuisine) ? b.cuisine.join(', ') : b.cuisine,
      rating: parseFloat(b.rating) || 0,
      image: b.image,
      address: b.address,
      reviewCount: parseInt(b.review_count) || 0
    }));

    res.json({ businesses });

  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

module.exports = router;

