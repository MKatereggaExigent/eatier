const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// ============================================================================
// GET /api/recommendations/restaurants - Get personalized restaurant recommendations
// ============================================================================
router.get('/restaurants', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const tenantId = req.user?.tenant_id;
    const { limit = 10, offset = 0 } = req.query;

    let recommendations = [];

    if (userId && tenantId) {
      // ==================== LOGGED-IN USER: PERSONALIZED ====================
      
      // Get user preferences
      const prefsResult = await pool.query(
        `SELECT * FROM user_preferences WHERE user_id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      );
      const prefs = prefsResult.rows[0];

      // Get user's favorite businesses
      const favoritesResult = await pool.query(
        `SELECT business_id FROM favorites WHERE user_id = $1`,
        [userId]
      );
      const favoriteIds = favoritesResult.rows.map(f => f.business_id);

      // Get user's past orders for cuisine preferences
      const ordersResult = await pool.query(
        `SELECT DISTINCT business_id FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [userId]
      );
      const orderedIds = ordersResult.rows.map(o => o.business_id);

      // Build personalized query
      let query = `
        SELECT b.*,
               COALESCE(AVG(r.rating), 0) as avg_rating,
               COUNT(DISTINCT r.id) as review_count,
               CASE
                 WHEN b.id = ANY($2::uuid[]) THEN 10
                 ELSE 0
               END as order_bonus,
               CASE
                 WHEN $3::text[] IS NOT NULL AND b.cuisine_types && $3::text[] THEN 5
                 ELSE 0
               END as cuisine_match
        FROM businesses b
        LEFT JOIN reviews r ON b.id = r.business_id
        WHERE b.account_status = 'active'
          AND b.id NOT IN (SELECT business_id FROM favorites WHERE user_id = $1)
      `;
      const params = [userId, orderedIds, prefs?.cuisine_preferences || []];
      let paramIndex = 4;

      // Filter by price range if set
      if (prefs?.price_range_max) {
        query += ` AND b.price_range <= $${paramIndex}`;
        params.push(prefs.price_range_max);
        paramIndex++;
      }

      query += `
        GROUP BY b.id
        ORDER BY (COALESCE(AVG(r.rating), 0) + order_bonus + cuisine_match) DESC, review_count DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(parseInt(limit), parseInt(offset));

      const result = await pool.query(query, params);
      recommendations = result.rows.map(b => ({
        id: b.id,
        name: b.business_name,
        description: b.description,
        cuisineType: b.cuisine_types,
        priceRange: b.price_range,
        avgRating: parseFloat(b.avg_rating).toFixed(1),
        reviewCount: parseInt(b.review_count),
        logo: b.logo_url,
        address: b.address,
        matchReason: b.cuisine_match > 0 ? 'Matches your cuisine preferences' :
                     b.order_bonus > 0 ? 'Based on your order history' : 'Popular in your area',
        personalized: true
      }));
    } else {
      // ==================== PUBLIC USER: GENERIC POPULAR ====================
      const result = await pool.query(
        `SELECT b.*,
                COALESCE(AVG(r.rating), 0) as avg_rating,
                COUNT(DISTINCT r.id) as review_count
         FROM businesses b
         LEFT JOIN reviews r ON b.id = r.business_id
         WHERE b.account_status = 'active'
         GROUP BY b.id
         ORDER BY avg_rating DESC, review_count DESC
         LIMIT $1 OFFSET $2`,
        [parseInt(limit), parseInt(offset)]
      );

      recommendations = result.rows.map(b => ({
        id: b.id,
        name: b.business_name,
        description: b.description,
        cuisineType: b.cuisine_types,
        priceRange: b.price_range,
        avgRating: parseFloat(b.avg_rating).toFixed(1),
        reviewCount: parseInt(b.review_count),
        logo: b.logo_url,
        address: b.address,
        matchReason: 'Popular restaurant',
        personalized: false
      }));
    }

    res.json({
      recommendations,
      isPersonalized: !!userId,
      loginForBetterRecommendations: !userId
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// ============================================================================
// GET /api/recommendations/trending - Get trending restaurants
// ============================================================================
router.get('/trending', optionalAuth, async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    // Get restaurants with most recent reviews/orders
    const result = await pool.query(
      `SELECT b.*,
              COUNT(DISTINCT r.id) as recent_reviews,
              COALESCE(AVG(r.rating), 0) as avg_rating
       FROM businesses b
       LEFT JOIN reviews r ON b.id = r.business_id AND r.created_at > NOW() - INTERVAL '7 days'
       WHERE b.account_status = 'active'
       GROUP BY b.id
       HAVING COUNT(DISTINCT r.id) > 0
       ORDER BY recent_reviews DESC, avg_rating DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({
      trending: result.rows.map(b => ({
        id: b.id,
        name: b.business_name,
        cuisineType: b.cuisine_types,
        avgRating: parseFloat(b.avg_rating).toFixed(1),
        recentReviews: parseInt(b.recent_reviews),
        logo: b.logo_url
      }))
    });
  } catch (error) {
    console.error('Error fetching trending:', error);
    res.status(500).json({ error: 'Failed to fetch trending' });
  }
});

module.exports = router;

