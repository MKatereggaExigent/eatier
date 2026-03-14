# OAuth 2.0 Social Authentication Setup Guide

This guide will help you configure OAuth 2.0 social authentication for the Itiyum platform.

## ✅ What's Already Implemented

The OAuth infrastructure is **fully implemented** and ready to use. You just need to configure the OAuth credentials for each provider.

### Implemented Features:
- ✅ **Backend OAuth Routes** (`backend/routes/oauth.js`)
- ✅ **Passport.js Configuration** (`backend/config/passport.js`)
- ✅ **Database Schema** (OAuth columns added to users table)
- ✅ **Frontend Integration** (Login buttons redirect to OAuth endpoints)
- ✅ **Automatic User Creation** (Creates new users or links existing accounts)
- ✅ **JWT Token Generation** (After successful OAuth)
- ✅ **Role-based Redirects** (Redirects to appropriate dashboard based on user role)

### Supported Providers:
1. ✅ **Google OAuth 2.0** - Fully implemented
2. ✅ **Facebook OAuth** - Fully implemented
3. ✅ **GitHub OAuth** - Fully implemented
4. ✅ **LinkedIn OAuth** - Fully implemented
5. ⏳ **Microsoft OAuth** - Infrastructure ready, needs credentials
6. ⏳ **Apple Sign In** - Infrastructure ready, needs credentials
7. ⏳ **Twitter/X OAuth** - Infrastructure ready, needs credentials
8. ⏳ **Instagram OAuth** - Infrastructure ready, needs credentials

---

## 🔧 Configuration Steps

### 1. Google OAuth Setup

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**

#### Step 2: Create OAuth 2.0 Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Web application**
4. Add authorized redirect URIs:
   - `http://localhost:3001/api/auth/google/callback` (development)
   - `https://yourdomain.com/api/auth/google/callback` (production)
5. Copy the **Client ID** and **Client Secret**

#### Step 3: Update .env File
```env
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
```

---

### 2. Facebook OAuth Setup

#### Step 1: Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **My Apps** > **Create App**
3. Select **Consumer** as the app type
4. Fill in app details

#### Step 2: Configure Facebook Login
1. In your app dashboard, go to **Products** > **Facebook Login** > **Settings**
2. Add **Valid OAuth Redirect URIs**:
   - `http://localhost:3001/api/auth/facebook/callback` (development)
   - `https://yourdomain.com/api/auth/facebook/callback` (production)
3. Go to **Settings** > **Basic**
4. Copy the **App ID** and **App Secret**

#### Step 3: Update .env File
```env
FACEBOOK_APP_ID=your-facebook-app-id-here
FACEBOOK_APP_SECRET=your-facebook-app-secret-here
FACEBOOK_CALLBACK_URL=http://localhost:3001/api/auth/facebook/callback
```

---

### 3. GitHub OAuth Setup

#### Step 1: Create GitHub OAuth App
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in application details:
   - **Application name**: Itiyum
   - **Homepage URL**: `http://localhost:4200` (development)
   - **Authorization callback URL**: `http://localhost:3001/api/auth/github/callback`
4. Click **Register application**
5. Copy the **Client ID**
6. Generate a new **Client Secret** and copy it

#### Step 2: Update .env File
```env
GITHUB_CLIENT_ID=your-github-client-id-here
GITHUB_CLIENT_SECRET=your-github-client-secret-here
GITHUB_CALLBACK_URL=http://localhost:3001/api/auth/github/callback
```

---

### 4. LinkedIn OAuth Setup

#### Step 1: Create LinkedIn App
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click **Create app**
3. Fill in app details
4. Verify your app

#### Step 2: Configure OAuth Settings
1. Go to **Auth** tab
2. Add **Redirect URLs**:
   - `http://localhost:3001/api/auth/linkedin/callback` (development)
   - `https://yourdomain.com/api/auth/linkedin/callback` (production)
3. Request access to **Sign In with LinkedIn** product
4. Copy the **Client ID** and **Client Secret** from the **Auth** tab

#### Step 3: Update .env File
```env
LINKEDIN_CLIENT_ID=your-linkedin-client-id-here
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret-here
LINKEDIN_CALLBACK_URL=http://localhost:3001/api/auth/linkedin/callback
```

---

## 🚀 Testing OAuth Integration

### 1. Restart the Backend Server
After updating the `.env` file with OAuth credentials:
```bash
cd backend
node server.js
```

### 2. Test OAuth Status Endpoint
Check which providers are configured:
```bash
curl http://localhost:3001/api/auth/status
```

Expected response:
```json
{
  "message": "OAuth configuration status",
  "providers": {
    "google": true,
    "facebook": true,
    "github": true,
    "linkedin": true
  },
  "configured": true
}
```

### 3. Test OAuth Flow
1. Go to `http://localhost:4200/login`
2. Click on any configured OAuth provider button (e.g., "Google")
3. You should be redirected to the provider's login page
4. After successful authentication, you'll be redirected back to Itiyum
5. You should be logged in and redirected to the appropriate dashboard

---

## 🔍 How It Works

### OAuth Flow:
1. **User clicks social login button** → Frontend redirects to `http://localhost:3001/api/auth/{provider}`
2. **Backend redirects to OAuth provider** → User authenticates with provider (Google, Facebook, etc.)
3. **Provider redirects back to backend** → `http://localhost:3001/api/auth/{provider}/callback`
4. **Backend processes OAuth response**:
   - Extracts user profile (email, name, etc.)
   - Checks if user exists in database
   - Creates new user OR links OAuth account to existing user
   - Generates JWT token
5. **Backend redirects to frontend** → `http://localhost:4200/dashboard/...?oauth_success=true`
6. **User is logged in** → JWT token is set as HTTP-only cookie

### Database Schema:
The `users` table has been extended with OAuth columns:
- `oauth_provider` (VARCHAR) - Provider name (google, facebook, github, linkedin)
- `oauth_id` (VARCHAR) - Unique ID from the OAuth provider

### Security Features:
- ✅ **HTTP-only cookies** - JWT tokens stored securely
- ✅ **CSRF protection** - SameSite cookie attribute
- ✅ **Email verification** - OAuth users are automatically verified
- ✅ **Account linking** - Existing users can link OAuth accounts
- ✅ **Fallback email** - If provider doesn't provide email, generates one

---

## 📝 Production Deployment

### Update Callback URLs
When deploying to production, update the callback URLs in:

1. **Backend .env file**:
```env
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
FACEBOOK_CALLBACK_URL=https://yourdomain.com/api/auth/facebook/callback
GITHUB_CALLBACK_URL=https://yourdomain.com/api/auth/github/callback
LINKEDIN_CALLBACK_URL=https://yourdomain.com/api/auth/linkedin/callback
```

2. **OAuth Provider Dashboards**:
   - Update redirect URIs in Google Cloud Console
   - Update redirect URIs in Facebook App Settings
   - Update callback URL in GitHub OAuth App
   - Update redirect URLs in LinkedIn App

### Enable HTTPS
Make sure to set `secure: true` for cookies in production:
```javascript
res.cookie('access_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // ✅ Already configured
  sameSite: 'lax',
  maxAge: 60 * 60 * 1000
});
```

---

## 🐛 Troubleshooting

### Issue: "OAuth provider not configured"
**Solution**: Make sure you've added the OAuth credentials to the `.env` file and restarted the backend server.

### Issue: "Redirect URI mismatch"
**Solution**: Ensure the callback URL in your OAuth provider settings matches exactly with the one in your `.env` file.

### Issue: "User not created after OAuth"
**Solution**: Check the backend logs for errors. Make sure the database migration for OAuth columns was successful.

### Issue: "Cannot read property 'email' of undefined"
**Solution**: Some OAuth providers (like GitHub) don't always provide email. The system will generate a fallback email in this case.

---

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [LinkedIn OAuth Documentation](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [Passport.js Documentation](http://www.passportjs.org/)

---

## ✅ Summary

The OAuth 2.0 social authentication is **fully implemented** and ready to use. You just need to:

1. ✅ Create OAuth apps for each provider (Google, Facebook, GitHub, LinkedIn)
2. ✅ Copy the Client ID and Client Secret
3. ✅ Update the `backend/.env` file with the credentials
4. ✅ Restart the backend server
5. ✅ Test the OAuth flow on the login page

That's it! Your users can now sign in with their social accounts. 🎉

