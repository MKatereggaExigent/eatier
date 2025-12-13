const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Middleware to verify JWT and get user info
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/specialist/overview
 * Get overview statistics for the logged-in specialist
 */
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get booking statistics
    const bookingStats = await pool.query(`
      SELECT
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
        COUNT(*) FILTER (WHERE status = 'confirmed' AND booking_date >= CURRENT_DATE) as upcoming_bookings,
        COALESCE(SUM(total_price) FILTER (WHERE status = 'completed'), 0) as total_earnings
      FROM specialist_bookings
      WHERE specialist_id = $1
    `, [userId]);

    // Get this month's earnings
    const monthlyEarnings = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as monthly_earnings
      FROM specialist_earnings
      WHERE specialist_id = $1
        AND status = 'paid'
        AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `, [userId]);

    // Get review statistics
    const reviewStats = await pool.query(`
      SELECT
        COUNT(*) as total_reviews,
        COALESCE(AVG(rating), 0) as average_rating
      FROM specialist_reviews
      WHERE specialist_id = $1 AND status = 'published'
    `, [userId]);

    const stats = bookingStats.rows[0];
    const reviews = reviewStats.rows[0];

    res.json({
      totalBookings: parseInt(stats.total_bookings) || 0,
      completedBookings: parseInt(stats.completed_bookings) || 0,
      pendingRequests: parseInt(stats.pending_requests) || 0,
      upcomingBookings: parseInt(stats.upcoming_bookings) || 0,
      totalEarnings: parseFloat(stats.total_earnings) || 0,
      monthlyEarnings: parseFloat(monthlyEarnings.rows[0].monthly_earnings) || 0,
      totalReviews: parseInt(reviews.total_reviews) || 0,
      averageRating: parseFloat(reviews.average_rating) || 0,
      responseRate: 95, // Placeholder - would need response tracking
      repeatClientRate: 0 // Placeholder - would need client tracking
    });

  } catch (error) {
    console.error('Error fetching specialist overview:', error);
    res.status(500).json({ error: 'Failed to fetch overview data' });
  }
});

/**
 * GET /api/specialist/bookings
 * Get bookings for the logged-in specialist
 */
router.get('/bookings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 10 } = req.query;

    let query = `
      SELECT
        sb.*,
        u.first_name || ' ' || u.last_name as client_name,
        u.email as client_email
      FROM specialist_bookings sb
      JOIN users u ON sb.client_id = u.id
      WHERE sb.specialist_id = $1
    `;
    const params = [userId];

    if (status) {
      query += ` AND sb.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY sb.booking_date DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json({ bookings: result.rows });

  } catch (error) {
    console.error('Error fetching specialist bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

/**
 * GET /api/specialist/reviews
 * Get reviews for the logged-in specialist
 */
router.get('/reviews', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const result = await pool.query(`
      SELECT
        sr.*,
        u.first_name || ' ' || u.last_name as client_name
      FROM specialist_reviews sr
      JOIN users u ON sr.client_id = u.id
      WHERE sr.specialist_id = $1 AND sr.status = 'published'
      ORDER BY sr.created_at DESC
      LIMIT $2
    `, [userId, parseInt(limit)]);

    res.json({ reviews: result.rows });

  } catch (error) {
    console.error('Error fetching specialist reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/**
 * GET /api/specialist/earnings
 * Get earnings for the logged-in specialist
 */
router.get('/earnings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const result = await pool.query(`
      SELECT
        se.*,
        sb.event_type,
        u.first_name || ' ' || u.last_name as client_name
      FROM specialist_earnings se
      LEFT JOIN specialist_bookings sb ON se.booking_id = sb.id
      LEFT JOIN users u ON sb.client_id = u.id
      WHERE se.specialist_id = $1
      ORDER BY se.created_at DESC
      LIMIT $2
    `, [userId, parseInt(limit)]);

    res.json({ earnings: result.rows });

  } catch (error) {
    console.error('Error fetching specialist earnings:', error);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

module.exports = router;

