# Business Overview Error - "Unable to load some data"

## Issue
The Business Overview page (`http://localhost:4200/dashboard/business/overview`) is showing:
> "Unable to load some data - Please check your connection and try again."

## Root Cause Analysis

The Overview page makes 3 API calls:
1. `GET /api/business-owner/my-business` - Load business profile
2. `GET /api/business-owner/reviews` - Load recent reviews  
3. `GET /api/business-owner/bookings` - Load recent bookings

One or more of these endpoints is failing, causing the error message.

## Debugging Steps

### 1. Check Browser Console
Open the browser console (F12) and look for:
- Red error messages
- Failed network requests (Status 401, 404, 500, etc.)
- CORS errors

### 2. Check Network Tab
1. Open DevTools → Network tab
2. Refresh the page
3. Look for failed requests (red status codes)
4. Click on each failed request to see the error response

### 3. Check Backend Logs
Look at the terminal where the backend is running for error messages.

## Likely Causes

### Cause 1: Backend Not Running
**Symptom**: All 3 API calls fail with "ERR_CONNECTION_REFUSED"

**Solution**:
```bash
cd backend
node server.js
```

### Cause 2: Authentication Token Missing/Invalid
**Symptom**: API calls return 401 Unauthorized

**Solution**:
1. Log out and log back in
2. Check localStorage for 'auth_token'
3. Verify JWT token is valid

### Cause 3: Reviews Endpoint Not Implemented
**Symptom**: `/api/business-owner/reviews` returns 404 or 500

**Solution**: The reviews endpoint might not be fully implemented in the backend.

**Check**: `backend/routes/business-owner-extended.js` line ~50-100

**Expected endpoint**:
```javascript
router.get('/reviews', authenticateToken, requireBusinessOwner, async (req, res) => {
  try {
    const { rating, page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;
    
    // Get business_id for this user
    const businessResult = await pool.query(
      'SELECT id FROM businesses WHERE user_id = $1 AND tenant_id = $2',
      [userId, req.user.tenantId]
    );
    
    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    const businessId = businessResult.rows[0].id;
    
    // Get reviews
    let query = `
      SELECT * FROM reviews 
      WHERE business_id = $1 AND tenant_id = $2
    `;
    const params = [businessId, req.user.tenantId];
    
    if (rating) {
      query += ` AND rating = $${params.length + 1}`;
      params.push(rating);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, (page - 1) * limit);
    
    const result = await pool.query(query, params);
    
    res.json({
      reviews: result.rows,
      total: result.rows.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});
```

### Cause 4: Bookings Endpoint Not Implemented
**Symptom**: `/api/business-owner/bookings` returns 404 or 500

**Solution**: Similar to reviews, check if the bookings endpoint exists.

### Cause 5: Database Tables Don't Exist
**Symptom**: Backend returns 500 with "relation does not exist" error

**Solution**: Run the migration:
```bash
cd backend
psql -U itiyum_user -d itiyum_platform -f migrations/create_business_owner_tables.sql
```

## Quick Fix

If the reviews/bookings endpoints are failing, you can temporarily disable them in the Overview component:

**File**: `src/app/pages/business/overview/overview.component.ts`

**Change**:
```typescript
private loadAllData(): void {
  this.loadBusinessProfile();
  // this.loadRecentReviews();  // Temporarily disabled
  // this.loadRecentBookings();  // Temporarily disabled
}
```

This will at least show the business profile data without errors.

## Permanent Fix

### Option 1: Implement Missing Endpoints
Add the reviews and bookings endpoints to the backend if they don't exist.

### Option 2: Handle Errors Gracefully
Update the Overview component to not show the error banner if only reviews/bookings fail:

```typescript
hasErrors = computed(() =>
  this.errors().business  // Only show error if business profile fails
  // Don't show error for reviews/bookings - they're optional
);
```

## Testing

After fixing, verify:
1. ✅ Business profile loads
2. ✅ Reviews section shows (even if empty)
3. ✅ Bookings section shows (even if empty)
4. ✅ No error banner appears
5. ✅ Stats display correctly

## Next Steps

1. **Check browser console** - See which API is failing
2. **Check backend logs** - See the error message
3. **Verify endpoints exist** - Check `backend/routes/business-owner-extended.js`
4. **Run migrations** - Ensure database tables exist
5. **Test with Postman** - Verify endpoints work independently

---

**Would you like me to:**
- A) Check the backend routes to see if reviews/bookings endpoints exist?
- B) Temporarily disable the failing endpoints?
- C) Implement the missing endpoints?

