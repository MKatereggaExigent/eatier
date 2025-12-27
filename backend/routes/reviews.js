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

/**
 * GET /api/reviews/user/:userId
 * Get all reviews by a specific user (for user dashboard)
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Handle guest users
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (userId === 'temp-user' || !uuidRegex.test(userId)) {
      return res.json({
        reviews: [],
        stats: { totalReviews: 0, averageRating: 0, helpfulVotes: 0 },
        pagination: { page: parseInt(page), limit: parseInt(limit), total: 0 }
      });
    }

    let query = `
      SELECT
        r.*,
        b.business_name,
        b.business_type
      FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      WHERE r.user_id = $1
    `;

    const params = [userId];

    if (status && status !== 'all') {
      query += ` AND r.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get stats
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total_reviews,
        AVG(rating)::DECIMAL(3,2) as average_rating,
        SUM(helpful_count) as helpful_votes
      FROM reviews
      WHERE user_id = $1
    `, [userId]);

    const stats = statsResult.rows[0];

    res.json({
      reviews: result.rows.map(r => ({
        id: r.id,
        business_id: r.business_id,
        business_name: r.business_name,
        business_type: r.business_type,
        user_id: r.user_id,
        overall_rating: r.rating,
        food_rating: r.food_rating,
        service_rating: r.service_rating,
        ambiance_rating: r.ambiance_rating,
        value_rating: r.value_rating,
        title: r.title,
        content: r.content || r.comment,
        images: r.images || [],
        photos: r.images || [],
        visit_date: r.visit_date,
        would_recommend: r.would_recommend,
        helpful_votes: r.helpful_count || 0,
        total_votes: (r.helpful_count || 0) + (r.not_helpful_count || 0),
        status: r.status,
        is_verified_visit: r.is_verified_visit || false,
        is_featured: r.is_featured || false,
        created_at: r.created_at,
        updated_at: r.updated_at
      })),
      stats: {
        totalReviews: parseInt(stats.total_reviews) || 0,
        averageRating: parseFloat(stats.average_rating) || 0,
        helpfulVotes: parseInt(stats.helpful_votes) || 0
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(stats.total_reviews) || 0
      }
    });

  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ error: 'Failed to fetch user reviews' });
  }
});

/**
 * POST /api/reviews
 * Create a new review
 */
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      businessId,
      overallRating,
      foodRating,
      serviceRating,
      ambianceRating,
      valueRating,
      title,
      content,
      comment,
      images,
      visitDate,
      dishesOrdered,
      pricePaid,
      partySize,
      occasion,
      wouldRecommend,
      status = 'published'
    } = req.body;

    // Support both overallRating and rating for backward compatibility
    const rating = overallRating || req.body.rating;

    if (!userId || !businessId || !rating) {
      return res.status(400).json({ error: 'User ID, business ID, and rating are required' });
    }

    // Get tenant_id from business
    const businessResult = await pool.query('SELECT tenant_id, business_name FROM businesses WHERE id = $1', [businessId]);
    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    const tenantId = businessResult.rows[0].tenant_id;
    const businessName = businessResult.rows[0].business_name;

    const result = await pool.query(`
      INSERT INTO reviews (
        tenant_id, business_id, user_id, rating, food_rating, service_rating,
        ambiance_rating, value_rating, title, content, comment,
        images, visit_date, would_recommend, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      tenantId, businessId, userId, rating,
      foodRating || null, serviceRating || null,
      ambianceRating || null, valueRating || null,
      title || '', content || comment || '', content || comment || '',
      images || [], visitDate || null, wouldRecommend !== false, status
    ]);

    const r = result.rows[0];

    // Return in the format expected by the frontend
    res.status(201).json({
      id: r.id,
      business_id: r.business_id,
      business_name: businessName,
      user_id: r.user_id,
      overall_rating: r.rating,
      food_rating: r.food_rating,
      service_rating: r.service_rating,
      ambiance_rating: r.ambiance_rating,
      value_rating: r.value_rating,
      title: r.title,
      content: r.content || r.comment,
      images: r.images || [],
      photos: r.images || [],
      visit_date: r.visit_date,
      would_recommend: r.would_recommend,
      helpful_votes: 0,
      total_votes: 0,
      status: r.status,
      is_verified_visit: false,
      is_featured: false,
      created_at: r.created_at,
      updated_at: r.updated_at
    });

  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

/**
 * PUT /api/reviews/:reviewId
 * Update a review (only by the owner)
 */
router.put('/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const {
      userId,
      overallRating,
      foodRating,
      serviceRating,
      ambianceRating,
      valueRating,
      title,
      content,
      comment,
      images,
      visitDate,
      wouldRecommend,
      status
    } = req.body;

    // Support both overallRating and rating for backward compatibility
    const rating = overallRating || req.body.rating;

    // Verify ownership
    const ownerCheck = await pool.query(`
      SELECT r.user_id, b.business_name
      FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      WHERE r.id = $1
    `, [reviewId]);

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    if (ownerCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this review' });
    }
    const businessName = ownerCheck.rows[0].business_name;

    const result = await pool.query(`
      UPDATE reviews SET
        rating = COALESCE($1, rating),
        food_rating = COALESCE($2, food_rating),
        service_rating = COALESCE($3, service_rating),
        ambiance_rating = COALESCE($4, ambiance_rating),
        value_rating = COALESCE($5, value_rating),
        title = COALESCE($6, title),
        content = COALESCE($7, content),
        comment = COALESCE($8, comment),
        images = COALESCE($9, images),
        visit_date = COALESCE($10, visit_date),
        would_recommend = COALESCE($11, would_recommend),
        status = COALESCE($12, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
    `, [
      rating, foodRating, serviceRating, ambianceRating, valueRating,
      title, content || comment, content || comment, images,
      visitDate, wouldRecommend, status, reviewId
    ]);

    const r = result.rows[0];

    // Return in the format expected by the frontend
    res.json({
      id: r.id,
      business_id: r.business_id,
      business_name: businessName,
      user_id: r.user_id,
      overall_rating: r.rating,
      food_rating: r.food_rating,
      service_rating: r.service_rating,
      ambiance_rating: r.ambiance_rating,
      value_rating: r.value_rating,
      title: r.title,
      content: r.content || r.comment,
      images: r.images || [],
      photos: r.images || [],
      visit_date: r.visit_date,
      would_recommend: r.would_recommend,
      helpful_votes: r.helpful_count || 0,
      total_votes: (r.helpful_count || 0) + (r.not_helpful_count || 0),
      status: r.status,
      is_verified_visit: r.is_verified_visit || false,
      is_featured: r.is_featured || false,
      created_at: r.created_at,
      updated_at: r.updated_at
    });

  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

/**
 * DELETE /api/reviews/:reviewId
 * Delete a review (only by the owner)
 */
router.delete('/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId } = req.query;

    // Verify ownership
    const ownerCheck = await pool.query('SELECT user_id FROM reviews WHERE id = $1', [reviewId]);
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    if (ownerCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this review' });
    }

    await pool.query('DELETE FROM reviews WHERE id = $1', [reviewId]);

    res.json({ message: 'Review deleted successfully' });

  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router;

