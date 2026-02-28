/**
 * Specialist Reviews API Routes
 * Handles CRUD operations for specialist reviews
 */

const express = require('express');
const pool = require('../config/database');
const router = express.Router();

/**
 * GET /api/specialist-reviews/specialist/:specialistId
 * Get all published reviews for a specialist (PUBLIC endpoint)
 */
router.get('/specialist/:specialistId', async (req, res) => {
  try {
    const { specialistId } = req.params;
    const { page = 1, limit = 20, rating } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        sr.*,
        u.first_name || ' ' || COALESCE(LEFT(u.last_name, 1) || '.', '') as reviewer_name,
        u.profile_image as reviewer_avatar
      FROM specialist_reviews sr
      JOIN users u ON sr.client_id = u.id
      WHERE sr.specialist_id = $1 AND sr.status = 'published'
    `;
    const params = [specialistId];
    let paramIndex = 2;

    if (rating) {
      query += ` AND sr.rating >= $${paramIndex}`;
      params.push(parseInt(rating));
      paramIndex++;
    }

    query += ` ORDER BY sr.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get stats
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as review_count,
        AVG(rating) as average_rating,
        AVG(food_quality_rating) as avg_food_quality,
        AVG(professionalism_rating) as avg_professionalism,
        AVG(communication_rating) as avg_communication,
        AVG(value_rating) as avg_value
      FROM specialist_reviews
      WHERE specialist_id = $1 AND status = 'published'
    `, [specialistId]);

    const stats = statsResult.rows[0];

    res.json({
      reviews: result.rows.map(review => ({
        id: review.id,
        reviewerName: review.reviewer_name,
        reviewerAvatar: review.reviewer_avatar,
        rating: review.rating,
        foodQualityRating: review.food_quality_rating,
        professionalismRating: review.professionalism_rating,
        communicationRating: review.communication_rating,
        valueRating: review.value_rating,
        title: review.title,
        comment: review.comment,
        eventType: review.event_type,
        eventDate: review.event_date,
        guestCount: review.guest_count,
        images: review.images || [],
        helpfulCount: review.helpful_count,
        notHelpfulCount: review.not_helpful_count,
        responseFromSpecialist: review.response_from_specialist,
        responseDate: review.response_date,
        isVerifiedBooking: review.is_verified_booking,
        isFeatured: review.is_featured,
        createdAt: review.created_at
      })),
      stats: {
        averageRating: parseFloat(stats.average_rating) || 0,
        reviewCount: parseInt(stats.review_count) || 0,
        avgFoodQuality: parseFloat(stats.avg_food_quality) || 0,
        avgProfessionalism: parseFloat(stats.avg_professionalism) || 0,
        avgCommunication: parseFloat(stats.avg_communication) || 0,
        avgValue: parseFloat(stats.avg_value) || 0
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(stats.review_count) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching specialist reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews', details: error.message });
  }
});

/**
 * POST /api/specialist-reviews
 * Create a new specialist review
 */
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      specialistId,
      bookingId,
      rating,
      foodQualityRating,
      professionalismRating,
      communicationRating,
      valueRating,
      title,
      comment,
      eventType,
      eventDate,
      guestCount,
      images
    } = req.body;

    if (!userId || !specialistId || !rating || !comment) {
      return res.status(400).json({ 
        error: 'User ID, specialist ID, rating, and comment are required' 
      });
    }

    // Get tenant_id from the specialist
    const specialistResult = await pool.query(
      'SELECT tenant_id FROM users WHERE id = $1',
      [specialistId]
    );

    if (specialistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Specialist not found' });
    }

    const tenantId = specialistResult.rows[0].tenant_id;

    // Check if user already reviewed this specialist (without booking)
    if (!bookingId) {
      const existingReview = await pool.query(
        `SELECT id FROM specialist_reviews
         WHERE specialist_id = $1 AND client_id = $2 AND booking_id IS NULL`,
        [specialistId, userId]
      );
      if (existingReview.rows.length > 0) {
        return res.status(400).json({
          error: 'You have already reviewed this specialist'
        });
      }
    }

    // Check if booking exists and belongs to user (for verified reviews)
    let isVerifiedBooking = false;
    if (bookingId) {
      const bookingCheck = await pool.query(
        'SELECT id FROM specialist_bookings WHERE id = $1 AND client_id = $2',
        [bookingId, userId]
      );
      isVerifiedBooking = bookingCheck.rows.length > 0;
    }

    const result = await pool.query(`
      INSERT INTO specialist_reviews (
        tenant_id, specialist_id, client_id, booking_id,
        rating, food_quality_rating, professionalism_rating,
        communication_rating, value_rating,
        title, comment, event_type, event_date, guest_count,
        images, is_verified_booking, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'published')
      RETURNING *
    `, [
      tenantId, specialistId, userId, bookingId || null,
      rating, foodQualityRating || null, professionalismRating || null,
      communicationRating || null, valueRating || null,
      title || '', comment, eventType || null, eventDate || null, guestCount || null,
      images || [], isVerifiedBooking
    ]);

    const review = result.rows[0];

    // Get reviewer info
    const userResult = await pool.query(
      "SELECT first_name || ' ' || COALESCE(LEFT(last_name, 1) || '.', '') as name FROM users WHERE id = $1",
      [userId]
    );

    res.status(201).json({
      id: review.id,
      reviewerName: userResult.rows[0]?.name || 'Anonymous',
      rating: review.rating,
      foodQualityRating: review.food_quality_rating,
      professionalismRating: review.professionalism_rating,
      communicationRating: review.communication_rating,
      valueRating: review.value_rating,
      title: review.title,
      comment: review.comment,
      eventType: review.event_type,
      eventDate: review.event_date,
      guestCount: review.guest_count,
      images: review.images || [],
      isVerifiedBooking: review.is_verified_booking,
      createdAt: review.created_at
    });
  } catch (error) {
    console.error('Error creating specialist review:', error);
    res.status(500).json({ error: 'Failed to create review', details: error.message });
  }
});

/**
 * PUT /api/specialist-reviews/:reviewId
 * Update a review (only by the owner)
 */
router.put('/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId, rating, title, comment, images } = req.body;

    // Verify ownership
    const ownerCheck = await pool.query(
      'SELECT client_id FROM specialist_reviews WHERE id = $1',
      [reviewId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (ownerCheck.rows[0].client_id !== userId) {
      return res.status(403).json({ error: 'You can only edit your own reviews' });
    }

    const result = await pool.query(`
      UPDATE specialist_reviews SET
        rating = COALESCE($1, rating),
        title = COALESCE($2, title),
        comment = COALESCE($3, comment),
        images = COALESCE($4, images),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [rating, title, comment, images, reviewId]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating specialist review:', error);
    res.status(500).json({ error: 'Failed to update review', details: error.message });
  }
});

/**
 * DELETE /api/specialist-reviews/:reviewId
 * Delete a review (only by the owner)
 */
router.delete('/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.query.userId || req.body.userId;

    const ownerCheck = await pool.query(
      'SELECT client_id FROM specialist_reviews WHERE id = $1',
      [reviewId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (ownerCheck.rows[0].client_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own reviews' });
    }

    await pool.query('DELETE FROM specialist_reviews WHERE id = $1', [reviewId]);
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting specialist review:', error);
    res.status(500).json({ error: 'Failed to delete review', details: error.message });
  }
});

/**
 * POST /api/specialist-reviews/:reviewId/vote
 * Vote on a review (helpful or not)
 */
router.post('/:reviewId/vote', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId, isHelpful } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check existing vote
    const existingVote = await pool.query(
      'SELECT id, is_helpful FROM specialist_review_votes WHERE review_id = $1 AND user_id = $2',
      [reviewId, userId]
    );

    if (existingVote.rows.length > 0) {
      // Update existing vote
      const oldVote = existingVote.rows[0];
      await pool.query(
        'UPDATE specialist_review_votes SET is_helpful = $1 WHERE id = $2',
        [isHelpful, oldVote.id]
      );
      // Update counts
      if (oldVote.is_helpful !== isHelpful) {
        if (isHelpful) {
          await pool.query(
            'UPDATE specialist_reviews SET helpful_count = helpful_count + 1, not_helpful_count = not_helpful_count - 1 WHERE id = $1',
            [reviewId]
          );
        } else {
          await pool.query(
            'UPDATE specialist_reviews SET helpful_count = helpful_count - 1, not_helpful_count = not_helpful_count + 1 WHERE id = $1',
            [reviewId]
          );
        }
      }
    } else {
      // Insert new vote
      await pool.query(
        'INSERT INTO specialist_review_votes (review_id, user_id, is_helpful) VALUES ($1, $2, $3)',
        [reviewId, userId, isHelpful]
      );
      // Update count
      if (isHelpful) {
        await pool.query('UPDATE specialist_reviews SET helpful_count = helpful_count + 1 WHERE id = $1', [reviewId]);
      } else {
        await pool.query('UPDATE specialist_reviews SET not_helpful_count = not_helpful_count + 1 WHERE id = $1', [reviewId]);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error voting on review:', error);
    res.status(500).json({ error: 'Failed to vote on review', details: error.message });
  }
});

/**
 * GET /api/specialist-reviews/user/:userId
 * Get all reviews by a user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT
        sr.*,
        u.first_name || ' ' || u.last_name as specialist_name,
        u.profile_image as specialist_avatar
      FROM specialist_reviews sr
      JOIN users u ON sr.specialist_id = u.id
      WHERE sr.client_id = $1
      ORDER BY sr.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);

    res.json({
      reviews: result.rows.map(r => ({
        id: r.id,
        specialistId: r.specialist_id,
        specialistName: r.specialist_name,
        specialistAvatar: r.specialist_avatar,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        eventType: r.event_type,
        createdAt: r.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews', details: error.message });
  }
});

module.exports = router;

