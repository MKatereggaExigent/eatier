# 🔐 Server Setup - Secrets Configuration

## ⚠️ IMPORTANT: Do NOT Push This to GitHub

This file contains instructions for adding secrets directly on the server.
These values should NEVER be committed to Git.

---

## 📋 Step-by-Step Server Configuration

### Step 1: SSH to Your Server

```bash
ssh your-username@your-server-ip
cd /path/to/eatier
```

### Step 2: Edit backend/.env File

```bash
nano backend/.env
```

### Step 3: Add/Update the Following Line

**Add this line to backend/.env:**

```env
# Google Maps API Key
GOOGLE_MAPS_API_KEY=AIzaSyCKape8fIB6w3qnJ_gAZiv5Y9U-BWB8Qs0
```

**Full context (add after Paystack section):**

```env
# Paystack Payment Gateway
PAYSTACK_SECRET_KEY=sk_test_07f225c3ce8efd527c6398fb290bc30bb7129886
PAYSTACK_PUBLIC_KEY=pk_test_eba5a49b7e390527fd9b2749f980885033efbae4
PAYSTACK_CALLBACK_URL=https://itiyum.com/payment/callback
PAYSTACK_WEBHOOK_URL=https://itiyum.com/api/payments/webhook

# Google Maps API
# This key works for both JavaScript API (frontend) and REST API (backend)
# Used for: Distance Matrix, Geocoding, Places
GOOGLE_MAPS_API_KEY=AIzaSyCKape8fIB6w3qnJ_gAZiv5Y9U-BWB8Qs0
```

### Step 4: Save and Exit

- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

### Step 5: Restart Backend Container

```bash
docker-compose restart backend
```

Or restart everything:

```bash
docker-compose down
docker-compose up -d
```

### Step 6: Verify Environment Variable is Loaded

```bash
docker exec -it itiyum-backend printenv | grep GOOGLE_MAPS
```

**Expected output:**
```
GOOGLE_MAPS_API_KEY=AIzaSyCKape8fIB6w3qnJ_gAZiv5Y9U-BWB8Qs0
```

### Step 7: Test API Integration

```bash
# Check backend logs
docker logs itiyum-backend --tail=50 | grep "GOOGLE\|📍"
```

**Should NOT see:**
```
⚠️ Google Maps API key not configured
```

**Should see (after a delivery order):**
```
📍 Calculating distance between:
✅ Distance: X.X km
💰 Calculated delivery fee: XXXX UGX
```

---

## 🔐 Security Best Practices

### ✅ Do's

- ✅ Keep `.env` file on server only
- ✅ Never commit `.env` to Git
- ✅ Use different API keys for dev/staging/production
- ✅ Rotate keys periodically
- ✅ Set up Google Cloud restrictions
- ✅ Enable budget alerts

### ❌ Don'ts

- ❌ Never share API keys in chat/email
- ❌ Never commit secrets to GitHub
- ❌ Never use production keys in development
- ❌ Never share `.env` file
- ❌ Never screenshot `.env` file

---

## 🔑 API Key Information

**Google Maps API Key:**
```
AIzaSyCKape8fIB6w3qnJ_gAZiv5Y9U-BWB8Qs0
```

**Enabled APIs:**
- Distance Matrix API ✅
- Maps JavaScript API ✅
- Places API ✅
- Geocoding API ✅
- Directions API ✅

**Restrictions to Set (Google Cloud Console):**

1. **Application Restrictions:**
   - HTTP referrers: `https://itiyum.com/*`
   - OR IP addresses: Your server IP

2. **API Restrictions:**
   - Enable ONLY: Distance Matrix API (for backend)
   - Enable Maps JavaScript API only if using frontend maps

3. **Quota Limits:**
   - Distance Matrix: 1,334 requests/day
   - Maps JavaScript: 933 loads/day (if using)

4. **Budget Alert:**
   - Alert at: $0.01

---

## 🧪 Testing After Setup

### Test 1: Environment Variable

```bash
docker exec -it itiyum-backend node -e "console.log(process.env.GOOGLE_MAPS_API_KEY)"
```

**Expected:** Shows the API key

### Test 2: Distance Calculation

1. Go to https://itiyum.com
2. Login
3. Add items to cart from a restaurant
4. Select "Delivery"
5. Go to checkout
6. Check delivery fee (should NOT be 5,000 UGX)

### Test 3: Backend Logs

```bash
docker logs -f itiyum-backend
```

Place a delivery order and watch for:
```
📍 Calculating distance between:
  Origin: [Restaurant Address]
  Destination: [Customer Address]
📊 Google Maps API: 1/1300 requests today (0.1%)
✅ Distance: 5.3 km
💰 Calculated delivery fee: 4650 UGX
```

### Test 4: Monitoring API

```bash
curl https://itiyum.com/api/monitoring/google-maps-usage \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected:** JSON with usage statistics

---

## 🚨 Troubleshooting

### Issue: "API key not configured" in logs

**Solution:**
```bash
# Check if variable exists
docker exec -it itiyum-backend printenv | grep GOOGLE_MAPS_API_KEY

# If not found, add to .env and restart
nano backend/.env
# Add: GOOGLE_MAPS_API_KEY=AIzaSyCKape8fIB6w3qnJ_gAZiv5Y9U-BWB8Qs0
docker-compose restart backend
```

### Issue: "REQUEST_DENIED" from Google

**Solution:**
1. Check API key is correct
2. Ensure Distance Matrix API is enabled in Google Cloud
3. Remove API restrictions temporarily to test
4. Check quota limits haven't been exceeded

### Issue: Still showing 5,000 UGX delivery fee

**Solution:**
1. Clear browser cache
2. Check backend logs for API calls
3. Verify order type is "delivery" not "pickup"
4. Check user has delivery address in profile

---

## 📊 Environment File Structure

Your `backend/.env` should look like this:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=itiyum_db
DB_USER=itiyum_user
DB_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_here

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Paystack Payment Gateway
PAYSTACK_SECRET_KEY=sk_test_07f225c3ce8efd527c6398fb290bc30bb7129886
PAYSTACK_PUBLIC_KEY=pk_test_eba5a49b7e390527fd9b2749f980885033efbae4
PAYSTACK_CALLBACK_URL=https://itiyum.com/payment/callback
PAYSTACK_WEBHOOK_URL=https://itiyum.com/api/payments/webhook

# Google Maps API
GOOGLE_MAPS_API_KEY=AIzaSyCKape8fIB6w3qnJ_gAZiv5Y9U-BWB8Qs0
```

---

## ✅ Deployment Checklist

After adding the API key:

- [ ] API key added to `backend/.env`
- [ ] Backend container restarted
- [ ] Environment variable verified (`docker exec ... printenv`)
- [ ] Test delivery order placed
- [ ] Delivery fee calculated (not 5,000 UGX)
- [ ] Backend logs show distance calculation
- [ ] Monitoring API returns usage stats
- [ ] Google Cloud quotas set (1,334/day)
- [ ] Budget alert configured ($0.01)
- [ ] API key restrictions enabled

---

## 🔒 Keep This File Secure

- ✅ Save a local copy (not in Git)
- ✅ Delete after server setup
- ✅ Share only via secure channels (never email/chat)
- ✅ Use password-protected document if sharing

---

**After completing setup, delete this file or store it securely!** 🔐
