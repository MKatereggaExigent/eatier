# Debugging Food Enthusiast Dashboard Issues

## 🔍 Problem
The Food Enthusiast Dashboard at `https://itiyum.com/dashboard/food-enthusiast/overview` is showing:
- ❌ Reviews Written: 0
- ❌ Restaurants Visited: 0
- ❌ Followers: 0
- ❌ Recommended for you: Empty
- ❌ Culinary Events: Empty
- ❌ Monthly Goal: 0/8 restaurants

## 🧪 Step-by-Step Debugging

### Step 1: Check Backend Logs

```bash
# SSH into the server
ssh aidocumines@datasqan.com

# Check backend logs for errors
docker logs itiyum-backend --tail 100

# Follow logs in real-time
docker logs itiyum-backend -f
```

**Look for:**
- ❌ `relation "page_view_events" does not exist`
- ❌ `Failed to fetch user statistics`
- ❌ `Failed to fetch recommendations`
- ❌ SQL syntax errors

---

### Step 2: Verify Database Tables

```bash
# Run the verification script
chmod +x verify-database-tables.sh
./verify-database-tables.sh
```

**Expected output:**
- ✅ `page_view_events` table exists
- ✅ `business_analytics_daily` table exists
- ✅ `analytics_events` table exists
- ✅ Migration 029 is applied

**If tables don't exist:**
```bash
# Run migrations manually
docker exec itiyum-backend npm run migrate

# Or restart the deployment
./latest_caprover_deployment.sh
```

---

### Step 3: Check Migration Status

```bash
# Connect to PostgreSQL
docker exec -it itiyum-postgres psql -U itiyum_user -d itiyum_platform

# Check migrations
SELECT version, name, applied_at 
FROM schema_migrations 
ORDER BY version DESC 
LIMIT 10;

# Exit
\q
```

**Expected:**
- ✅ Version 029: `029_create_analytics_events_tables.sql` should be applied

**If migration 029 is missing:**
```bash
# The migration file might not be on the server
# Pull latest code
git pull origin development-v2

# Run migrations
docker exec itiyum-backend npm run migrate
```

---

### Step 4: Test Endpoints Directly

```bash
# Get your auth token from browser
# 1. Open https://itiyum.com
# 2. Open DevTools (F12)
# 3. Go to Application > Local Storage
# 4. Copy the value of 'itiyum_token'

# Test the stats endpoint
chmod +x test-endpoints.sh
./test-endpoints.sh <YOUR_TOKEN> <YOUR_USER_ID>
```

**Expected responses:**

#### 1. `/api/users/:userId/stats`
```json
{
  "totalReviews": 5,
  "totalBookings": 2,
  "totalFavorites": 3,
  "totalPhotos": 10,
  "restaurantsVisited": 15
}
```

#### 2. `/api/users/:userId/recommendations`
```json
{
  "businesses": [
    {
      "id": "uuid",
      "name": "Restaurant Name",
      "cuisine": ["Italian", "Pizza"],
      "rating": 4.5,
      "image": "url",
      "priceRange": "$$"
    }
  ]
}
```

---

### Step 5: Check Data in Database

```bash
# Connect to database
docker exec -it itiyum-postgres psql -U itiyum_user -d itiyum_platform

# Check your user ID
SELECT id, email, first_name, last_name FROM users WHERE email = 'your@email.com';

# Check reviews for your user
SELECT COUNT(*) FROM reviews WHERE user_id = 'YOUR_USER_ID' AND status = 'published';

# Check bookings for your user
SELECT COUNT(*) FROM bookings WHERE user_id = 'YOUR_USER_ID';

# Check page views for your user
SELECT COUNT(DISTINCT business_id) FROM page_view_events 
WHERE user_id = 'YOUR_USER_ID' AND page_type = 'profile';

# Check if businesses exist
SELECT COUNT(*) FROM businesses WHERE account_status = 'active';

# Exit
\q
```

---

## 🔧 Common Fixes

### Fix 1: Missing `page_view_events` Table

**Problem:** Backend returns 500 error with "relation does not exist"

**Solution:**
```bash
# Pull latest code with migration
git pull origin development-v2

# Run migrations
docker exec itiyum-backend npm run migrate

# Restart backend
docker restart itiyum-backend
```

---

### Fix 2: No Data in Database

**Problem:** Endpoints return empty arrays or zeros

**Possible causes:**
1. **No reviews written** → Write a review on a restaurant page
2. **No restaurants visited** → Visit restaurant profile pages
3. **No businesses in database** → Seed businesses or create them
4. **Wrong tenant_id** → Check if user's tenant_id matches businesses

**Solution:**
```bash
# Check tenant_id
docker exec -it itiyum-postgres psql -U itiyum_user -d itiyum_platform

SELECT u.id, u.email, u.tenant_id, t.name as tenant_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'your@email.com';

# Check businesses for same tenant
SELECT COUNT(*) FROM businesses WHERE tenant_id = 'YOUR_TENANT_ID';

\q
```

---

### Fix 3: Page Views Not Being Tracked

**Problem:** `restaurantsVisited` always 0 even after visiting restaurants

**Check:**
1. Is `InsightsService.trackPageView()` being called?
2. Is the `/api/insights/track/pageview` endpoint working?

**Test:**
```bash
# Check browser console for errors
# Open DevTools > Console
# Visit a restaurant page
# Look for: "Error tracking page view"

# Check backend logs
docker logs itiyum-backend --tail 50 | grep "track/pageview"
```

**Solution:**
```bash
# Manually insert a test page view
docker exec -it itiyum-postgres psql -U itiyum_user -d itiyum_platform

INSERT INTO page_view_events (
  tenant_id, business_id, user_id, page_type, session_id
) VALUES (
  'YOUR_TENANT_ID',
  (SELECT id FROM businesses LIMIT 1),
  'YOUR_USER_ID',
  'profile',
  'test-session'
);

# Verify
SELECT COUNT(*) FROM page_view_events WHERE user_id = 'YOUR_USER_ID';

\q
```

---

### Fix 4: Recommendations Empty

**Problem:** No recommendations showing

**Possible causes:**
1. All businesses are already favorited/reviewed
2. No businesses match user preferences
3. No businesses in database

**Solution:**
```bash
# Check if businesses exist
docker exec -it itiyum-postgres psql -U itiyum_user -d itiyum_platform

# Count active businesses
SELECT COUNT(*) FROM businesses WHERE account_status = 'active';

# Check if user has favorited/reviewed all businesses
SELECT 
  (SELECT COUNT(*) FROM businesses WHERE account_status = 'active') as total_businesses,
  (SELECT COUNT(DISTINCT business_id) FROM favorites WHERE user_id = 'YOUR_USER_ID') as favorited,
  (SELECT COUNT(DISTINCT business_id) FROM reviews WHERE user_id = 'YOUR_USER_ID') as reviewed;

\q
```

---

## 📊 Expected Behavior After Fixes

### 1. **Reviews Written**
- Shows count from `reviews` table where `user_id = YOUR_ID` and `status = 'published'`
- Updates when you write a new review

### 2. **Restaurants Visited**
- Shows count of unique `business_id` from `page_view_events` where `user_id = YOUR_ID` and `page_type = 'profile'`
- Updates when you visit restaurant profile pages

### 3. **Followers**
- Currently hardcoded to 0 (TODO: implement followers feature)

### 4. **Recommended for You**
- Shows restaurants you haven't favorited or reviewed
- Based on your page view history and cuisine preferences
- Requires at least 1 active business in database

### 5. **Culinary Events**
- Currently empty (TODO: implement events feature)

### 6. **Monthly Goal**
- Shows progress toward visiting 8 restaurants this month
- Based on `restaurantsVisited` count

---

## 🚀 Quick Fix Commands

```bash
# Full reset and redeploy
cd ~/eatier
git pull origin development-v2
./latest_caprover_deployment.sh

# Check if it worked
docker logs itiyum-backend --tail 50
./verify-database-tables.sh
```

---

## 📞 Still Not Working?

If the dashboard is still showing zeros after all fixes:

1. **Check browser console** for JavaScript errors
2. **Check Network tab** in DevTools for failed API calls
3. **Verify auth token** is being sent with requests
4. **Check CORS settings** if requests are being blocked
5. **Verify user is logged in** and has correct permissions

Run this command to see all errors:
```bash
docker logs itiyum-backend --tail 200 | grep -i error
```

