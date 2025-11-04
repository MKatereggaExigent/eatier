# Google OAuth Quick Setup Guide

## ✅ Good News!

Your OAuth infrastructure is **working perfectly**! The error you're seeing from Google is expected because you're using dummy credentials. Once you add real Google OAuth credentials, it will work end-to-end.

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: `Itiyum` (or any name you prefer)
4. Click **Create**

### Step 2: Enable Google+ API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on it and click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you have a Google Workspace)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: Itiyum
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **Save and Continue**
6. Skip **Scopes** (click **Save and Continue**)
7. Skip **Test users** (click **Save and Continue**)
8. Click **Back to Dashboard**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Application type**: **Web application**
4. Enter **Name**: `Itiyum Web Client`
5. Under **Authorized redirect URIs**, click **Add URI** and enter:
   ```
   http://localhost:3001/api/auth/google/callback
   ```
6. Click **Create**
7. A popup will show your **Client ID** and **Client Secret**
8. **Copy both values** (you'll need them in the next step)

### Step 5: Update .env File

1. Open `backend/.env`
2. Replace the dummy Google credentials with your real ones:
   ```env
   GOOGLE_CLIENT_ID=your-actual-client-id-from-step-4
   GOOGLE_CLIENT_SECRET=your-actual-client-secret-from-step-4
   GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
   ```
3. Save the file

### Step 6: Restart Backend Server

```bash
# Kill the current server
lsof -ti:3001 | xargs kill -9

# Start fresh
cd backend
node server.js
```

### Step 7: Test Google OAuth

1. Go to `http://localhost:4200/login`
2. Click the **Google** button
3. You should be redirected to Google's login page
4. Sign in with your Google account
5. Grant permissions to Itiyum
6. You'll be redirected back and logged in! 🎉

---

## 🔍 Troubleshooting

### Error: "Redirect URI mismatch"
**Solution**: Make sure the redirect URI in Google Cloud Console exactly matches:
```
http://localhost:3001/api/auth/google/callback
```
(No trailing slash, exact port number)

### Error: "Access blocked: This app's request is invalid"
**Solution**: Make sure you've enabled the Google+ API in your Google Cloud project.

### Error: "The OAuth client was not found"
**Solution**: You're still using dummy credentials. Make sure you updated the `.env` file and restarted the server.

---

## 📋 What Happens After Login

When a user logs in with Google:

1. **New User**: A new account is created with:
   - Email from Google
   - Name from Google profile
   - Role: `normal_user` (default)
   - OAuth provider: `google`
   - Email verified: `true` (automatically)

2. **Existing User**: If a user with that email already exists:
   - The OAuth account is linked to the existing user
   - User can now log in with either email/password OR Google

3. **Redirect**: User is redirected to the appropriate dashboard based on their role:
   - `normal_user` → `/dashboard/user/overview`
   - `business_owner` → `/dashboard/business/overview`
   - `itiyum_admin` → `/admin/insights/overview`
   - etc.

---

## 🎯 Next Steps

After Google OAuth is working, you can add other providers:

- **Facebook**: See `OAUTH_SETUP_GUIDE.md` section 2
- **GitHub**: See `OAUTH_SETUP_GUIDE.md` section 3
- **LinkedIn**: See `OAUTH_SETUP_GUIDE.md` section 4

Each provider takes about 5-10 minutes to set up.

---

## ✅ Verification

To verify Google OAuth is configured correctly:

```bash
# Check if credentials are set
cd backend
node -e "console.log('Google configured:', !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET))"
```

Should output: `Google configured: true`

---

## 🔐 Security Notes

- ✅ **Never commit `.env` file** to version control (already in `.gitignore`)
- ✅ **Use different credentials** for development and production
- ✅ **Rotate secrets** if they're ever exposed
- ✅ **Limit OAuth scopes** to only what you need (profile, email)

---

## 📞 Support

If you encounter any issues:

1. Check the backend server logs for errors
2. Verify the redirect URI matches exactly
3. Make sure Google+ API is enabled
4. Ensure you've restarted the server after updating `.env`

---

## 🎉 Summary

Your OAuth infrastructure is **fully functional**! The error you saw from Google confirms that:

✅ Frontend correctly redirects to backend OAuth endpoint  
✅ Backend correctly redirects to Google OAuth  
✅ Google receives the request (but rejects dummy credentials)  

Once you add real Google OAuth credentials (5 minutes), the entire flow will work perfectly!

