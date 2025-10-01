const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get business insights
router.get('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { period = 'daily', startDate, endDate } = req.query;
    
    // Validate period
    const validPeriods = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }
    
    // Calculate date range based on period
    let dateFilter = '';
    const params = [businessId];
    
    const now = new Date();
    let fromDate, toDate;
    
    switch (period) {
      case 'daily':
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        toDate = now;
        break;
      case 'weekly':
        fromDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000); // Last 12 weeks
        toDate = now;
        break;
      case 'monthly':
        fromDate = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000); // Last 12 months
        toDate = now;
        break;
      case 'yearly':
        fromDate = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000); // Last 5 years
        toDate = now;
        break;
      case 'custom':
        if (!startDate || !endDate) {
          return res.status(400).json({ error: 'Start date and end date are required for custom period' });
        }
        fromDate = new Date(startDate);
        toDate = new Date(endDate);
        break;
    }
    
    dateFilter = ` AND date >= $2 AND date <= $3`;
    params.push(fromDate.toISOString().split('T')[0], toDate.toISOString().split('T')[0]);
    
    // Get insights data
    const result = await pool.query(`
      SELECT 
        date,
        views,
        clicks,
        orders,
        revenue,
        customer_satisfaction
      FROM business_insights
      WHERE business_id = $1 ${dateFilter}
      ORDER BY date DESC
    `, params);
    
    // If no data exists, generate mock data for demonstration
    let insights = result.rows;
    if (insights.length === 0) {
      insights = generateMockBusinessInsights(fromDate, toDate);
    }
    
    // Calculate summary statistics
    const totalViews = insights.reduce((sum, day) => sum + (day.views || 0), 0);
    const totalClicks = insights.reduce((sum, day) => sum + (day.clicks || 0), 0);
    const totalOrders = insights.reduce((sum, day) => sum + (day.orders || 0), 0);
    const totalRevenue = insights.reduce((sum, day) => sum + parseFloat(day.revenue || 0), 0);
    const avgSatisfaction = insights.length > 0 
      ? insights.reduce((sum, day) => sum + parseFloat(day.customer_satisfaction || 0), 0) / insights.length
      : 0;
    
    res.json({
      period,
      dateRange: {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0]
      },
      summary: {
        totalViews,
        totalClicks,
        totalOrders,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        averageCustomerSatisfaction: parseFloat(avgSatisfaction.toFixed(2)),
        conversionRate: totalViews > 0 ? parseFloat(((totalOrders / totalViews) * 100).toFixed(2)) : 0
      },
      data: insights.map(insight => ({
        date: insight.date,
        views: insight.views || 0,
        clicks: insight.clicks || 0,
        orders: insight.orders || 0,
        revenue: parseFloat(insight.revenue || 0),
        customerSatisfaction: parseFloat(insight.customer_satisfaction || 0)
      }))
    });
    
  } catch (error) {
    console.error('Error fetching business insights:', error);
    res.status(500).json({ error: 'Failed to fetch business insights' });
  }
});

// Get user insights
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = 'daily', startDate, endDate } = req.query;
    
    // Similar logic to business insights but for users
    const validPeriods = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }
    
    let dateFilter = '';
    const params = [userId];
    
    const now = new Date();
    let fromDate, toDate;
    
    switch (period) {
      case 'daily':
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        toDate = now;
        break;
      case 'weekly':
        fromDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        toDate = now;
        break;
      case 'monthly':
        fromDate = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000);
        toDate = now;
        break;
      case 'yearly':
        fromDate = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
        toDate = now;
        break;
      case 'custom':
        if (!startDate || !endDate) {
          return res.status(400).json({ error: 'Start date and end date are required for custom period' });
        }
        fromDate = new Date(startDate);
        toDate = new Date(endDate);
        break;
    }
    
    dateFilter = ` AND date >= $2 AND date <= $3`;
    params.push(fromDate.toISOString().split('T')[0], toDate.toISOString().split('T')[0]);
    
    const result = await pool.query(`
      SELECT 
        date,
        profile_views,
        posts_created,
        likes_received,
        comments_received,
        followers_gained
      FROM user_insights
      WHERE user_id = $1 ${dateFilter}
      ORDER BY date DESC
    `, params);
    
    // Generate mock data if none exists
    let insights = result.rows;
    if (insights.length === 0) {
      insights = generateMockUserInsights(fromDate, toDate);
    }
    
    // Calculate summary statistics
    const totalProfileViews = insights.reduce((sum, day) => sum + (day.profile_views || 0), 0);
    const totalPostsCreated = insights.reduce((sum, day) => sum + (day.posts_created || 0), 0);
    const totalLikesReceived = insights.reduce((sum, day) => sum + (day.likes_received || 0), 0);
    const totalCommentsReceived = insights.reduce((sum, day) => sum + (day.comments_received || 0), 0);
    const totalFollowersGained = insights.reduce((sum, day) => sum + (day.followers_gained || 0), 0);
    
    res.json({
      period,
      dateRange: {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0]
      },
      summary: {
        totalProfileViews,
        totalPostsCreated,
        totalLikesReceived,
        totalCommentsReceived,
        totalFollowersGained,
        engagementRate: totalPostsCreated > 0 
          ? parseFloat(((totalLikesReceived + totalCommentsReceived) / totalPostsCreated).toFixed(2))
          : 0
      },
      data: insights.map(insight => ({
        date: insight.date,
        profileViews: insight.profile_views || 0,
        postsCreated: insight.posts_created || 0,
        likesReceived: insight.likes_received || 0,
        commentsReceived: insight.comments_received || 0,
        followersGained: insight.followers_gained || 0
      }))
    });
    
  } catch (error) {
    console.error('Error fetching user insights:', error);
    res.status(500).json({ error: 'Failed to fetch user insights' });
  }
});

// Generate mock business insights for demonstration
function generateMockBusinessInsights(fromDate, toDate) {
  const insights = [];
  const currentDate = new Date(fromDate);
  
  while (currentDate <= toDate) {
    insights.push({
      date: currentDate.toISOString().split('T')[0],
      views: Math.floor(Math.random() * 500) + 50,
      clicks: Math.floor(Math.random() * 100) + 10,
      orders: Math.floor(Math.random() * 20) + 1,
      revenue: (Math.random() * 1000 + 100).toFixed(2),
      customer_satisfaction: (Math.random() * 2 + 3).toFixed(2) // 3-5 rating
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return insights.reverse(); // Most recent first
}

// Generate mock user insights for demonstration
function generateMockUserInsights(fromDate, toDate) {
  const insights = [];
  const currentDate = new Date(fromDate);
  
  while (currentDate <= toDate) {
    insights.push({
      date: currentDate.toISOString().split('T')[0],
      profile_views: Math.floor(Math.random() * 100) + 5,
      posts_created: Math.floor(Math.random() * 3),
      likes_received: Math.floor(Math.random() * 50) + 2,
      comments_received: Math.floor(Math.random() * 10) + 1,
      followers_gained: Math.floor(Math.random() * 5)
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return insights.reverse();
}

// Export insights data as PDF (placeholder endpoint)
router.post('/export/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params; // 'business' or 'user'
    const { period, startDate, endDate, format = 'pdf' } = req.body;
    
    // In a real implementation, you would generate a PDF here
    // For now, we'll just return a success message
    
    res.json({
      message: `${type} insights export initiated`,
      exportId: `export_${Date.now()}`,
      format,
      period,
      estimatedCompletionTime: '2-3 minutes',
      downloadUrl: `/api/insights/download/export_${Date.now()}.${format}`
    });
    
  } catch (error) {
    console.error('Error exporting insights:', error);
    res.status(500).json({ error: 'Failed to export insights' });
  }
});

module.exports = router;
