const express = require('express');
const pool = require('../config/database');
const router = express.Router();

/**
 * GET /api/reviews/business/:businessId
 * Get all published reviews for a specific business (PUBLIC endpoint)
 * Filters by business_id to ensure proper tenant isolation
 */
router.get('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 20, rating } = req.query;
    const offset = (page - 1) * limit;

    // Build query to get reviews for this business only
    let query = `
      SELECT
        r.*,
        u.first_name || ' ' || u.last_name as customer_name,
        u.email as customer_email
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.business_id = $1 AND r.status = 'published'
    `;

    const params = [businessId];

    // Optional filter by rating
    if (rating) {
      query += ` AND r.rating = $${params.length + 1}`;
      params.push(rating);
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) FROM reviews
      WHERE business_id = $1 AND status = 'published'
    `;
    const countParams = [businessId];

    if (rating) {
      countQuery += ` AND rating = $2`;
      countParams.push(rating);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Calculate average rating
    const avgResult = await pool.query(`
      SELECT 
        AVG(rating)::DECIMAL(3,2) as average_rating,
        COUNT(*) as review_count
      FROM reviews
      WHERE business_id = $1 AND status = 'published'
    `, [businessId]);

    const stats = avgResult.rows[0];

    res.json({
      reviews: result.rows.map(review => ({
        id: review.id,
        customerName: review.customer_name,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        images: review.images || [],
        visitDate: review.visit_date,
        wouldRecommend: review.would_recommend,
        helpfulCount: review.helpful_count,
        notHelpfulCount: review.not_helpful_count,
        responseFromOwner: review.response_from_owner,
        responseDate: review.response_date,
        isVerifiedVisit: review.is_verified_visit,
        createdAt: review.created_at,
        updatedAt: review.updated_at
      })),
      stats: {
        averageRating: parseFloat(stats.average_rating) || 0,
        reviewCount: parseInt(stats.review_count) || 0
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        hasMore: result.rows.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/**
 * POST /api/reviews/business/:businessId/vote
 * Vote on a review as helpful or not helpful (PUBLIC endpoint, but requires user to be logged in)
 */
router.post('/business/:businessId/vote', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { reviewId, isHelpful, userId } = req.body;

    if (!reviewId || isHelpful === undefined || !userId) {
      return res.status(400).json({ error: 'Review ID, vote type, and user ID are required' });
    }

    // Check if review belongs to this business
    const reviewCheck = await pool.query(`
      SELECT id FROM reviews WHERE id = $1 AND business_id = $2
    `, [reviewId, businessId]);

    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found for this business' });
    }

    // Insert or update vote
    await pool.query(`
      INSERT INTO review_votes (review_id, user_id, is_helpful)
      VALUES ($1, $2, $3)
      ON CONFLICT (review_id, user_id)
      DO UPDATE SET is_helpful = $3
    `, [reviewId, userId, isHelpful]);

    // Update helpful/not helpful counts
    const countsResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE is_helpful = true) as helpful_count,
        COUNT(*) FILTER (WHERE is_helpful = false) as not_helpful_count
      FROM review_votes
      WHERE review_id = $1
    `, [reviewId]);

    const counts = countsResult.rows[0];

    await pool.query(`
      UPDATE reviews
      SET helpful_count = $1, not_helpful_count = $2
      WHERE id = $3
    `, [counts.helpful_count, counts.not_helpful_count, reviewId]);

    res.json({
      message: 'Vote recorded successfully',
      helpfulCount: parseInt(counts.helpful_count),
      notHelpfulCount: parseInt(counts.not_helpful_count)
    });

  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

module.exports = router;

