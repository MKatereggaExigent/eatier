const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/**
 * GET /api/public/stats
 * Get public platform statistics
 * No authentication required - for About page
 */
router.get('/stats', async (req, res) => {
  try {
    // Get real statistics from database
    // Aggregate reviews from both reviews (restaurant) and specialist_reviews tables
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM public.users) as total_users,
        (SELECT COUNT(*) FROM public.businesses) as total_businesses,
        (
          (SELECT COUNT(*) FROM public.reviews WHERE status = 'published') +
          (SELECT COUNT(*) FROM public.specialist_reviews WHERE status = 'published')
        ) as total_reviews,
        (SELECT COUNT(*) FROM public.users u
         JOIN public.user_roles ur ON u.id = ur.user_id
         JOIN public.roles r ON ur.role_id = r.id
         WHERE r.name = 'Specialist') as total_specialists
    `);

    const row = stats.rows[0];

    res.json({
      activeUsers: parseInt(row.total_users) || 0,
      restaurants: parseInt(row.total_businesses) || 0,
      reviews: parseInt(row.total_reviews) || 0,
      specialists: parseInt(row.total_specialists) || 0
    });
  } catch (error) {
    console.error('Error fetching public statistics:', error.message);
    console.error('Error stack:', error.stack);
    console.error('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      details: error.message,
      // Return zeros as fallback
      activeUsers: 0,
      restaurants: 0,
      reviews: 0,
      specialists: 0
    });
  }
});

module.exports = router;

