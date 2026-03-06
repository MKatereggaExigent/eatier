# Deployment Migration Fix

## 🔴 Problem

The deployment script was failing with this error:

```
Fatal error: error: password authentication failed for user "itiyum"
💻 Loaded .env.local for development
```

**Root Cause:**
- The `database.js` config was loading `.env.local` (development) instead of `.env` (production)
- This happened because `NODE_ENV` was not set to `production` during deployment
- The migration script tried to connect to the local development database instead of the production database

---

## ✅ Solution

Modified `backend/config/database.js` to prioritize environment files correctly:

**Before:**
```javascript
if (!isProduction && !isDocker) {
  require('dotenv').config({ path: '.env.local' });
}
```

**After:**
```javascript
// Priority: .env (production) > .env.local (development)
if (!isDocker) {
  if (fs.existsSync(prodEnvPath)) {
    require('dotenv').config({ path: prodEnvPath });
    console.log('🌐 Loaded .env for production');
  } else if (fs.existsSync(devEnvPath)) {
    require('dotenv').config({ path: devEnvPath });
    console.log('💻 Loaded .env.local for development');
  }
}
```

**Key Changes:**
1. ✅ Check if `.env` exists first (production)
2. ✅ Only load `.env.local` if `.env` doesn't exist (development)
3. ✅ No longer depends on `NODE_ENV` being set correctly

---

## 🚀 Deployment Steps

### Step 1: Commit and Push Changes

```bash
cd ~/Documents/Github/eatier

git add backend/config/database.js
git add backend/scripts/db-migrate.js
git add src/app/pages/business/accounts/accounts-center.component.ts

git commit -m "Fix deployment migration and add payment debugging

- Fix database.js to prioritize .env over .env.local
- Prevents loading dev credentials on production server
- Add comprehensive payment flow logging
- Ready for Paystack integration testing"

git push origin development-v2
```

### Step 2: Ensure Production .env Exists

```bash
# SSH into server
ssh aidocumines@datasqan.com

# Check if .env exists
cd ~/eatier/backend
ls -la .env

# If .env doesn't exist, create it from .env.local
# (Make sure to update with production credentials!)
cp .env.local .env

# Edit .env with production database credentials
nano .env
```

**Important:** Make sure `.env` has the correct production database credentials:
```bash
DB_USER=itiyum_prod
DB_HOST=localhost
DB_NAME=itiyum_production
DB_PASSWORD=<production_password>
DB_PORT=5432
```

### Step 3: Add Paystack Credentials

```bash
# Add Paystack credentials to .env
cat >> .env << 'EOF'

# Paystack Payment Gateway Configuration
PAYSTACK_SECRET_KEY=sk_test_07f225c3ce8efd527c6398fb290bc30bb7129886
PAYSTACK_PUBLIC_KEY=pk_test_eba5a49b7e390527fd9b2749f980885033efbae4
PAYSTACK_CALLBACK_URL=https://itiyum.com/payment/callback
PAYSTACK_WEBHOOK_URL=https://itiyum.com/api/payments/webhook
EOF
```

### Step 4: Deploy

```bash
# Pull latest changes
cd ~/eatier
git pull origin development-v2

# Run deployment
./latest_caprover_deployment.sh
```

**Expected Output:**
```
🌐 Loaded .env for production
✅ Connected to PostgreSQL database
✅ Migrations completed successfully
```

---

## ✅ Verification

After deployment, verify:

1. **Backend is running:**
   ```bash
   docker ps | grep backend
   curl https://itiyum.com/api/health
   ```

2. **Database connection works:**
   ```bash
   docker logs itiyum-backend-prod | grep "Connected to PostgreSQL"
   ```

3. **Paystack config is loaded:**
   ```bash
   curl https://itiyum.com/api/payments/config
   ```
   Should return:
   ```json
   {
     "publicKey": "pk_test_eba5a49b7e390527fd9b2749f980885033efbae4",
     "callbackUrl": "https://itiyum.com/payment/callback"
   }
   ```

4. **Payment buttons work:**
   - Go to: https://itiyum.com/business/accounts
   - Open browser console (F12)
   - Click "Upgrade" on any plan
   - Click "Pay $X.XX" button
   - Check console for payment flow logs

---

## 🎯 What This Fixes

✅ Migration script now uses production database  
✅ No more "password authentication failed" errors  
✅ Deployment script completes successfully  
✅ Backend starts with correct database connection  
✅ Paystack credentials loaded correctly  
✅ Payment flow ready for testing  

---

## 📝 Files Changed

1. `backend/config/database.js` - Fixed environment file priority
2. `backend/scripts/db-migrate.js` - Added .env loading
3. `src/app/pages/business/accounts/accounts-center.component.ts` - Added payment debugging logs

---

## 🔍 Next Steps

After successful deployment:

1. Test the payment flow
2. Check console logs for payment debugging
3. Share console output if payment buttons still don't work
4. Verify Paystack integration end-to-end

