const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/business/analytics/:businessId
 * Get comprehensive analytics for a specific business
 * RBAC: Business Owner or Itiyum Admin only
 * Multi-tenancy: Enforced via tenant_id check
 */
router.get('/analytics/:businessId', requireRole(['Business Owner', 'Itiyum Admin']), async (req, res) => {
  try {
    const { businessId } = req.params;
    const { period = '7days' } = req.query;
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const userRoles = req.user.roles || [];

    // Verify business ownership or admin access
    const businessCheck = await pool.query(
      `SELECT id, tenant_id, owner_id, business_name 
       FROM businesses 
       WHERE id = $1 AND tenant_id = $2`,
      [businessId, tenantId]
    );

    if (businessCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = businessCheck.rows[0];

    // Check ownership (unless admin)
    if (!userRoles.includes('Itiyum Admin') && business.owner_id !== userId) {
      return res.status(403).json({ error: 'Access denied. You do not own this business.' });
    }

    // Calculate date range based on period
    const { startDate, endDate, days } = calculateDateRange(period);

    // Fetch order metrics
    const orderMetrics = await getOrderMetrics(businessId, tenantId, startDate, endDate);

    // Fetch customer metrics
    const customerMetrics = await getCustomerMetrics(businessId, tenantId, startDate, endDate);

    // Fetch revenue trend data
    const revenueTrend = await getRevenueTrend(businessId, tenantId, startDate, endDate, days);

    // Fetch top menu items
    const topMenuItems = await getTopMenuItems(businessId, tenantId, startDate, endDate);

    // Fetch peak hours
    const peakHours = await getPeakHours(businessId, tenantId, startDate, endDate);

    // Fetch order types distribution
    const ordersByType = await getOrdersByType(businessId, tenantId, startDate, endDate);

    // Calculate growth metrics (compare with previous period)
    const previousPeriod = calculateDateRange(period, true);
    const previousOrderMetrics = await getOrderMetrics(businessId, tenantId, previousPeriod.startDate, previousPeriod.endDate);
    const previousCustomerMetrics = await getCustomerMetrics(businessId, tenantId, previousPeriod.startDate, previousPeriod.endDate);

    const revenueGrowth = calculateGrowth(orderMetrics.totalRevenue, previousOrderMetrics.totalRevenue);
    const orderGrowth = calculateGrowth(orderMetrics.totalOrders, previousOrderMetrics.totalOrders);
    const customerGrowth = calculateGrowth(customerMetrics.totalCustomers, previousCustomerMetrics.totalCustomers);

    // Compile analytics response
    const analytics = {
      orderMetrics,
      customerMetrics,
      revenue: revenueTrend,
      topMenuItems,
      peakHours,
      ordersByType,
      revenueGrowth,
      orderGrowth,
      customerGrowth
    };

    res.json(analytics);

  } catch (error) {
    console.error('Error fetching business analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// ===================================
// HELPER FUNCTIONS
// ===================================

function calculateDateRange(period, isPrevious = false) {
  const endDate = new Date();
  let days;

  switch (period) {
    case '7days':
      days = 7;
      break;
    case '30days':
      days = 30;
      break;
    case '90days':
      days = 90;
      break;
    case '12months':
      days = 365;
      break;
    default:
      days = 7;
  }

  if (isPrevious) {
    endDate.setDate(endDate.getDate() - days);
  }

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    days
  };
}

function calculateGrowth(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

async function getOrderMetrics(businessId, tenantId, startDate, endDate) {
  const result = await pool.query(
    `SELECT 
       COUNT(*) as total_orders,
       COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
       COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
       COUNT(*) FILTER (WHERE status IN ('pending', 'preparing')) as pending_orders,
       COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) as total_revenue,
       COALESCE(AVG(total_amount) FILTER (WHERE status = 'completed'), 0) as average_order_value
     FROM orders
     WHERE business_id = $1 
       AND tenant_id = $2
       AND created_at >= $3 
       AND created_at <= $4`,
    [businessId, tenantId, startDate, endDate + ' 23:59:59']
  );

  const row = result.rows[0];
  return {
    totalOrders: parseInt(row.total_orders) || 0,
    completedOrders: parseInt(row.completed_orders) || 0,
    cancelledOrders: parseInt(row.cancelled_orders) || 0,
    pendingOrders: parseInt(row.pending_orders) || 0,
    totalRevenue: parseFloat(row.total_revenue) || 0,
    averageOrderValue: parseFloat(row.average_order_value) || 0
  };
}

async function getCustomerMetrics(businessId, tenantId, startDate, endDate) {
  // Get total unique customers
  const totalCustomersResult = await pool.query(
    `SELECT COUNT(DISTINCT COALESCE(user_id::text, guest_email)) as total_customers
     FROM orders
     WHERE business_id = $1
       AND tenant_id = $2
       AND created_at >= $3
       AND created_at <= $4
       AND status = 'completed'`,
    [businessId, tenantId, startDate, endDate + ' 23:59:59']
  );

  // Get new vs returning customers
  const customerTypeResult = await pool.query(
    `WITH customer_orders AS (
       SELECT
         COALESCE(user_id::text, guest_email) as customer_id,
         MIN(created_at) as first_order_date,
         COUNT(*) as order_count
       FROM orders
       WHERE business_id = $1
         AND tenant_id = $2
         AND status = 'completed'
       GROUP BY COALESCE(user_id::text, guest_email)
     )
     SELECT
       COUNT(*) FILTER (WHERE first_order_date >= $3 AND first_order_date <= $4) as new_customers,
       COUNT(*) FILTER (WHERE first_order_date < $3 AND order_count > 1) as returning_customers
     FROM customer_orders
     WHERE customer_id IN (
       SELECT DISTINCT COALESCE(user_id::text, guest_email)
       FROM orders
       WHERE business_id = $1
         AND tenant_id = $2
         AND created_at >= $3
         AND created_at <= $4
         AND status = 'completed'
     )`,
    [businessId, tenantId, startDate, endDate + ' 23:59:59']
  );

  // Calculate average order value
  const aovResult = await pool.query(
    `SELECT COALESCE(AVG(total_amount), 0) as average_order_value
     FROM orders
     WHERE business_id = $1
       AND tenant_id = $2
       AND created_at >= $3
       AND created_at <= $4
       AND status = 'completed'`,
    [businessId, tenantId, startDate, endDate + ' 23:59:59']
  );

  const totalCustomers = parseInt(totalCustomersResult.rows[0].total_customers) || 0;
  const newCustomers = parseInt(customerTypeResult.rows[0].new_customers) || 0;
  const returningCustomers = parseInt(customerTypeResult.rows[0].returning_customers) || 0;
  const averageOrderValue = parseFloat(aovResult.rows[0].average_order_value) || 0;
  const customerRetentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

  return {
    totalCustomers,
    newCustomers,
    returningCustomers,
    averageOrderValue,
    customerRetentionRate
  };
}

async function getRevenueTrend(businessId, tenantId, startDate, endDate, days) {
  const result = await pool.query(
    `SELECT
       DATE(created_at) as date,
       COUNT(*) as orders,
       COALESCE(SUM(total_amount), 0) as revenue
     FROM orders
     WHERE business_id = $1
       AND tenant_id = $2
       AND created_at >= $3
       AND created_at <= $4
       AND status = 'completed'
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [businessId, tenantId, startDate, endDate + ' 23:59:59']
  );

  // Fill in missing dates with zero values
  const revenueMap = new Map();
  result.rows.forEach(row => {
    revenueMap.set(row.date.toISOString().split('T')[0], {
      date: row.date.toISOString().split('T')[0],
      orders: parseInt(row.orders),
      revenue: parseFloat(row.revenue)
    });
  });

  const trend = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    trend.push(revenueMap.get(dateStr) || {
      date: dateStr,
      orders: 0,
      revenue: 0
    });
  }

  return trend;
}

async function getTopMenuItems(businessId, tenantId, startDate, endDate) {
  const result = await pool.query(
    `SELECT
       m.id,
       m.name,
       COUNT(oi.id) as orders,
       COALESCE(SUM(oi.unit_price * oi.quantity), 0) as revenue,
       m.image_url as image
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     JOIN menu_items m ON oi.menu_item_id = m.id
     WHERE o.business_id = $1
       AND o.tenant_id = $2
       AND o.created_at >= $3
       AND o.created_at <= $4
       AND o.status = 'completed'
     GROUP BY m.id, m.name, m.image_url
     ORDER BY orders DESC
     LIMIT 5`,
    [businessId, tenantId, startDate, endDate + ' 23:59:59']
  );

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    orders: parseInt(row.orders),
    revenue: parseFloat(row.revenue),
    image: row.image || ''
  }));
}

async function getPeakHours(businessId, tenantId, startDate, endDate) {
  const result = await pool.query(
    `SELECT
       EXTRACT(HOUR FROM created_at) as hour,
       COUNT(*) as orders
     FROM orders
     WHERE business_id = $1
       AND tenant_id = $2
       AND created_at >= $3
       AND created_at <= $4
       AND status = 'completed'
     GROUP BY EXTRACT(HOUR FROM created_at)
     ORDER BY orders DESC
     LIMIT 5`,
    [businessId, tenantId, startDate, endDate + ' 23:59:59']
  );

  return result.rows.map(row => ({
    hour: parseInt(row.hour),
    orders: parseInt(row.orders)
  }));
}

async function getOrdersByType(businessId, tenantId, startDate, endDate) {
  const result = await pool.query(
    `SELECT
       COALESCE(order_type, 'Delivery') as type,
       COUNT(*) as count
     FROM orders
     WHERE business_id = $1
       AND tenant_id = $2
       AND created_at >= $3
       AND created_at <= $4
       AND status = 'completed'
     GROUP BY order_type`,
    [businessId, tenantId, startDate, endDate + ' 23:59:59']
  );

  const total = result.rows.reduce((sum, row) => sum + parseInt(row.count), 0);

  return result.rows.map(row => ({
    type: row.type.charAt(0).toUpperCase() + row.type.slice(1),
    count: parseInt(row.count),
    percentage: total > 0 ? (parseInt(row.count) / total) * 100 : 0
  }));
}

module.exports = router;

