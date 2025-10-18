const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const router = express.Router();

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

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Email, password, first name, and last name are required'
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

    // Generate JWT token with role information
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: role,
        tenant_id: tenantId
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

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
      token
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

    // Find user with role information
    const result = await client.query(`
      SELECT
        u.id, u.email, u.password_hash, u.first_name, u.last_name, u.phone,
        u.avatar_url, u.status, u.tenant_id, u.role
      FROM users u
      WHERE u.email = $1 AND u.tenant_id = $2
    `, [email, tenantId]);

    if (result.rows.length === 0) {
      client.release();
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check account status
    if (user.status !== 'active') {
      client.release();
      return res.status(403).json({
        error: `Account is ${user.status}`,
        accountStatus: user.status
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      client.release();
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last_login_at timestamp
    await client.query(`
      UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [user.id]);

    // Generate JWT token with role information
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

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
      token
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

// Logout (client-side token removal, but we can log it)
router.post('/logout', (req, res) => {
  // In a more complex setup, you might want to blacklist the token
  res.json({ message: 'Logout successful' });
});

module.exports = router;
