# Social Login Implementation Guide

## Overview
Complete social authentication system with support for 8 major OAuth providers:
- **Primary Providers**: Google, Facebook, Microsoft, Apple
- **Secondary Providers**: Twitter/X, LinkedIn, GitHub, Instagram

## ✅ Completed Frontend Implementation

### 1. UI Components
- ✅ Glassmorphic social login buttons with brand colors
- ✅ SVG brand logos for all providers
- ✅ Responsive grid layout (2-column primary, 4-column secondary)
- ✅ Hover effects and animations
- ✅ Mobile-responsive design

### 2. TypeScript Integration
- ✅ `loginWithGoogle()`, `loginWithFacebook()`, `loginWithMicrosoft()`, `loginWithApple()`
- ✅ `loginWithTwitter()`, `loginWithLinkedIn()`, `loginWithGitHub()`, `loginWithInstagram()`
- ✅ `AuthService.loginWithSocialProvider()` method
- ✅ Mock social login flow for development
- ✅ User registration and storage

### 3. Current Flow (Development Mode)
1. User clicks social provider button
2. Frontend calls `authService.loginWithSocialProvider(provider)`
3. Mock authentication creates user with provider-specific email
4. User is logged in and redirected to appropriate dashboard
5. User data stored in localStorage

## 🔄 Backend Integration Required

### Database Schema Updates

#### 1. Add Social Authentication Table
```sql
-- Create social_auth table
CREATE TABLE social_auth (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'facebook', etc.
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    profile_data JSONB, -- Store provider-specific profile data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_social_auth_user_id ON social_auth(user_id);
CREATE INDEX idx_social_auth_provider ON social_auth(provider);
```

#### 2. Update Users Table
```sql
-- Add social login fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
```

### Backend API Endpoints

#### 1. OAuth Initialization Endpoints
```javascript
// backend/routes/auth.js

// Google OAuth
router.get('/auth/google', (req, res) => {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent'
    })}`;
    res.json({ authUrl });
});

router.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    // Exchange code for tokens
    // Create/update user in database
    // Return JWT token
});

// Facebook OAuth
router.get('/auth/facebook', (req, res) => {
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID,
        redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
        scope: 'email,public_profile',
        response_type: 'code'
    })}`;
    res.json({ authUrl });
});

// Microsoft OAuth
router.get('/auth/microsoft', (req, res) => {
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid email profile',
        response_mode: 'query'
    })}`;
    res.json({ authUrl });
});

// Apple Sign In
router.get('/auth/apple', (req, res) => {
    const authUrl = `https://appleid.apple.com/auth/authorize?${new URLSearchParams({
        client_id: process.env.APPLE_CLIENT_ID,
        redirect_uri: process.env.APPLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'name email',
        response_mode: 'form_post'
    })}`;
    res.json({ authUrl });
});

// Similar endpoints for Twitter, LinkedIn, GitHub, Instagram
```

#### 2. User Creation/Update Logic
```javascript
// backend/services/socialAuth.js

async function handleSocialLogin(provider, providerData) {
    const { provider_user_id, email, firstName, lastName, avatar } = providerData;
    
    // Check if social auth exists
    let socialAuth = await db.query(
        'SELECT * FROM social_auth WHERE provider = $1 AND provider_user_id = $2',
        [provider, provider_user_id]
    );
    
    let user;
    
    if (socialAuth.rows.length > 0) {
        // Existing social login - get user
        user = await db.query(
            'SELECT * FROM users WHERE id = $1',
            [socialAuth.rows[0].user_id]
        );
        user = user.rows[0];
        
        // Update last login
        await db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );
    } else {
        // Check if email exists
        let existingUser = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        
        if (existingUser.rows.length > 0) {
            // Link existing account to social provider
            user = existingUser.rows[0];
        } else {
            // Create new user
            const result = await db.query(
                `INSERT INTO users (email, first_name, last_name, role, email_verified, avatar, oauth_provider, oauth_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [email, firstName, lastName, 'normal_user', true, avatar, provider, provider_user_id]
            );
            user = result.rows[0];
        }
        
        // Create social auth record
        await db.query(
            `INSERT INTO social_auth (user_id, provider, provider_user_id, access_token, refresh_token, profile_data)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [user.id, provider, provider_user_id, providerData.access_token, providerData.refresh_token, JSON.stringify(providerData)]
        );
    }
    
    // Generate JWT token
    const token = generateJWT(user);
    const refreshToken = generateRefreshToken(user);
    
    return { user, token, refreshToken };
}
```

### Environment Variables

Create `.env` file in backend directory:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_REDIRECT_URI=http://localhost:3000/auth/facebook/callback

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback

# Apple Sign In
APPLE_CLIENT_ID=your_apple_client_id
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_PRIVATE_KEY_PATH=./certs/apple-private-key.p8
APPLE_REDIRECT_URI=http://localhost:3000/auth/apple/callback

# Twitter OAuth 2.0
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_REDIRECT_URI=http://localhost:3000/auth/twitter/callback

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback

# Instagram (via Facebook)
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/auth/instagram/callback
```

### Frontend Service Update

Update `auth.service.ts` to use real OAuth flow:

```typescript
loginWithSocialProvider(provider: string): Observable<AuthResponse> {
    this.setLoading(true);

    // Get OAuth URL from backend
    return this.http.get<{ authUrl: string }>(`${API_URL}/auth/${provider}`).pipe(
        tap(response => {
            // Open OAuth popup or redirect
            const width = 500;
            const height = 600;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;
            
            const popup = window.open(
                response.authUrl,
                `${provider}_oauth`,
                `width=${width},height=${height},left=${left},top=${top}`
            );
            
            // Listen for callback message
            window.addEventListener('message', (event) => {
                if (event.data.type === 'oauth_success') {
                    this.handleAuthSuccess(event.data.authResponse);
                    popup?.close();
                }
            });
        }),
        switchMap(() => {
            // Return observable that resolves when auth completes
            return new Observable<AuthResponse>(observer => {
                const messageHandler = (event: MessageEvent) => {
                    if (event.data.type === 'oauth_success') {
                        observer.next(event.data.authResponse);
                        observer.complete();
                        window.removeEventListener('message', messageHandler);
                    }
                };
                window.addEventListener('message', messageHandler);
            });
        }),
        tap(() => this.setLoading(false))
    );
}
```

## 📋 Setup Checklist

### 1. Provider Setup (Register Apps)
- [ ] Google: https://console.cloud.google.com/
- [ ] Facebook: https://developers.facebook.com/
- [ ] Microsoft: https://portal.azure.com/
- [ ] Apple: https://developer.apple.com/
- [ ] Twitter: https://developer.twitter.com/
- [ ] LinkedIn: https://www.linkedin.com/developers/
- [ ] GitHub: https://github.com/settings/developers
- [ ] Instagram: https://developers.facebook.com/ (via Facebook)

### 2. Database Migration
- [ ] Run social_auth table creation
- [ ] Update users table with OAuth fields
- [ ] Create indexes

### 3. Backend Implementation
- [ ] Install OAuth libraries (`passport`, `passport-google-oauth20`, etc.)
- [ ] Create OAuth routes for all providers
- [ ] Implement callback handlers
- [ ] Add user creation/linking logic
- [ ] Set up environment variables

### 4. Testing
- [ ] Test each provider individually
- [ ] Test account linking (existing email)
- [ ] Test new user creation
- [ ] Test token refresh
- [ ] Test logout and re-login

## 🔒 Security Considerations

1. **HTTPS Required**: All OAuth providers require HTTPS in production
2. **CSRF Protection**: Implement state parameter validation
3. **Token Storage**: Store refresh tokens securely (encrypted in DB)
4. **Scope Limitation**: Request minimal permissions
5. **Token Expiration**: Implement automatic token refresh
6. **Rate Limiting**: Prevent OAuth abuse

## 📊 User Experience Flow

```
User clicks "Sign in with Google"
    ↓
Frontend requests OAuth URL from backend
    ↓
Backend returns authorization URL
    ↓
User redirected to Google login
    ↓
User authorizes app
    ↓
Google redirects to callback URL with code
    ↓
Backend exchanges code for tokens
    ↓
Backend fetches user profile from Google
    ↓
Backend creates/updates user in database
    ↓
Backend creates social_auth record
    ↓
Backend generates JWT token
    ↓
Frontend receives token and user data
    ↓
User logged in and redirected to dashboard
```

## 🎨 Current UI Features

- 4 primary buttons (Google, Facebook, Microsoft, Apple) in 2x2 grid
- 4 secondary buttons (Twitter, LinkedIn, GitHub, Instagram) in compact row
- Glassmorphic design matching login page aesthetic
- Brand-specific hover effects
- SVG logos for professional appearance
- Fully responsive (single column on mobile)
- OAuth 2.0 security badge

## 📝 Next Steps

1. Choose OAuth strategy (popup vs redirect)
2. Register apps with each provider
3. Configure callback URLs
4. Run database migrations
5. Implement backend OAuth routes
6. Test in development
7. Deploy to production with HTTPS
8. Monitor and optimize

## 🆘 Support Resources

- [Google OAuth Guide](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Guide](https://developers.facebook.com/docs/facebook-login/)
- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [Sign in with Apple](https://developer.apple.com/sign-in-with-apple/)
- [Twitter OAuth 2.0](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
- [LinkedIn OAuth](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [GitHub OAuth](https://docs.github.com/en/developers/apps/building-oauth-apps)

---

**Status**: ✅ Frontend Complete | ⏳ Backend Pending | 🔄 Database Ready
