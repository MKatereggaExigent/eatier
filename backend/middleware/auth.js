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

    // Get user from database with tenant information and roles
    const result = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.tenant_id,
        u.account_status,
        t.slug as tenant_slug,
        array_agg(DISTINCT r.name) as roles,
        array_agg(DISTINCT p.name) as permissions
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.tenant_id, u.account_status, t.slug
    `, [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Check if account is active
    if (user.account_status !== 'active') {
      return res.status(403).json({
        error: 'Account not active',
        message: `Your account is ${user.account_status}. Please contact support.`
      });
    }

    // Attach user to request with RBAC data
    // Filter out null values from roles/permissions (from LEFT JOIN with no matches)
    const userRoles = (user.roles || []).filter(r => r !== null);
    const userPermissions = (user.permissions || []).filter(p => p !== null);

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      tenant_id: user.tenant_id,
      tenantSlug: user.tenant_slug,
      roles: userRoles.length > 0 ? userRoles : ['Normal User'],
      permissions: userPermissions,
      // For backward compatibility, set primary role
      role: userRoles.length > 0 ? userRoles[0].toLowerCase().replace(/ /g, '_') : 'normal_user'
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

    // Get user from database with RBAC data
    const result = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.tenant_id,
        u.account_status,
        t.slug as tenant_slug,
        array_agg(DISTINCT r.name) as roles,
        array_agg(DISTINCT p.name) as permissions
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.tenant_id, u.account_status, t.slug
    `, [decoded.userId]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      // Filter out null values from roles/permissions (from LEFT JOIN with no matches)
      const userRoles = (user.roles || []).filter(r => r !== null);
      const userPermissions = (user.permissions || []).filter(p => p !== null);

      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        tenant_id: user.tenant_id,
        tenantSlug: user.tenant_slug,
        roles: userRoles.length > 0 ? userRoles : ['Normal User'],
        permissions: userPermissions,
        role: userRoles.length > 0 ? userRoles[0].toLowerCase().replace(/ /g, '_') : 'normal_user'
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

/**
 * Require specific permission(s)
 * Usage: requirePermission('Create Users') or requirePermission(['Create Users', 'Delete Users'])
 */
function requirePermission(requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    const userPermissions = req.user.permissions || [];

    // Check if user has at least one of the required permissions
    const hasPermission = permissions.some(perm => userPermissions.includes(perm));

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required permission(s): ${permissions.join(' or ')}`,
        userPermissions: userPermissions
      });
    }

    next();
  };
}

/**
 * Require specific role(s)
 * Usage: requireRole('Itiyum Admin') or requireRole(['Itiyum Admin', 'Business Owner'])
 */
function requireRole(requiredRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    const userRoles = req.user.roles || [];

    // Check if user has at least one of the required roles
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required role(s): ${roles.join(' or ')}`,
        userRoles: userRoles
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requireBusinessOwner,
  requirePermission,
  requireRole
};

