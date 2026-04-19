const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Import the rate limit tracking from distanceCalculator
// Note: We'll need to export these from distanceCalculator.js
let requestCount = 0;
let lastResetDate = new Date().toDateString();
const DAILY_REQUEST_LIMIT = 1300;

/**
 * GET /api/monitoring/google-maps-usage
 * Returns current Google Maps API usage statistics
 * Only accessible by admins
 */
router.get('/google-maps-usage', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const isAdmin = req.user.role === 'admin' || req.user.role === 'business_owner';
    
    if (!isAdmin) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Only administrators can access this endpoint'
      });
    }

    const today = new Date().toDateString();
    const percentUsed = ((requestCount / DAILY_REQUEST_LIMIT) * 100).toFixed(2);
    const projectedMonthly = requestCount * 30;
    const monthlyLimit = 40000;
    const isOverProjection = projectedMonthly > monthlyLimit;

    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      usage: {
        today: {
          date: today,
          requests: requestCount,
          limit: DAILY_REQUEST_LIMIT,
          remaining: DAILY_REQUEST_LIMIT - requestCount,
          percentUsed: parseFloat(percentUsed),
          status: requestCount < DAILY_REQUEST_LIMIT * 0.8 ? 'HEALTHY' : 
                  requestCount < DAILY_REQUEST_LIMIT ? 'WARNING' : 'LIMIT_REACHED'
        },
        monthly: {
          limit: monthlyLimit,
          projectedUsage: projectedMonthly,
          projectedRemaining: monthlyLimit - projectedMonthly,
          percentProjected: ((projectedMonthly / monthlyLimit) * 100).toFixed(2),
          status: isOverProjection ? 'OVER_PROJECTION' : 'SAFE',
          willExceedFreeTier: isOverProjection
        },
        api: {
          name: 'Google Maps Distance Matrix API',
          freeTierLimit: '40,000 requests/month',
          costAfterFree: '$5 per 1,000 requests',
          currentMonthlyCost: isOverProjection ? 
            `$${(((projectedMonthly - monthlyLimit) / 1000) * 5).toFixed(2)}` : 
            '$0.00 (FREE)'
        }
      },
      recommendations: getRecommendations(requestCount, projectedMonthly, monthlyLimit)
    });

  } catch (error) {
    console.error('Error fetching Google Maps usage:', error);
    res.status(500).json({
      error: 'Failed to fetch usage statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/monitoring/health
 * Basic health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Generate recommendations based on usage
 */
function getRecommendations(daily, projected, limit) {
  const recommendations = [];

  if (daily > DAILY_REQUEST_LIMIT * 0.8) {
    recommendations.push({
      severity: 'WARNING',
      message: 'Daily usage is above 80%. Consider implementing caching for common routes.',
      action: 'Cache frequent restaurant-to-area distances in database'
    });
  }

  if (projected > limit) {
    recommendations.push({
      severity: 'CRITICAL',
      message: 'Projected monthly usage exceeds free tier!',
      action: 'Implement aggressive caching or increase daily limit restrictions'
    });
  }

  if (projected > limit * 0.9) {
    recommendations.push({
      severity: 'WARNING',
      message: 'Approaching free tier limit (90%+)',
      action: 'Monitor closely and prepare caching strategy'
    });
  }

  if (daily < DAILY_REQUEST_LIMIT * 0.3 && projected < limit * 0.5) {
    recommendations.push({
      severity: 'INFO',
      message: 'Usage is healthy. Well within free tier limits.',
      action: 'No action needed. Continue monitoring.'
    });
  }

  return recommendations;
}

module.exports = router;
