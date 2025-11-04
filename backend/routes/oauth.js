const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');

// Helper function to generate JWT token
function generateAccessToken(payload) {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '1h' }
  );
}

// Helper function to handle OAuth callback success
function handleOAuthSuccess(req, res) {
  try {
    const user = req.user;

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
    }

    // Generate JWT token
    const token = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id
    });

    // Set HTTP-only cookie
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000 // 1 hour
    });

    // Determine redirect URL based on role
    let redirectPath = '/';
    switch (user.role) {
      case 'itiyum_admin':
        redirectPath = '/admin/insights/overview';
        break;
      case 'business_owner':
        redirectPath = '/dashboard/business/overview';
        break;
      case 'specialist':
        redirectPath = '/dashboard/specialist/overview';
        break;
      case 'food_enthusiast':
        redirectPath = '/dashboard/food-enthusiast/overview';
        break;
      case 'normal_user':
      default:
        redirectPath = '/dashboard/user/overview';
        break;
    }

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}${redirectPath}?oauth_success=true`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
}

// Helper function to check if provider is configured
function isProviderConfigured(provider) {
  const configs = {
    google: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    facebook: process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET,
    github: process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
    linkedin: process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET
  };
  return configs[provider] || false;
}

// Google OAuth Routes
router.get('/google', (req, res, next) => {
  if (!isProviderConfigured('google')) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_not_configured&message=Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the .env file.`);
  }
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })(req, res, next);
});

router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`
  }),
  handleOAuthSuccess
);

// Facebook OAuth Routes
router.get('/facebook', (req, res, next) => {
  if (!isProviderConfigured('facebook')) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=facebook_not_configured&message=Facebook OAuth is not configured. Please add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to the .env file.`);
  }
  passport.authenticate('facebook', {
    scope: ['email', 'public_profile'],
    session: false
  })(req, res, next);
});

router.get('/facebook/callback',
  passport.authenticate('facebook', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=facebook_auth_failed`
  }),
  handleOAuthSuccess
);

// GitHub OAuth Routes
router.get('/github', (req, res, next) => {
  if (!isProviderConfigured('github')) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=github_not_configured&message=GitHub OAuth is not configured. Please add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to the .env file.`);
  }
  passport.authenticate('github', {
    scope: ['user:email'],
    session: false
  })(req, res, next);
});

router.get('/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=github_auth_failed`
  }),
  handleOAuthSuccess
);

// LinkedIn OAuth Routes
router.get('/linkedin', (req, res, next) => {
  if (!isProviderConfigured('linkedin')) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=linkedin_not_configured&message=LinkedIn OAuth is not configured. Please add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to the .env file.`);
  }
  passport.authenticate('linkedin', {
    scope: ['r_emailaddress', 'r_liteprofile'],
    session: false
  })(req, res, next);
});

router.get('/linkedin/callback',
  passport.authenticate('linkedin', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=linkedin_auth_failed`
  }),
  handleOAuthSuccess
);

// Test endpoint to check OAuth configuration
router.get('/status', (req, res) => {
  const providers = {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    facebook: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
    github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    linkedin: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET)
  };

  res.json({
    message: 'OAuth configuration status',
    providers,
    configured: Object.values(providers).some(v => v)
  });
});

module.exports = router;

