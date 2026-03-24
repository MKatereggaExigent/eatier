# 🔐 OAuth Production Setup Guide - All 8 Providers

Complete guide to set up all 8 OAuth providers for production on **itiyum.com**.

---

## 📋 Overview

This guide covers setup for:
1. ✅ **Google** - Gmail accounts
2. ✅ **Facebook** - Facebook accounts
3. ✅ **GitHub** - Developer accounts
4. ✅ **LinkedIn** - Professional network
5. ✅ **Microsoft** - Outlook/Office 365
6. ✅ **Apple** - Apple ID
7. ✅ **Twitter/X** - Twitter accounts
8. ✅ **Instagram** - Instagram accounts

---

## 🚀 Quick Start

### 1. Check Current Status

```bash
# On the server
cd ~/eatier
curl http://localhost:3002/api/auth/status
```

### 2. Test OAuth Endpoints

```bash
# Run the test script
cd ~/eatier/backend
node scripts/test-oauth.js
```

---

## 🔧 Provider Setup Instructions

### 1. Google OAuth Setup

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: "Itiyum Platform"
3. Enable **Google+ API**

#### Step 2: Create OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: "Itiyum Web App"
5. Authorized JavaScript origins:
   - `https://itiyum.com`
6. Authorized redirect URIs:
   - `https://itiyum.com/api/auth/google/callback`
7. Click **Create**
8. Copy **Client ID** and **Client Secret**

#### Step 3: Add to .env
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=https://itiyum.com/api/auth/google/callback
```

---

### 2. Facebook OAuth Setup

#### Step 1: Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Choose **Consumer** app type
4. App name: "Itiyum Platform"

#### Step 2: Add Facebook Login
1. In your app dashboard, click **Add Product**
2. Find **Facebook Login** and click **Set Up**
3. Choose **Web** platform
4. Site URL: `https://itiyum.com`

#### Step 3: Configure OAuth Settings
1. Go to **Facebook Login** → **Settings**
2. Valid OAuth Redirect URIs:
   - `https://itiyum.com/api/auth/facebook/callback`
3. Save changes

#### Step 4: Get App Credentials
1. Go to **Settings** → **Basic**
2. Copy **App ID** and **App Secret**

#### Step 5: Add to .env
```env
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_CALLBACK_URL=https://itiyum.com/api/auth/facebook/callback
```

---

### 3. GitHub OAuth Setup

#### Step 1: Register OAuth App
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Application name: "Itiyum Platform"
4. Homepage URL: `https://itiyum.com`
5. Authorization callback URL: `https://itiyum.com/api/auth/github/callback`
6. Click **Register application**

#### Step 2: Get Credentials
1. Copy **Client ID**
2. Click **Generate a new client secret**
3. Copy **Client Secret**

#### Step 3: Add to .env
```env
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
GITHUB_CALLBACK_URL=https://itiyum.com/api/auth/github/callback
```

---

### 4. LinkedIn OAuth Setup

#### Step 1: Create LinkedIn App
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Click **Create app**
3. App name: "Itiyum Platform"
4. LinkedIn Page: (Your company page or create one)
5. App logo: Upload Itiyum logo

#### Step 2: Add Sign In with LinkedIn
1. In your app, go to **Products** tab
2. Request access to **Sign In with LinkedIn**
3. Wait for approval (usually instant)

#### Step 3: Configure OAuth Settings
1. Go to **Auth** tab
2. Authorized redirect URLs:
   - `https://itiyum.com/api/auth/linkedin/callback`

#### Step 4: Get Credentials
1. Go to **Auth** tab
2. Copy **Client ID** and **Client Secret**

#### Step 5: Add to .env
```env
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_CALLBACK_URL=https://itiyum.com/api/auth/linkedin/callback
```

---

### 5. Microsoft OAuth Setup

#### Step 1: Register App in Azure
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Name: "Itiyum Platform"
5. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
6. Redirect URI: **Web** - `https://itiyum.com/api/auth/microsoft/callback`
7. Click **Register**

#### Step 2: Create Client Secret
1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Description: "Itiyum OAuth"
4. Expires: 24 months
5. Click **Add**
6. Copy the **Value** (this is your client secret)

#### Step 3: Configure API Permissions
1. Go to **API permissions**
2. Click **Add a permission**
3. Choose **Microsoft Graph**
4. Select **Delegated permissions**
5. Add: `User.Read`, `email`, `profile`, `openid`
6. Click **Add permissions**

#### Step 4: Get Credentials
1. Go to **Overview**
2. Copy **Application (client) ID**

#### Step 5: Add to .env
```env
MICROSOFT_CLIENT_ID=your_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
MICROSOFT_CALLBACK_URL=https://itiyum.com/api/auth/microsoft/callback
```

---

### 6. Apple Sign In Setup

#### Step 1: Create App ID
1. Go to [Apple Developer](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **+** button
4. Select **App IDs** → **Continue**
5. Select **App** → **Continue**
6. Description: "Itiyum Platform"
7. Bundle ID: `com.itiyum.platform`
8. Enable **Sign in with Apple**
9. Click **Continue** → **Register**

#### Step 2: Create Service ID
1. Click **Identifiers** → **+** button
2. Select **Services IDs** → **Continue**
3. Description: "Itiyum Web Service"
4. Identifier: `com.itiyum.web`
5. Enable **Sign in with Apple**
6. Click **Configure**
7. Primary App ID: Select your App ID from Step 1
8. Domains and Subdomains: `itiyum.com`
9. Return URLs: `https://itiyum.com/api/auth/apple/callback`
10. Click **Save** → **Continue** → **Register**

#### Step 3: Create Private Key
1. Click **Keys** → **+** button
2. Key Name: "Itiyum Apple Sign In Key"
3. Enable **Sign in with Apple**
4. Click **Configure**
5. Select your Primary App ID
6. Click **Save** → **Continue** → **Register**
7. **Download the .p8 file** (you can only download once!)
8. Note the **Key ID**

#### Step 4: Get Team ID
1. Go to **Membership** in the sidebar
2. Copy your **Team ID**

#### Step 5: Add to .env
```env
APPLE_CLIENT_ID=com.itiyum.web
APPLE_TEAM_ID=your_team_id_here
APPLE_KEY_ID=your_key_id_here
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
Your private key content from .p8 file
-----END PRIVATE KEY-----"
APPLE_CALLBACK_URL=https://itiyum.com/api/auth/apple/callback
```

---

### 7. Twitter/X OAuth Setup

#### Step 1: Create Twitter App
1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Click **+ Create Project**
3. Project name: "Itiyum Platform"
4. Use case: Select appropriate option
5. Project description: "Social authentication for Itiyum"

#### Step 2: Create App
1. App name: "Itiyum Web App"
2. Click **Complete**

#### Step 3: Configure App Settings
1. Click on your app
2. Go to **Settings** tab
3. Click **Edit** under **User authentication settings**
4. Enable **OAuth 1.0a**
5. App permissions: **Read**
6. Callback URL: `https://itiyum.com/api/auth/twitter/callback`
7. Website URL: `https://itiyum.com`
8. Click **Save**

#### Step 4: Get Credentials
1. Go to **Keys and tokens** tab
2. Copy **API Key** (Consumer Key)
3. Copy **API Key Secret** (Consumer Secret)

#### Step 5: Add to .env
```env
TWITTER_CONSUMER_KEY=your_consumer_key_here
TWITTER_CONSUMER_SECRET=your_consumer_secret_here
TWITTER_CALLBACK_URL=https://itiyum.com/api/auth/twitter/callback
```

---

### 8. Instagram OAuth Setup

**Note:** Instagram OAuth uses Facebook's platform.

#### Step 1: Use Your Facebook App
1. Go to your Facebook App from Step 2
2. Or create a new one if needed

#### Step 2: Add Instagram Basic Display
1. In your Facebook app dashboard
2. Click **Add Product**
3. Find **Instagram Basic Display**
4. Click **Set Up**

#### Step 3: Create Instagram App
1. Click **Create New App**
2. Display Name: "Itiyum Platform"
3. Click **Create App**

#### Step 4: Configure OAuth Settings
1. Go to **Basic Display** → **Settings**
2. Valid OAuth Redirect URIs:
   - `https://itiyum.com/api/auth/instagram/callback`
3. Deauthorize Callback URL: `https://itiyum.com/api/auth/instagram/deauthorize`
4. Data Deletion Request URL: `https://itiyum.com/api/auth/instagram/delete`
5. Click **Save Changes**

#### Step 5: Get Credentials
1. Copy **Instagram App ID**
2. Copy **Instagram App Secret**

#### Step 6: Add to .env
```env
INSTAGRAM_CLIENT_ID=your_instagram_app_id_here
INSTAGRAM_CLIENT_SECRET=your_instagram_app_secret_here
INSTAGRAM_CALLBACK_URL=https://itiyum.com/api/auth/instagram/callback
```

---

## 🧪 Testing All Providers

### 1. Run the Test Script

```bash
cd ~/eatier/backend

# Test all providers
node scripts/test-oauth.js

# Test specific provider
node scripts/test-oauth.js --provider=google

# Verbose output
node scripts/test-oauth.js --verbose
```

### 2. Check Configuration Status

```bash
curl http://localhost:3002/api/auth/status
```

Expected output:
```json
{
  "message": "OAuth configuration status",
  "providers": {
    "google": true,
    "facebook": true,
    "github": true,
    "linkedin": true,
    "microsoft": true,
    "apple": true,
    "twitter": true,
    "instagram": true
  },
  "configured": true,
  "configuredCount": 8,
  "totalProviders": 8
}
```

### 3. Manual Testing

Test each provider by visiting:
- `https://itiyum.com/api/auth/google`
- `https://itiyum.com/api/auth/facebook`
- `https://itiyum.com/api/auth/github`
- `https://itiyum.com/api/auth/linkedin`
- `https://itiyum.com/api/auth/microsoft`
- `https://itiyum.com/api/auth/apple`
- `https://itiyum.com/api/auth/twitter`
- `https://itiyum.com/api/auth/instagram`

Each should redirect to the respective OAuth provider's login page.

---

## 📦 Deployment

### 1. Install Dependencies

```bash
cd ~/eatier/backend
npm install
```

### 2. Update .env File

```bash
cd ~/eatier/backend
nano .env

# Add all OAuth credentials from above
```

### 3. Restart Backend

```bash
cd ~/eatier
docker restart itiyum-backend
```

### 4. Verify

```bash
docker logs itiyum-backend --tail 50
curl http://localhost:3002/api/auth/status
```

---

## 🔒 Security Checklist

- [ ] All callback URLs use HTTPS in production
- [ ] OAuth credentials are in `.env` (not committed to git)
- [ ] `.env` file has proper permissions (600)
- [ ] Each provider's app is in production mode (not development)
- [ ] Rate limiting is enabled on OAuth endpoints
- [ ] CORS is properly configured
- [ ] JWT tokens have appropriate expiration times
- [ ] HTTP-only cookies are used for tokens

---

## 🐛 Troubleshooting

### Provider Not Configured Error

**Problem:** "Provider not configured" message

**Solution:**
1. Check `.env` file has correct credentials
2. Restart backend: `docker restart itiyum-backend`
3. Verify with: `curl http://localhost:3002/api/auth/status`

### Redirect URI Mismatch

**Problem:** "redirect_uri_mismatch" error

**Solution:**
1. Ensure callback URL in `.env` matches provider's settings
2. Check for trailing slashes
3. Verify HTTPS vs HTTP

### Invalid Client Error

**Problem:** "invalid_client" error

**Solution:**
1. Double-check Client ID and Secret
2. Ensure no extra spaces in `.env`
3. Regenerate credentials if needed

### Apple Sign In Issues

**Problem:** Apple authentication fails

**Solution:**
1. Verify .p8 private key is correctly formatted
2. Check Team ID and Key ID are correct
3. Ensure Service ID is properly configured
4. Verify domain is added to Apple's allowed list

---

## 📊 Monitoring

### Check OAuth Usage

```sql
-- Connect to database
docker exec -it itiyum-postgres psql -U itiyum_user -d itiyum_platform

-- Check OAuth users
SELECT oauth_provider, COUNT(*) as user_count
FROM users
WHERE oauth_provider IS NOT NULL
GROUP BY oauth_provider
ORDER BY user_count DESC;

-- Recent OAuth logins
SELECT oauth_provider, email, created_at
FROM users
WHERE oauth_provider IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

---

## ✅ Summary

You now have all 8 OAuth providers configured and ready for production:

1. ✅ Google - Most popular
2. ✅ Facebook - Social network
3. ✅ GitHub - Developers
4. ✅ LinkedIn - Professionals
5. ✅ Microsoft - Enterprise users
6. ✅ Apple - iOS users
7. ✅ Twitter/X - Social media
8. ✅ Instagram - Visual content creators

**Next Steps:**
1. Configure each provider following the steps above
2. Add credentials to `.env`
3. Run tests with `node scripts/test-oauth.js`
4. Deploy to production
5. Monitor usage and errors

---

**Last Updated:** 2026-03-24


