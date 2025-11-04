const { isMaintenanceMode } = require('../utils/tenantSettings');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * Middleware to check if maintenance mode is enabled
 * Blocks all requests except for admin users when maintenance mode is on
 */
async function checkMaintenanceMode(req, res, next) {
  try {
    const maintenanceEnabled = await isMaintenanceMode();

    if (!maintenanceEnabled) {
      // Maintenance mode is off, allow all requests
      return next();
    }

    // Maintenance mode is ON - check if user is admin
    // Try to get token from header or cookie
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    const cookieToken = req.cookies?.access_token;
    const token = headerToken || cookieToken;

    if (token) {
      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

        // Get user role from database
        const client = await pool.connect();
        try {
          const result = await client.query(
            'SELECT role FROM users WHERE id = $1',
            [decoded.userId]
          );

          if (result.rows.length > 0 && result.rows[0].role === 'itiyum_admin') {
            // Allow admin users to access the site during maintenance
            client.release();
            return next();
          }
          client.release();
        } catch (dbError) {
          client.release();
          throw dbError;
        }
      } catch (tokenError) {
        // Invalid token, treat as non-admin
      }
    }

    // Block non-admin users
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'The platform is currently undergoing maintenance. Please try again later.',
      maintenanceMode: true
    });
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    // On error, allow the request to proceed (fail open)
    next();
  }
}

module.exports = checkMaintenanceMode;

