const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// ============================================
// GET /api/system-status
// Public endpoint for system health status
// ============================================
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    const status = {
      overall: 'operational',
      timestamp: new Date().toISOString(),
      services: {},
      uptime: process.uptime(),
      responseTime: 0
    };

    // Check API status (always operational if we reach here)
    status.services.api = {
      status: 'operational',
      message: 'API is responding normally'
    };

    // Check Database connectivity
    try {
      const dbStart = Date.now();
      await pool.query('SELECT 1');
      const dbTime = Date.now() - dbStart;
      
      status.services.database = {
        status: 'operational',
        message: 'Database is connected and responding',
        responseTime: `${dbTime}ms`
      };
    } catch (dbError) {
      console.error('Database health check failed:', dbError);
      status.services.database = {
        status: 'degraded',
        message: 'Database connection issues detected',
        error: process.env.NODE_ENV === 'production' ? 'Connection error' : dbError.message
      };
      status.overall = 'degraded';
    }

    // Check WebSocket status
    try {
      const io = require('../websocket/socketHandler');
      status.services.websocket = {
        status: 'operational',
        message: 'WebSocket server is running'
      };
    } catch (wsError) {
      status.services.websocket = {
        status: 'degraded',
        message: 'WebSocket service may be unavailable'
      };
    }

    // Calculate total response time
    status.responseTime = `${Date.now() - startTime}ms`;

    // Determine overall status
    const serviceStatuses = Object.values(status.services).map(s => s.status);
    if (serviceStatuses.includes('down')) {
      status.overall = 'down';
    } else if (serviceStatuses.includes('degraded')) {
      status.overall = 'degraded';
    }

    res.json(status);

  } catch (error) {
    console.error('System status check failed:', error);
    res.status(503).json({
      overall: 'down',
      timestamp: new Date().toISOString(),
      services: {
        api: {
          status: 'down',
          message: 'API is experiencing issues'
        }
      },
      error: process.env.NODE_ENV === 'production' 
        ? 'Service unavailable' 
        : error.message
    });
  }
});

// ============================================
// GET /api/system-status/uptime
// Get system uptime statistics
// ============================================
router.get('/uptime', async (req, res) => {
  try {
    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeDays = Math.floor(uptimeHours / 24);
    
    res.json({
      uptime: {
        seconds: Math.floor(uptime),
        minutes: Math.floor(uptime / 60),
        hours: uptimeHours,
        days: uptimeDays,
        formatted: formatUptime(uptime)
      },
      startTime: new Date(Date.now() - uptime * 1000).toISOString(),
      currentTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('Uptime check failed:', error);
    res.status(500).json({ error: 'Failed to retrieve uptime' });
  }
});

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

module.exports = router;

