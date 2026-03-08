# Smart Recommendations & Restaurant Visits Tracking

## 🎯 Problems Fixed

### 1. ❌ "Restaurants Visited" Always Showing 0
**Problem**: The dashboard was counting only bookings, not actual restaurant page views.

**Solution**: Now tracks unique restaurant profile page views using the `page_view_events` table.

### 2. ❌ Empty Recommendations
**Problem**: Recommendations weren't personalized and didn't show any restaurants.

**Solution**: Implemented smart recommendation algorithm based on:
- ✅ User's page view history (what they click on)
- ✅ Cuisine preferences
- ✅ Collaborative filtering (similar to restaurants they've viewed)
- ✅ Restaurant ratings and popularity
- ✅ Excludes already favorited/reviewed restaurants

---

## 🔧 Changes Made

### Backend Changes

#### 1. **Updated `/api/users/:userId/stats` Endpoint**

**File**: `backend/routes/user-data.js`

**Added**:
```javascript
// Get unique restaurants visited (based on page views)
const restaurantsVisitedResult = await pool.query(`
  SELECT COUNT(DISTINCT business_id) as count 
  FROM page_view_events
  WHERE user_id = $1 AND tenant_id = $2 AND page_type = 'profile'
`, [userId, tenantId]);

const restaurantsVisited = parseInt(restaurantsVisitedResult.rows[0].count) || 0;
```

**Returns**:
```json
{
  "totalReviews": 5,
  "totalBookings": 2,
  "totalFavorites": 3,
  "totalPhotos": 10,
  "restaurantsVisited": 15  // ✅ NEW: Based on page views
}
```

#### 2. **Improved `/api/users/:userId/recommendations` Endpoint**

**File**: `backend/routes/user-data.js`

**New Features**:
- 📊 **Smart Scoring System**: Ranks restaurants based on multiple factors
- 🎯 **Cuisine Matching**: +20 points if cuisine matches user preferences
- 👥 **Collaborative Filtering**: +15 points if similar to restaurants user has viewed
- ⭐ **Rating Bonus**: Base score from average rating × 10
- 📈 **Popularity Bonus**: Extra points for highly reviewed restaurants

**Scoring Formula**:
```sql
recommendation_score = 
  (average_rating * 10) +
  (cuisine_match ? 20 : 0) +
  (similar_to_viewed ? 15 : 0) +
  (review_count / 10)
```

**Example**:
- Restaurant with 4.5★ rating = 45 points
- Matches user's cuisine preference = +20 points
- Similar to restaurants user viewed = +15 points
- Has 50 reviews = +5 points
- **Total Score**: 85 points

---

### Frontend Changes

#### 1. **Updated UserStats Interface**

**File**: `src/app/core/services/user.service.ts`

```typescript
export interface UserStats {
  totalReviews: number;
  totalBookings: number;
  totalFavorites: number;
  totalPhotos: number;
  restaurantsVisited?: number;  // ✅ NEW
}
```

#### 2. **Updated Dashboard Component**

**File**: `src/app/pages/food-enthusiast/overview/food-enthusiast-overview.component.ts`

```typescript
.subscribe(stats => {
  // Use restaurantsVisited from page views, fallback to bookings
  const visited = stats.restaurantsVisited || stats.totalBookings || 0;
  
  this.userStats.set({
    reviewsWritten: stats.totalReviews || 0,
    restaurantsVisited: visited,  // ✅ Now shows page views
    cuisinesExplored: Math.floor(visited / 3),
    monthlyProgress: Math.min(visited, 8)
  });
});
```

---

## 📊 How It Works

### Restaurant Visits Tracking

1. **User visits a restaurant page** → `InsightsService.trackPageView()` is called
2. **Page view recorded** in `page_view_events` table with:
   - `user_id`
   - `business_id`
   - `page_type = 'profile'`
   - `tenant_id`
3. **Dashboard queries** unique `business_id` count for the user
4. **"Restaurants Visited"** shows the count

### Smart Recommendations

1. **Get user's viewing history**:
   ```sql
   SELECT business_id, COUNT(*) as view_count
   FROM page_view_events
   WHERE user_id = $1 AND page_type = 'profile'
   ```

2. **Get user's cuisine preferences**:
   ```sql
   SELECT cuisine_preferences FROM user_preferences
   WHERE user_id = $1
   ```

3. **Score each restaurant**:
   - Base score from ratings
   - Bonus for matching cuisines
   - Bonus for similarity to viewed restaurants
   - Bonus for popularity

4. **Return top-scored restaurants** that user hasn't favorited/reviewed

---

## 🚀 Deployment

### Commit and Deploy

```bash
# Add the changes
git add backend/routes/user-data.js
git add src/app/core/services/user.service.ts
git add src/app/pages/food-enthusiast/overview/food-enthusiast-overview.component.ts
git add SMART_RECOMMENDATIONS_FIX.md

# Commit
git commit -m "Fix: Smart recommendations and restaurant visits tracking

- Track restaurants visited based on page views (not just bookings)
- Implement smart recommendation algorithm with scoring system
- Add collaborative filtering based on user's viewing history
- Match recommendations to user's cuisine preferences
- Exclude already favorited/reviewed restaurants
- Fix 'Restaurants Visited' always showing 0

Backend:
- Updated /api/users/:userId/stats to include restaurantsVisited
- Improved /api/users/:userId/recommendations with smart scoring
- Use page_view_events table for visit tracking

Frontend:
- Updated UserStats interface to include restaurantsVisited
- Dashboard now shows actual page view count
- Recommendations now personalized based on user behavior"

# Push
git push origin development-v2

# Deploy
./latest_caprover_deployment.sh
```

---

## ✅ Expected Results After Deployment

### 1. **Restaurants Visited**
- ✅ Shows count of unique restaurant pages you've viewed
- ✅ Updates in real-time as you browse restaurants
- ✅ Separate from bookings (more accurate)

### 2. **Recommendations**
- ✅ Shows restaurants matching your cuisine preferences
- ✅ Considers restaurants similar to ones you've viewed
- ✅ Excludes restaurants you've already favorited/reviewed
- ✅ Sorted by smart scoring algorithm
- ✅ Personalized based on your behavior

---

## 🧪 Testing

After deployment, test by:

1. **Visit several restaurant pages** (e.g., 5-10 different restaurants)
2. **Go to Food Enthusiast Dashboard** (`/dashboard/food-enthusiast/overview`)
3. **Check "Restaurants Visited"** - should show the count of unique restaurants viewed
4. **Check "Recommended for You"** - should show personalized recommendations
5. **Add a restaurant to favorites** - it should disappear from recommendations
6. **Write a review** - that restaurant should also disappear from recommendations

---

## 📝 Notes

- Page views are tracked automatically when you visit restaurant detail pages
- The `InsightsService` is already integrated in `restaurant-detail.component.ts`
- Recommendations update based on your latest behavior
- Multi-tenancy is enforced (only shows restaurants from your tenant)
- RBAC is enforced (users can only see their own stats and recommendations)

