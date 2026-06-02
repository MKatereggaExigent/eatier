# 🗺️ Google Maps API Setup for Delivery Fee Calculation

## Overview

The checkout system now calculates delivery fees based on the **actual distance** between the restaurant and the customer using Google Maps Distance Matrix API.

---

## 🎯 How It Works

### Delivery Fee Formula

```
Delivery Fee = BASE_FEE + (distance_km × PRICE_PER_KM)
```

**Configuration:**
- `BASE_FEE`: 2,000 UGX (base delivery charge)
- `PRICE_PER_KM`: 500 UGX per kilometer
- `MIN_FEE`: 2,000 UGX (minimum delivery fee)
- `MAX_FEE`: 15,000 UGX (maximum delivery fee)

**Examples:**
- **3 km delivery:** 2,000 + (3 × 500) = **3,500 UGX**
- **10 km delivery:** 2,000 + (10 × 500) = **7,000 UGX**
- **25 km delivery:** 2,000 + (25 × 500) = 14,500 UGX (capped at 15,000 UGX)

---

## 🔑 Setting Up Google Maps API Key

### Step 1: Get API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **API Key**
5. Copy the API key

### Step 2: Enable Required APIs

Enable these APIs for your project:
- ✅ **Distance Matrix API** (required)
- ✅ **Geocoding API** (optional, for address validation)
- ✅ **Maps JavaScript API** (optional, for frontend maps)

### Step 3: Restrict API Key (Recommended)

For security, restrict your API key:
1. Click on the API key in the Credentials page
2. Under **Application restrictions**: Select "HTTP referrers" or "IP addresses"
3. Under **API restrictions**: Select "Restrict key" and choose:
   - Distance Matrix API
   - Geocoding API (if using)
4. Save changes

### Step 4: Add API Key to Environment

**For Docker deployment:**

Edit `backend/.env` file:
```env
GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

**For local development:**

```bash
export GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

Or add to `backend/.env.local`:
```env
GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

---

## 🧪 Testing the Distance Calculator

### Test 1: Manual API Test

```bash
# Test with curl
curl -X GET "https://maps.googleapis.com/maps/api/distancematrix/json?origins=Kampala,Uganda&destinations=Entebbe,Uganda&key=YOUR_API_KEY"
```

**Expected Response:**
```json
{
  "status": "OK",
  "rows": [{
    "elements": [{
      "distance": {
        "text": "36.2 km",
        "value": 36200
      },
      "duration": {
        "text": "45 mins",
        "value": 2700
      }
    }]
  }]
}
```

### Test 2: Test in Application

1. Login to the application
2. Add items to cart
3. Select "Delivery" as order type
4. Go to checkout
5. Check the delivery fee in the order summary
6. Check backend logs for distance calculation:

```bash
docker logs itiyum-backend --tail=50 | grep "📍\|💰"
```

**Expected logs:**
```
📍 Calculating distance between:
  Origin: Restaurant Name, Kampala, Uganda
  Destination: Customer Address, Kampala, Uganda
✅ Distance: 5.3 km
⏱️  Duration: 15 mins
💰 Calculated delivery fee: 4650 UGX
   Formula: 2000 (base) + (5.3 km × 500 UGX/km)
```

---

## 🔧 Configuration

All settings are in `backend/services/distanceCalculator.js`:

```javascript
const BASE_DELIVERY_FEE = 2000;  // Base fee (UGX)
const PRICE_PER_KM = 500;        // Price per km (UGX)
const MIN_DELIVERY_FEE = 2000;   // Minimum fee (UGX)
const MAX_DELIVERY_FEE = 15000;  // Maximum fee (UGX)
```

To change the pricing:
1. Edit these values
2. Restart the backend
3. No database changes needed

---

## 🚨 Fallback Behavior

If the Google Maps API is unavailable or not configured:
- **Fallback distance:** 5 km
- **Fallback delivery fee:** 4,500 UGX (2,000 + 5×500)
- **Fallback duration:** "20-30 mins"
- ✅ **Checkout still works!**

The system will log warnings:
```
⚠️  Google Maps API key not configured. Using default delivery fee.
```

---

## 💰 Cost Estimation

**Google Maps Distance Matrix API Pricing:**
- First 40,000 requests/month: **FREE**
- After 40,000: $5 per 1,000 requests

**Usage estimation:**
- Average checkout: 2 API calls (GET checkout + POST order)
- 100 orders/day = 200 calls/day = 6,000 calls/month
- **Cost:** FREE (well below 40,000 limit)

**For high volume (>20,000 orders/month):**
- Consider caching common routes
- Implement distance table for frequent destinations
- Use Google Maps Premium if needed

---

## 🛡️ Security Best Practices

1. ✅ **Never commit API key to Git**
2. ✅ **Use environment variables**
3. ✅ **Restrict API key to your domain/IP**
4. ✅ **Enable only required APIs**
5. ✅ **Monitor usage in Google Cloud Console**
6. ✅ **Set up billing alerts**

---

## 🐛 Troubleshooting

### Issue: "API key not configured"
**Solution:** Add `GOOGLE_MAPS_API_KEY` to backend/.env

### Issue: "REQUEST_DENIED" from Google Maps
**Solution:** 
- Check API key is valid
- Ensure Distance Matrix API is enabled
- Remove API restrictions temporarily to test

### Issue: "ZERO_RESULTS" from Google Maps
**Solution:**
- Check addresses are valid and in correct format
- Try with full addresses including city and country
- Test addresses manually in Google Maps

### Issue: High delivery fees
**Solution:**
- Check `PRICE_PER_KM` and `MAX_DELIVERY_FEE` settings
- Verify distance calculation is correct
- Check restaurant and customer addresses

---

## 📊 Monitoring

### Check API Usage

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Dashboard**
3. Select **Distance Matrix API**
4. View usage graphs and quotas

### Backend Logs

Monitor delivery fee calculations:
```bash
# Real-time logs
docker logs -f itiyum-backend | grep "📍\|💰\|⚠️"

# Last 100 lines
docker logs itiyum-backend --tail=100 | grep "delivery"
```

---

## ✅ Summary

**What's Implemented:**
- ✅ Distance-based delivery fee calculation
- ✅ Google Maps Distance Matrix API integration
- ✅ Configurable pricing (base fee + per km)
- ✅ Min/Max fee caps
- ✅ Graceful fallback if API unavailable
- ✅ Comprehensive logging
- ✅ Works with or without API key

**Next Steps:**
1. Get Google Maps API key
2. Add to `backend/.env`: `GOOGLE_MAPS_API_KEY=your_key_here`
3. Restart backend container
4. Test checkout with delivery orders
5. Monitor API usage and costs

**The delivery fee calculation is production-ready!** 🚀
