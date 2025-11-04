const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * Authentication middleware - Verifies JWT token and attaches user to request
 */
async function authenticateToken(req, res, next) {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    const cookieToken = req.cookies?.access_token;

    const token = headerToken || cookieToken;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

    // Get user from database with tenant information
    const result = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.tenant_id,
        u.role,
        t.slug as tenant_slug
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE u.id = $1
    `, [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      tenant_id: user.tenant_id,
      tenantSlug: user.tenant_slug,
      role: user.role || 'normal_user'
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Token expired'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'Internal server error'
    });
  }
}

/**
 * Optional authentication - Attaches user if token is valid, but doesn't require it
 */
async function optionalAuth(req, res, next) {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    const cookieToken = req.cookies?.access_token;

    const token = headerToken || cookieToken;

    if (!token) {
      // No token provided, continue without user
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

    // Get user from database
    const result = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.tenant_id,
        u.role,
        t.slug as tenant_slug
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE u.id = $1
    `, [decoded.userId]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        tenant_id: user.tenant_id,
        tenantSlug: user.tenant_slug,
        role: user.role || 'normal_user'
      };
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
}

/**
 * Require admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  if (req.user.role !== 'itiyum_admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }

  next();
}

/**
 * Require business owner role
 */
function requireBusinessOwner(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  if (req.user.role !== 'business_owner' && req.user.role !== 'itiyum_admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Business owner access required'
    });
  }

  next();
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requireBusinessOwner
};

