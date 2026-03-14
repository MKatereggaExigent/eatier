# Quick Fix: Ad Metrics Not Showing

## TL;DR - Run These Commands

```bash
# 1. Fix your campaigns
psql -U your_user -d your_database -f backend/scripts/fix_campaign_tracking.sql

# 2. Test the tracking
node backend/scripts/test_ad_tracking.js

# 3. Check your dashboard
# Visit: https://itiyum.com/business/ads
```

## Most Common Issues

### Issue: Campaigns showing but metrics stay at 0

**Cause**: Campaign status is not 'active' or has no budget

**Fix**:
```sql
UPDATE ad_campaigns
SET status = 'active',
    is_active = true,
    total_budget = 100.00,
    remaining_amount = 100.00,
    start_date = CURRENT_TIMESTAMP
WHERE status = 'draft';
```

### Issue: No ads showing on the website

**Cause**: No placement_id assigned

**Fix**:
```sql
UPDATE ad_campaigns ac
SET placement_id = (
    SELECT id FROM ad_placements 
    WHERE page_location = 'homepage' 
    AND position = 'header' 
    LIMIT 1
)
WHERE placement_id IS NULL;
```

### Issue: Ads show but clicks don't track

**Cause**: Tracking endpoint failing or ad already tracked in session

**Fix**:
1. Clear browser cache
2. Open DevTools → Network tab
3. Click an ad
4. Look for POST request to `/api/ads-public/clicks/:adId`
5. Check response for errors

## Checklist for Working Ads

- [ ] Campaign `status = 'active'`
- [ ] Campaign `is_active = true`
- [ ] Campaign has `placement_id`
- [ ] Campaign `start_date <= NOW()`
- [ ] Campaign `end_date IS NULL` or `>= NOW()`
- [ ] Campaign `remaining_amount > 0`
- [ ] Campaign `total_budget > 0`
- [ ] Backend server is running
- [ ] Frontend can reach backend API

## Quick Verification

### Check if ads are visible:
```bash
curl http://localhost:3000/api/ads-public/placements/header_banner
```

Should return JSON with ads array.

### Check campaign data:
```bash
curl http://localhost:3000/api/ads/campaigns/YOUR_USER_ID
```

Should return campaigns with impressions/clicks.

### Manually track an impression:
```bash
curl -X POST http://localhost:3000/api/ads-public/impressions/YOUR_AD_ID
```

Should return `{"success": true}`

### Manually track a click:
```bash
curl -X POST http://localhost:3000/api/ads-public/clicks/YOUR_AD_ID
```

Should return `{"success": true}`

## Files to Check

1. **Frontend Ad Service**: `src/app/core/services/ad-serving.service.ts`
   - Handles fetching and tracking ads

2. **Backend Tracking Routes**: `backend/routes/ads-public.js`
   - Handles impression/click tracking

3. **Backend Campaign Routes**: `backend/routes/ads.js`
   - Handles campaign data for dashboard

4. **Database Schema**: `backend/scripts/schema-with-rbac-multitenancy.sql`
   - Shows table structure

## Still Not Working?

1. Check backend logs for errors
2. Check browser console for errors
3. Verify database connection
4. Run diagnostic script: `backend/scripts/diagnose_ads.sql`
5. Read full guide: `TROUBLESHOOTING_ADS_METRICS.md`

## Support

If you're still stuck, check:
- Backend server is running on port 3000
- Database is accessible
- No CORS errors in browser console
- API URL in `environment.ts` is correct

