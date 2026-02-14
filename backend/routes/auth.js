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
    // Start transaction to ensure all operations succeed or fail together
    await client.query('BEGIN');

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
      businessName,
      businessType,
      businessAddress,
      businessCountry,
      addressDetails
    } = req.body;

    console.log('=== REGISTRATION REQUEST ===');
    console.log('Email:', email);
    console.log('Role requested:', role);

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

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    let tenantId;
    let businessId = null;

    // Determine tenant based on role
    if (role === 'business_owner') {
      // Business owners get their own tenant (their restaurant)
      if (!businessName) {
        return res.status(400).json({ error: 'Business name is required for business owners' });
      }

      // Create a new tenant for this business
      const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const tenantResult = await client.query(`
        INSERT INTO tenants (name, slug, status)
        VALUES ($1, $2, 'active')
        RETURNING id
      `, [businessName, slug]);

      tenantId = tenantResult.rows[0].id;
    } else if (role === 'itiyum_admin') {
      // Platform admins belong to the Itiyum platform tenant
      const tenantResult = await client.query(
        "SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1"
      );

      if (tenantResult.rows.length === 0) {
        return res.status(500).json({ error: 'Platform tenant not found' });
      }

      tenantId = tenantResult.rows[0].id;
    } else {
      // Normal users, food enthusiasts, specialists belong to platform tenant by default
      // (They can be associated with specific businesses through bookings/posts)
      const tenantResult = await client.query(
        "SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1"
      );

      if (tenantResult.rows.length === 0) {
        return res.status(500).json({ error: 'Platform tenant not found' });
      }

      tenantId = tenantResult.rows[0].id;
    }

    // Create user (without role - will be added via user_roles table)
    const result = await client.query(`
      INSERT INTO users (
        email, password_hash, first_name, last_name, phone, tenant_id, account_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING id, email, first_name, last_name, phone, tenant_id, account_status, created_at
    `, [
      email, hashedPassword, firstName, lastName, phone, tenantId
    ]);

    const user = result.rows[0];
    console.log('User created with ID:', user.id);

    // Map role parameter to database role name
    const roleNameMap = {
      'business_owner': 'Business Owner',
      'food_enthusiast': 'Food Enthusiast',
      'specialist': 'Specialist',
      'itiyum_admin': 'Itiyum Admin',
      'normal_user': 'Normal User'
    };
    const dbRoleName = roleNameMap[role] || 'Normal User';
    console.log('Looking for role in database:', dbRoleName);

    // Assign role to user via user_roles table
    const roleResult = await client.query(
      "SELECT id, name FROM roles WHERE LOWER(name) = LOWER($1) LIMIT 1",
      [dbRoleName]
    );

    console.log('Role lookup result:', roleResult.rows);

    if (roleResult.rows.length > 0) {
      const roleId = roleResult.rows[0].id;
      console.log('Assigning role ID:', roleId, 'to user:', user.id);

      await client.query(`
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
      `, [user.id, roleId]);

      console.log('✅ Role successfully assigned to user');
    } else {
      // Role not found - this is a critical error, log it!
      console.error('❌ CRITICAL: Role not found in database:', dbRoleName);
      console.log('Available roles:');
      const allRoles = await client.query("SELECT id, name FROM roles");
      console.log(allRoles.rows);

      // Try to create the role if it doesn't exist
      console.log('Attempting to create missing role:', dbRoleName);
      const createRoleResult = await client.query(
        "INSERT INTO roles (name, description) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id",
        [dbRoleName, `${dbRoleName} role`]
      );

      if (createRoleResult.rows.length > 0) {
        const newRoleId = createRoleResult.rows[0].id;
        console.log('Created role with ID:', newRoleId);
        await client.query(`
          INSERT INTO user_roles (user_id, role_id)
          VALUES ($1, $2)
        `, [user.id, newRoleId]);
        console.log('✅ Role created and assigned to user');
      }
    }

    // If business owner, create business record
    if (role === 'business_owner' && businessName) {
      const businessResult = await client.query(`
        INSERT INTO businesses (
          owner_id, business_name, business_type, email, phone, country, tenant_id, account_status,
          address, formatted_address, latitude, longitude, place_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        user.id,
        businessName,
        businessType || 'restaurant',
        email,
        phone,
        businessCountry || country || 'South Africa',
        tenantId,
        businessAddress || null,
        addressDetails?.formattedAddress || null,
        addressDetails?.latitude || null,
        addressDetails?.longitude || null,
        addressDetails?.placeId || null
      ]);

      businessId = businessResult.rows[0].id;

      // Create trial subscription for new business (14 days trial period)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);

      await client.query(`
        INSERT INTO business_subscriptions (
          business_id, tenant_id, plan, status, monthly_price, billing_cycle,
          start_date, end_date, features
        ) VALUES ($1, $2, 'trial', 'trial', 0, 'monthly', CURRENT_TIMESTAMP, $3, '{"trial": true, "trial_days": 14}')
      `, [businessId, tenantId, trialEndDate]);
    }

    // Get security settings for session timeout
    const securitySettings = await getSecuritySettings();

    // Generate access and refresh tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: role,
      tenant_id: user.tenant_id
    };

    const accessToken = await generateAccessToken(tokenPayload, securitySettings.sessionTimeout);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set HTTP-only cookies with dynamic session timeout
    setAuthCookies(res, accessToken, refreshToken, securitySettings.sessionTimeout);

    // Get tenant info for response
    const tenantInfo = await client.query(
      'SELECT name, slug FROM tenants WHERE id = $1',
      [tenantId]
    );

    // COMMIT the transaction - this is CRITICAL for persisting the role assignment
    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully - user and role persisted');

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: role,
        accountStatus: user.account_status,
        createdAt: user.created_at,
        tenant: tenantInfo.rows[0]
      },
      ...(businessId && { businessId }),
      accessToken, // Also send in response for initial setup
      expiresIn: securitySettings.sessionTimeout * 60 // Convert minutes to seconds
    });

  } catch (error) {
    // ROLLBACK on any error to prevent partial data from being saved
    await client.query('ROLLBACK');
    console.error('❌ Registration error (transaction rolled back):', error);
    res.status(500).json({ error: 'Failed to register user' });
  } finally {
    client.release();
  }
});

// Login user
router.post('/login', async (req, res) => {
  console.log('=== LOGIN REQUEST ===');
  console.log('Body:', JSON.stringify(req.body));
  console.log('Content-Type:', req.headers['content-type']);

  const client = await pool.connect();
  try {
    const { email, password } = req.body;

    console.log('Email:', email, 'Password length:', password?.length);

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get security settings
    const securitySettings = await getSecuritySettings();

    // Find user with role information, tenant, and login attempt data
    const result = await client.query(`
      SELECT
        u.id, u.email, u.password_hash, u.first_name, u.last_name, u.phone,
        u.profile_photo as avatar_url, u.account_status, u.tenant_id,
        t.slug as tenant_slug,
        array_agg(DISTINCT r.name) as roles
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.email = $1
      GROUP BY u.id, u.email, u.password_hash, u.first_name, u.last_name, u.phone,
               u.profile_photo, u.account_status, u.tenant_id, t.slug
    `, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check account status
    if (user.account_status !== 'active') {
      return res.status(403).json({
        error: `Account is ${user.account_status}`,
        accountStatus: user.account_status
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Update last_login_at timestamp
    await client.query(`
      UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [user.id]);

    // Get primary role for token (filter out null values from LEFT JOIN)
    const userRoles = (user.roles || []).filter(r => r !== null);
    const primaryRole = userRoles.length > 0 ?
      userRoles[0].toLowerCase().replace(/ /g, '_') : 'normal_user';

    // Generate access and refresh tokens with dynamic session timeout
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: primaryRole,
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
        accountStatus: user.account_status,
        role: primaryRole,
        roles: user.roles
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
