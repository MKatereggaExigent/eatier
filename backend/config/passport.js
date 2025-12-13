const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;

// Use the shared database pool from database.js
const pool = require('./database');

// Helper function to find or create user from OAuth profile
async function findOrCreateOAuthUser(profile, provider) {
  const client = await pool.connect();

  try {
    // Extract email from profile (different providers structure it differently)
    let email = null;
    if (profile.emails && profile.emails.length > 0) {
      email = profile.emails[0].value;
    }

    // Extract name
    const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User';
    const lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '';

    // Get default tenant
    const tenantResult = await client.query(
      "SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1"
    );

    if (tenantResult.rows.length === 0) {
      throw new Error('Default tenant not found');
    }

    const tenantId = tenantResult.rows[0].id;

    // Check if user exists with this OAuth provider ID
    let user = await client.query(
      `SELECT u.*, t.slug as tenant_slug
       FROM users u
       LEFT JOIN tenants t ON u.tenant_id = t.id
       WHERE u.oauth_provider = $1 AND u.oauth_id = $2`,
      [provider, profile.id]
    );

    if (user.rows.length > 0) {
      // User exists, return it
      return user.rows[0];
    }

    // If email exists, check if user with that email already exists
    if (email) {
      user = await client.query(
        `SELECT u.*, t.slug as tenant_slug
         FROM users u
         LEFT JOIN tenants t ON u.tenant_id = t.id
         WHERE u.email = $1`,
        [email]
      );

      if (user.rows.length > 0) {
        // User exists with this email, link OAuth account
        const updatedUser = await client.query(
          `UPDATE users
           SET oauth_provider = $1, oauth_id = $2, updated_at = NOW()
           WHERE id = $3
           RETURNING *`,
          [provider, profile.id, user.rows[0].id]
        );

        const tenantSlug = await client.query(
          'SELECT slug FROM tenants WHERE id = $1',
          [updatedUser.rows[0].tenant_id]
        );

        return {
          ...updatedUser.rows[0],
          tenant_slug: tenantSlug.rows[0].slug
        };
      }
    }

    // Create new user
    const newUser = await client.query(
      `INSERT INTO users (
        email,
        first_name,
        last_name,
        role,
        tenant_id,
        oauth_provider,
        oauth_id,
        email_verified,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
      RETURNING *`,
      [
        email || `${provider}_${profile.id}@oauth.itiyum.com`, // Fallback email if not provided
        firstName,
        lastName,
        'normal_user', // Default role for OAuth users
        tenantId,
        provider,
        profile.id
      ]
    );

    return {
      ...newUser.rows[0],
      tenant_slug: 'itiyum'
    };

  } finally {
    client.release();
  }
}

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
  scope: ['profile', 'email']
},
async (accessToken, refreshToken, profile, done) => {
  try {
    const user = await findOrCreateOAuthUser(profile, 'google');
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Facebook OAuth Strategy
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID || 'dummy-app-id',
  clientSecret: process.env.FACEBOOK_APP_SECRET || 'dummy-app-secret',
  callbackURL: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3001/api/auth/facebook/callback',
  profileFields: ['id', 'displayName', 'emails', 'name']
},
async (accessToken, refreshToken, profile, done) => {
  try {
    const user = await findOrCreateOAuthUser(profile, 'facebook');
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID || 'dummy-client-id',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || 'dummy-client-secret',
  callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3001/api/auth/github/callback',
  scope: ['user:email']
},
async (accessToken, refreshToken, profile, done) => {
  try {
    const user = await findOrCreateOAuthUser(profile, 'github');
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// LinkedIn OAuth Strategy
passport.use(new LinkedInStrategy({
  clientID: process.env.LINKEDIN_CLIENT_ID || 'dummy-client-id',
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET || 'dummy-client-secret',
  callbackURL: process.env.LINKEDIN_CALLBACK_URL || 'http://localhost:3001/api/auth/linkedin/callback',
  scope: ['r_emailaddress', 'r_liteprofile']
},
async (accessToken, refreshToken, profile, done) => {
  try {
    const user = await findOrCreateOAuthUser(profile, 'linkedin');
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT u.*, t.slug as tenant_slug
       FROM users u
       LEFT JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length > 0) {
      done(null, result.rows[0]);
    } else {
      done(new Error('User not found'), null);
    }
  } catch (error) {
    done(error, null);
  } finally {
    client.release();
  }
});

module.exports = passport;

