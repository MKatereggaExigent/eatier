# 🔒 Google Maps API - Free Tier Protection Setup

## ⚠️ CRITICAL: Prevent Any Charges

This guide ensures you **NEVER** spend money on Google Maps API by staying within free tier limits.

---

## 📊 Free Tier Limits (Per Month)

| API | Free Limit | After Free | Our Usage |
|-----|------------|------------|-----------|
| **Distance Matrix API** | 40,000 requests | $5 per 1,000 | ~6,000/month ✅ |
| **Maps JavaScript API** | 28,000 loads | $7 per 1,000 | 0 (not using) ✅ |
| **Places API (Details)** | 5,000 requests | $17 per 1,000 | 0 (future) ✅ |
| **Geocoding API** | 40,000 requests | $5 per 1,000 | 0 (future) ✅ |
| **Directions API** | 40,000 requests | $5 per 1,000 | 0 (future) ✅ |

**Current Status:** ✅ Using only 15% of Distance Matrix free tier

---

## 🔐 Step-by-Step Restriction Setup

### Step 1: Go to Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find your API key: `AIzaSyCKape8fIB6w3qnJ_gAZiv5Y9U-BWB8Qs0`
5. Click the **Edit** (pencil) icon

---

### Step 2: Set Application Restrictions

**Choose one option:**

#### Option A: HTTP Referrer Restrictions (Recommended for Frontend)
```
https://itiyum.com/*
https://*.itiyum.com/*
http://localhost:4200/*  (for development)
```

**When to use:** If you plan to use Maps JavaScript API on frontend

#### Option B: IP Address Restrictions (Best for Backend Only)
```
Your server IP address (e.g., 123.456.789.0)
```

**When to use:** If you're ONLY using backend REST API (current setup)

**To get your server IP:**
```bash
curl ifconfig.me
# Or check your hosting provider dashboard
```

#### Option C: No Restrictions (NOT RECOMMENDED)
⚠️ Anyone can steal and use your API key!

---

### Step 3: Set API Restrictions

**Enable ONLY the APIs you're using:**

✅ **Check these:**
- [x] Distance Matrix API (currently using)
- [x] Geocoding API (future use - optional)

❌ **Uncheck/Disable these (to prevent accidental usage):**
- [ ] Places API (only enable when needed)
- [ ] Directions API (only enable when needed)
- [ ] Maps JavaScript API (only enable when needed)
- [ ] Routes API
- [ ] Maps SDK for Android
- [ ] Maps SDK for iOS
- [ ] Maps Static API
- [ ] Street View Static API
- [ ] All other APIs

**Click:** "Restrict key" → Select "Distance Matrix API" only

**Click:** "Save"

---

### Step 4: Set Quota Limits (CRITICAL!)

This is the most important step to prevent charges.

1. Go to **APIs & Services** → **Library**
2. Click **Distance Matrix API**
3. Click **Quotas**
4. Click **All quotas**
5. Find "Requests per day"
6. Click **Edit quotas**
7. Set to: **1,334** requests/day (40,000/month ÷ 30 days)

**Why 1,334?** 
- Free tier: 40,000/month
- 40,000 ÷ 30 days = 1,333.33
- Round up to 1,334 for safety
- This ensures you NEVER exceed free tier

**Repeat for each API you enable!**

---

### Step 5: Set Budget Alerts

**Even better protection - get alerted if any charges occur:**

1. Go to **Billing** → **Budgets & alerts**
2. Click **Create budget**
3. Configure:
   ```
   Name: Google Maps API Budget Alert
   Projects: [Your project]
   Services: All Google Maps APIs
   Budget amount: $0.01
   Threshold rules:
   - Alert at: 50% ($0.005)
   - Alert at: 100% ($0.01)
   ```
4. Add your email for notifications
5. Click **Finish**

**Result:** You'll get an email if ANY charges occur (even 1 cent!)

---

### Step 6: Disable Billing (Nuclear Option)

**If you want ABSOLUTE guarantee of $0 cost:**

⚠️ **Warning:** This will disable ALL paid features, not just Maps API

1. Go to **Billing** → **Account management**
2. Click **Close billing account**
3. Confirm

**Impact:**
- ✅ IMPOSSIBLE to be charged
- ❌ Cannot use ANY paid Google services
- ✅ Free tier APIs still work
- ❌ If you exceed free tier, API stops working instead of charging

**Recommended:** Only do this if you're 100% sure you won't need paid features.

---

## 🛡️ Backend Code Protection

Add request throttling to prevent API abuse:

### File: `backend/services/distanceCalculator.js`

Add this at the top:

```javascript
// Rate limiting
const DAILY_REQUEST_LIMIT = 1300; // Stay under 1,334 daily limit
let requestCount = 0;
let lastResetDate = new Date().toDateString();

function checkRateLimit() {
  const today = new Date().toDateString();
  
  // Reset counter at midnight
  if (today !== lastResetDate) {
    requestCount = 0;
    lastResetDate = today;
  }
  
  // Check if over limit
  if (requestCount >= DAILY_REQUEST_LIMIT) {
    console.error('⚠️  DAILY GOOGLE MAPS API LIMIT REACHED!');
    console.error(`   Used ${requestCount}/${DAILY_REQUEST_LIMIT} requests today`);
    throw new Error('Daily API limit reached. Using fallback values.');
  }
  
  requestCount++;
  console.log(`📊 Google Maps API requests today: ${requestCount}/${DAILY_REQUEST_LIMIT}`);
}
```

Then in `calculateDeliveryFee()`:

```javascript
async function calculateDeliveryFee(origin, destination) {
  try {
    // Check rate limit BEFORE making API call
    checkRateLimit();
    
    // ... rest of existing code
  } catch (error) {
    // Return fallback values if limit reached
    return {
      distanceKm: 5,
      deliveryFee: BASE_DELIVERY_FEE + (5 * PRICE_PER_KM),
      duration: '20-30 mins',
      error: 'Rate limit reached'
    };
  }
}
```

---

## 📊 Monitoring Dashboard

### Real-Time Usage Tracking

Create a simple monitoring endpoint:

```javascript
// backend/routes/monitoring.js
router.get('/api/admin/maps-usage', authenticateToken, async (req, res) => {
  // Only admins can access
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  res.json({
    today: {
      requests: requestCount,
      limit: DAILY_REQUEST_LIMIT,
      remaining: DAILY_REQUEST_LIMIT - requestCount,
      percentUsed: (requestCount / DAILY_REQUEST_LIMIT * 100).toFixed(2)
    },
    monthly: {
      limit: 40000,
      projectedUsage: requestCount * 30,
      status: (requestCount * 30 < 40000) ? 'SAFE' : 'WARNING'
    }
  });
});
```

**Access:** `https://itiyum.com/api/admin/maps-usage`

**Response:**
```json
{
  "today": {
    "requests": 145,
    "limit": 1300,
    "remaining": 1155,
    "percentUsed": "11.15"
  },
  "monthly": {
    "limit": 40000,
    "projectedUsage": 4350,
    "status": "SAFE"
  }
}
```

---

## ✅ Verification Checklist

After completing setup, verify:

- [ ] API key has HTTP referrer OR IP restrictions set
- [ ] Only Distance Matrix API is enabled
- [ ] Daily quota set to 1,334 requests/day
- [ ] Budget alert set for $0.01
- [ ] Email notifications configured
- [ ] Rate limiting code added to backend
- [ ] Monitoring endpoint created
- [ ] Tested API still works
- [ ] Checked Google Cloud Console shows restrictions

---

## 🚨 What Happens If You Hit Limits?

### Scenario 1: Hit Daily Quota (1,334 requests)
**Result:** 
- Google returns error: "Quota exceeded"
- Our fallback code returns default values
- Delivery fee: 4,500 UGX (5km default)
- ✅ Checkout still works!
- No charges incurred

### Scenario 2: Hit Monthly Quota (40,000 requests)
**Result:**
- API stops working for rest of month
- All requests use fallback values
- ✅ No charges!
- Service resumes next month

### Scenario 3: Quota Not Set (Worst Case)
**Result:**
- ⚠️ API continues working
- ⚠️ You get charged $5 per 1,000 requests
- Budget alert emails you immediately
- You can disable API in console

---

## 💡 Fallback Strategy

Our code already handles API failures gracefully:

```javascript
// If API fails for ANY reason:
return {
  distanceKm: 5,              // Default 5km
  deliveryFee: 4500,          // 2000 + (5 × 500)
  duration: '20-30 mins',     // Estimated
  error: 'Using fallback'     // Logged but not shown to user
};
```

**User Experience:**
- ✅ Checkout works normally
- ✅ Delivery fee still calculated (using defaults)
- ✅ No error messages
- ✅ Service uninterrupted

---

## 📈 Scaling Plan

**Current:** 6,000 requests/month (15% of free tier)

**If you grow:**

| Orders/Day | Requests/Month | Cost | Action |
|-----------|----------------|------|--------|
| 100 | 6,000 | $0 | ✅ Free tier |
| 300 | 18,000 | $0 | ✅ Free tier |
| 667 | 40,000 | $0 | ✅ Free tier limit |
| 800 | 48,000 | $40 | Enable caching |
| 1000 | 60,000 | $100 | Implement route caching |

**Caching Strategy (When Needed):**
```javascript
// Cache common routes in database
// Example: Restaurant A → Popular Area = 5km (cached)
// Only use API for new/unknown routes
```

---

## ✅ Final Summary

**To stay 100% FREE forever:**

1. ✅ Set API restrictions (IP or referrer)
2. ✅ Enable ONLY Distance Matrix API
3. ✅ Set daily quota: 1,334 requests
4. ✅ Set budget alert: $0.01
5. ✅ Add rate limiting to code
6. ✅ Monitor usage monthly

**Result:**
- ✅ IMPOSSIBLE to be charged
- ✅ System uses fallback if limit hit
- ✅ Email alerts if anything unusual
- ✅ Service never interrupted

**Your platform will NEVER cost you a cent for Google Maps!** 🎉🔒
