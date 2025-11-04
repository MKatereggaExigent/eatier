const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const {
  areRegistrationsAllowed,
  getPasswordRequirements,
  getSecuritySettings
} = require('../utils/tenantSettings');
const router = express.Router();

// Helper function to generate access token
async function generateAccessToken(payload, sessionTimeoutMinutes = null) {
  // If sessionTimeoutMinutes is provided, use it; otherwise use env var or default
  const expiresIn = sessionTimeoutMinutes
    ? `${sessionTimeoutMinutes}m`
    : (process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '1h');

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn }
  );
}

// Helper function to generate refresh token
function generateRefreshToken(payload) {
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_TOKEN_SECRET || 'fallback-refresh-secret',
    { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );
}

// Helper function to set auth cookies
function setAuthCookies(res, accessToken, refreshToken, sessionTimeoutMinutes = 60) {
  // Set access token cookie with dynamic timeout
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: sessionTimeoutMinutes * 60 * 1000 // Convert minutes to milliseconds
  });

  // Set refresh token cookie (7 days)
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

// Helper function to clear auth cookies
function clearAuthCookies(res) {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
}

// GET endpoint for password requirements (public)
router.get('/password-requirements', async (req, res) => {
  try {
    const requirements = await getPasswordRequirements();
    res.json(requirements);
  } catch (error) {
    console.error('Error fetching password requirements:', error);
    res.status(500).json({ error: 'Failed to fetch password requirements' });
  }
});

// Helper function to validate password against requirements
function validatePassword(password, requirements) {
  const errors = [];

  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters long`);
  }

  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (requirements.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (requirements.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return errors;
}

// Register new user
router.post('/register', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      country,
      dateOfBirth,
      gender,
      role = 'normal_user',
      businessName
    } = req.body;

    // Check if registrations are allowed
    const registrationsAllowed = await areRegistrationsAllowed();
    if (!registrationsAllowed) {
      return res.status(403).json({
        error: 'Registrations are currently disabled',
        message: 'New user registrations are not allowed at this time. Please contact support for assistance.'
      });
    }

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Email, password, first name, and last name are required'
      });
    }

    // Validate password against requirements
    const passwordRequirements = await getPasswordRequirements();
    const passwordErrors = validatePassword(password, passwordRequirements);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordErrors,
        requirements: passwordRequirements
      });
    }

    // Set tenant context for RLS
    await client.query("SELECT set_tenant_context('itiyum')");

    // Get tenant ID (default to 'itiyum' tenant)
    const tenantResult = await client.query(
      "SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1"
    );

    if (tenantResult.rows.length === 0) {
      return res.status(500).json({ error: 'Tenant not found' });
    }

    const tenantId = tenantResult.rows[0].id;

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
      [email, tenantId]
    );

    if (existingUser.rows.length > 0) {
      client.release();
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with role
    const result = await client.query(`
      INSERT INTO users (
        tenant_id, email, password_hash, first_name, last_name, phone, role, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING id, email, first_name, last_name, phone, role, status, created_at
    `, [
      tenantId, email, hashedPassword, firstName, lastName, phone, role
    ]);

    const user = result.rows[0];

    // If business owner, create business record
    if (role === 'business_owner' && businessName) {
      await client.query(`
        INSERT INTO businesses (
          tenant_id, owner_id, business_name, status
        ) VALUES ($1, $2, $3, 'pending')
      `, [tenantId, user.id, businessName]);
    }

    // Get security settings for session timeout
    const securitySettings = await getSecuritySettings();

    // Generate access and refresh tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: role,
      tenant_id: tenantId
    };

    const accessToken = await generateAccessToken(tokenPayload, securitySettings.sessionTimeout);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set HTTP-only cookies with dynamic session timeout
    setAuthCookies(res, accessToken, refreshToken, securitySettings.sessionTimeout);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        accountStatus: user.status,
        createdAt: user.created_at
      },
      accessToken, // Also send in response for initial setup
      expiresIn: securitySettings.sessionTimeout * 60 // Convert minutes to seconds
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  } finally {
    client.release();
  }
});

// Login user
router.post('/login', async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Set tenant context for RLS
    await client.query("SELECT set_tenant_context('itiyum')");

    // Get tenant ID
    const tenantResult = await client.query(
      "SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1"
    );

    if (tenantResult.rows.length === 0) {
      return res.status(500).json({ error: 'Tenant not found' });
    }

    const tenantId = tenantResult.rows[0].id;

    // Get security settings
    const securitySettings = await getSecuritySettings();

    // Find user with role information and login attempt data
    const result = await client.query(`
      SELECT
        u.id, u.email, u.password_hash, u.first_name, u.last_name, u.phone,
        u.avatar_url, u.status, u.tenant_id, u.role,
        u.failed_login_attempts, u.locked_until
      FROM users u
      WHERE u.email = $1 AND u.tenant_id = $2
    `, [email, tenantId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesRemaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({
        error: 'Account temporarily locked',
        message: `Too many failed login attempts. Account is locked for ${minutesRemaining} more minute(s).`,
        lockedUntil: user.locked_until
      });
    }

    // Check account status
    if (user.status !== 'active') {
      return res.status(403).json({
        error: `Account is ${user.status}`,
        accountStatus: user.status
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      // Increment failed login attempts
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
      let lockedUntil = null;

      // Check if we should lock the account
      if (newFailedAttempts >= securitySettings.maxLoginAttempts) {
        lockedUntil = new Date(Date.now() + securitySettings.lockoutDuration * 60 * 1000);
        await client.query(
          'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
          [newFailedAttempts, lockedUntil, user.id]
        );
        return res.status(423).json({
          error: 'Account locked',
          message: `Too many failed login attempts. Account is locked for ${securitySettings.lockoutDuration} minutes.`,
          lockedUntil
        });
      } else {
        await client.query(
          'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
          [newFailedAttempts, user.id]
        );
        const attemptsRemaining = securitySettings.maxLoginAttempts - newFailedAttempts;
        return res.status(401).json({
          error: 'Invalid email or password',
          attemptsRemaining
        });
      }
    }

    // Successful login - reset failed attempts and locked_until
    await client.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
      [user.id]
    );

    // Update last_login_at timestamp
    await client.query(`
      UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [user.id]);

    // Generate access and refresh tokens with dynamic session timeout
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id
    };

    const accessToken = await generateAccessToken(tokenPayload, securitySettings.sessionTimeout);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set HTTP-only cookies with dynamic session timeout
    setAuthCookies(res, accessToken, refreshToken, securitySettings.sessionTimeout);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        profilePhoto: user.avatar_url,
        accountStatus: user.status,
        role: user.role
      },
      accessToken, // Also send in response for initial setup
      expiresIn: securitySettings.sessionTimeout * 60 // Convert minutes to seconds
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  } finally {
    client.release();
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

    // Get current user data
    const result = await pool.query(`
      SELECT
        id, email, first_name, last_name, is_chef,
        profile_photo, account_status
      FROM users
      WHERE id = $1
    `, [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isChef: user.is_chef,
        profilePhoto: user.profile_photo,
        accountStatus: user.account_status
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

// Refresh access token using refresh token
router.post('/refresh', async (req, res) => {
  try {
    // Get refresh token from cookie or Authorization header
    const refreshToken = req.cookies?.refresh_token || req.headers.authorization?.replace('Bearer ', '');

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_TOKEN_SECRET || 'fallback-refresh-secret'
    );

    // Get current user data from database
    const result = await pool.query(`
      SELECT
        u.id, u.email, u.first_name, u.last_name, u.phone,
        u.avatar_url, u.status, u.tenant_id, u.role
      FROM users u
      WHERE u.id = $1 AND u.status = 'active'
    `, [decoded.userId]);

    if (result.rows.length === 0) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const user = result.rows[0];

    // Generate new access token (and optionally new refresh token)
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Set new cookies
    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.json({
      message: 'Token refreshed successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        profilePhoto: user.avatar_url,
        accountStatus: user.status,
        role: user.role
      },
      accessToken: newAccessToken,
      expiresIn: 3600
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    if (error.name === 'TokenExpiredError') {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Logout - clear cookies
router.post('/logout', (req, res) => {
  clearAuthCookies(res);
  res.json({ message: 'Logout successful' });
});

module.exports = router;
