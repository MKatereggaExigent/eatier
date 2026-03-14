# Troubleshooting: Ad Campaign Metrics Not Updating

## Issue
Campaign metrics (impressions, clicks, spent) are showing as 0 on the business ads dashboard at `/business/ads`.

## System Architecture

### 1. Data Flow

```
User Views Page → Ad Component Loads → Fetches Ads → Tracks Impression → Updates Database
                                                    ↓
                                            User Clicks Ad → Tracks Click → Updates Database
                                                    ↓
                                            Business Dashboard → Fetches Campaigns → Shows Metrics
```

### 2. Key Endpoints

#### Frontend Ad Serving
- **Service**: `src/app/core/services/ad-serving.service.ts`
- **Fetch Ads**: `GET /api/ads-public/placements/:placement`
- **Track Impression**: `POST /api/ads-public/impressions/:adId`
- **Track Click**: `POST /api/ads-public/clicks/:adId`

#### Business Dashboard
- **Component**: `src/app/pages/ads/ad-management/ad-management.component.ts`
- **Service**: `src/app/core/services/ad-management.service.ts`
- **Fetch Campaigns**: `GET /api/ads/campaigns/:userId`

#### Backend Routes
- **Public Ads**: `backend/routes/ads-public.js` (tracking endpoints)
- **Campaign Management**: `backend/routes/ads.js` (dashboard data)
- **Business Ads**: `backend/routes/business-ads.js` (alternative endpoints)

### 3. Database Tables
- **ad_campaigns**: Main table storing campaign data including impressions, clicks, spent
- **ad_impressions**: Detailed impression tracking (optional)
- **ad_clicks**: Detailed click tracking (optional)

## Diagnostic Steps

### Step 1: Check if Ads are Being Displayed

1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to homepage or any page with ads
4. Look for requests to `/api/ads-public/placements/`
5. Check the response - are any ads returned?

**Expected Response:**
```json
{
  "placement": "header_banner",
  "ads": [
    {
      "id": "...",
      "title": "...",
      "status": "active",
      ...
    }
  ],
  "count": 1
}
```

### Step 2: Check Ad Display Requirements

For an ad to be displayed, it must meet ALL these criteria:
- `status = 'active'`
- `is_active = true`
- `start_date <= NOW()`
- `end_date IS NULL OR end_date >= NOW()`
- `remaining_amount > 0`
- Has a matching `placement_id` that corresponds to the requested placement

### Step 3: Verify Campaign Settings

Check your campaigns in the database or via API:

```bash
# Using curl (replace USER_ID with actual user ID)
curl http://localhost:3000/api/ads/campaigns/YOUR_USER_ID
```

Check each campaign for:
1. **Status**: Should be `'active'` not `'draft'` or `'paused'`
2. **Start Date**: Should be in the past or now
3. **End Date**: Should be in the future or NULL
4. **Remaining Amount**: Should be > 0
5. **Placement ID**: Should match an existing placement

### Step 4: Check Placement Mapping

The frontend uses these placement names:
- `header_banner` → Maps to position: 'header', page_location: 'homepage'
- `sidebar_left` → Maps to position: 'sidebar', page_location: 'all_pages'
- `sidebar_right` → Maps to position: 'sidebar', page_location: 'all_pages'
- `homepage_banner` → Maps to position: 'hero', page_location: 'homepage'
- `footer_banner` → Maps to position: 'footer', page_location: 'all_pages'

Your campaigns must have a `placement_id` that matches one of these.

### Step 5: Monitor Tracking Requests

1. Open DevTools Network tab
2. Filter by "impressions" or "clicks"
3. View an ad or click on it
4. Check if tracking requests are sent:
   - `POST /api/ads-public/impressions/:adId`
   - `POST /api/ads-public/clicks/:adId`

### Step 6: Check Backend Logs

Look for console logs in your backend terminal:
```
📢 Ads query for placement "header_banner": { ... }
```

This shows which ads were found for each placement.

## Common Issues & Solutions

### Issue 1: Ads Not Displayed (count: 0)
**Causes:**
- Campaign status is not 'active'
- No placement_id set on campaign
- Placement doesn't match any frontend placement
- remaining_amount is 0
- Start date is in the future

**Solution:**
Update your campaigns to ensure they meet all display criteria.

### Issue 2: Impressions Not Tracking
**Causes:**
- Ad component not calling `trackImpression()`
- API endpoint failing silently
- Ad ID already in session cache (only tracks once per session)

**Solution:**
- Check browser console for errors
- Clear browser cache/session
- Check backend logs for tracking errors

### Issue 3: Metrics Show 0 Despite Tracking
**Causes:**
- Wrong user ID in dashboard query
- Campaign belongs to different user
- Database not updating

**Solution:**
- Verify user ID matches campaign owner
- Check database directly for updated values

## Quick Fix Checklist

- [ ] Campaign status is 'active'
- [ ] Campaign has a valid placement_id
- [ ] Campaign start_date is in the past
- [ ] Campaign end_date is NULL or in the future
- [ ] Campaign remaining_amount > 0
- [ ] Campaign total_budget > 0
- [ ] Backend server is running
- [ ] No errors in browser console
- [ ] No errors in backend logs
- [ ] Ads are visible on the page
- [ ] Network requests show tracking calls

## Testing the Fix

### Automated Testing

Run the automated test script:
```bash
node backend/scripts/test_ad_tracking.js
```

This will:
1. Find active campaigns
2. Simulate impressions and clicks
3. Verify metrics are updating
4. Show before/after comparison

### Manual Testing

1. Create a test campaign with:
   - Status: 'active'
   - Start date: NOW()
   - End date: NULL
   - Total budget: 100
   - Remaining amount: 100
   - Valid placement_id

2. Visit the homepage
3. Check if ad appears
4. Click the ad
5. Refresh the dashboard
6. Verify metrics updated

## Step-by-Step Fix Guide

### 1. Run the Diagnostic Script

```bash
# Connect to your database
psql -U your_user -d your_database -f backend/scripts/diagnose_ads.sql
```

This will show you:
- All campaigns and their status
- Which campaigns meet display criteria
- Available placements
- Campaigns with 0 impressions

### 2. Run the Fix Script

```bash
psql -U your_user -d your_database -f backend/scripts/fix_campaign_tracking.sql
```

This will automatically:
- Assign placements to campaigns without one
- Set proper budgets
- Fix start/end dates
- Activate ready campaigns
- Set default CPM/CPC values

### 3. Verify the Fix

```bash
node backend/scripts/test_ad_tracking.js
```

### 4. Check the Dashboard

1. Navigate to `https://itiyum.com/business/ads`
2. You should now see updated metrics
3. If still showing 0, check browser console for errors

## API Endpoint Reference

### Public Endpoints (No Auth Required)

```
GET  /api/ads-public/placements/:placement
     Returns active ads for a specific placement

POST /api/ads-public/impressions/:adId
     Tracks an ad impression

POST /api/ads-public/clicks/:adId
     Tracks an ad click
```

### Business Endpoints (Auth Required)

```
GET  /api/ads/campaigns/:userId
     Returns all campaigns for a user

GET  /api/business-ads/my-ads?userId=:userId
     Alternative endpoint for user campaigns

POST /api/business-ads/my-ads/:adId/start
     Activates a campaign

POST /api/business-ads/my-ads/:adId/pause
     Pauses a campaign
```

## Database Schema Reference

### ad_campaigns Table (Key Columns)

```sql
id                UUID PRIMARY KEY
user_id           UUID (owner of campaign)
business_id       UUID (associated business)
tier_id           UUID (ad tier)
placement_id      UUID (where ad appears)
title             VARCHAR(255)
status            VARCHAR(50) -- 'draft', 'active', 'paused', 'completed'
is_active         BOOLEAN
start_date        TIMESTAMP
end_date          TIMESTAMP
total_budget      DECIMAL(10, 2)
remaining_amount  DECIMAL(10, 2)
spent             DECIMAL(10, 2)
impressions       INTEGER DEFAULT 0
clicks            INTEGER DEFAULT 0
conversions       INTEGER DEFAULT 0
cpm               DECIMAL(10, 4) -- Cost per 1000 impressions
cpc               DECIMAL(10, 4) -- Cost per click
```

## Need More Help?

If metrics are still not updating after following this guide:

1. Check backend server logs for errors
2. Check browser console for JavaScript errors
3. Verify database connection is working
4. Ensure the backend server is running
5. Check that the frontend is pointing to the correct API URL

### Debug Mode

Enable debug logging in the ad-serving service:

```typescript
// In src/app/core/services/ad-serving.service.ts
trackImpression(adId: string): void {
  console.log('🎯 Tracking impression for ad:', adId); // Add this
  // ... rest of code
}

trackClick(adId: string): void {
  console.log('🖱️ Tracking click for ad:', adId); // Add this
  // ... rest of code
}
```

Then check browser console to see if tracking is being called.

