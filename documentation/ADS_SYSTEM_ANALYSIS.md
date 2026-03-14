# Ad System Analysis - Metrics Not Updating Issue

## Problem Statement

The business dashboard at `https://itiyum.com/business/ads` shows all campaigns with:
- Budget: R0.00
- Spent: R0.00
- Impressions: 0
- Clicks: 0
- CTR: 0.00%
- Dates: N/A

Even after clicking on ads, the metrics remain at zero.

## Root Cause Analysis

Based on the codebase investigation, the issue is likely one or more of the following:

### 1. **Campaigns Not Being Displayed** (Most Likely)

For an ad to be served by the API, it must pass ALL these checks in `backend/routes/ads-public.js`:

```sql
WHERE ac.status = 'active'
  AND ac.is_active = true
  AND ac.start_date <= CURRENT_TIMESTAMP
  AND (ac.end_date IS NULL OR ac.end_date >= CURRENT_TIMESTAMP)
  AND ac.remaining_amount > 0
  AND p.position = $1
  AND p.page_location = $2
```

**Your campaigns show `Budget R0.00`** which means `remaining_amount = 0`, causing them to be filtered out.

### 2. **Missing Placement Assignment**

Campaigns need a valid `placement_id` that maps to an `ad_placements` record with the correct:
- `position` (e.g., 'header', 'sidebar', 'hero')
- `page_location` (e.g., 'homepage', 'all_pages')

### 3. **Date Range Issues**

- `start_date` might be in the future
- `end_date` might be in the past
- Dates showing as "N/A" suggests they're not set properly

## System Architecture

### Data Flow

```
Frontend Component → AdServingService → Backend API → Database
     ↓                      ↓                ↓            ↓
Display Ad          Track Impression    Update Stats   ad_campaigns
     ↓                      ↓                             ↓
User Clicks         Track Click                    Business Dashboard
```

### Key Files

1. **Frontend**:
   - `src/app/core/services/ad-serving.service.ts` - Fetches and tracks ads
   - `src/app/core/services/ad-management.service.ts` - Manages campaigns
   - `src/app/pages/ads/ad-management/ad-management.component.ts` - Dashboard UI

2. **Backend**:
   - `backend/routes/ads-public.js` - Public ad serving and tracking
   - `backend/routes/ads.js` - Campaign management API
   - `backend/routes/business-ads.js` - Alternative business endpoints

3. **Database**:
   - `ad_campaigns` - Main campaign table
   - `ad_placements` - Available ad positions
   - `ad_space_tiers` - Pricing tiers

### API Endpoints

#### Public (No Auth)
- `GET /api/ads-public/placements/:placement` - Fetch ads for display
- `POST /api/ads-public/impressions/:adId` - Track impression
- `POST /api/ads-public/clicks/:adId` - Track click

#### Business (Auth Required)
- `GET /api/ads/campaigns/:userId` - Get user's campaigns (used by dashboard)
- `POST /api/business-ads/my-ads/:adId/start` - Activate campaign
- `POST /api/business-ads/my-ads/:adId/pause` - Pause campaign

## Solution

### Quick Fix (Recommended)

Run these commands in order:

```bash
# 1. Diagnose the issue
psql -U your_user -d your_database -f backend/scripts/diagnose_ads.sql

# 2. Apply automatic fixes
psql -U your_user -d your_database -f backend/scripts/fix_campaign_tracking.sql

# 3. Test the tracking system
node backend/scripts/test_ad_tracking.js

# 4. Verify in dashboard
# Visit: https://itiyum.com/business/ads
```

### Manual Fix for Specific Campaign

```sql
-- Replace 'YOUR_CAMPAIGN_ID' with actual ID
UPDATE ad_campaigns
SET 
    status = 'active',
    is_active = true,
    start_date = CURRENT_TIMESTAMP,
    end_date = CURRENT_TIMESTAMP + INTERVAL '30 days',
    total_budget = 100.00,
    remaining_amount = 100.00,
    daily_budget = 10.00,
    cpm = 2.00,
    cpc = 0.50,
    placement_id = (
        SELECT id FROM ad_placements 
        WHERE page_location = 'homepage' 
        AND position = 'header' 
        LIMIT 1
    )
WHERE id = 'YOUR_CAMPAIGN_ID';
```

## Verification Steps

### 1. Check if ads are being served

```bash
curl http://localhost:3000/api/ads-public/placements/header_banner
```

Expected: JSON response with ads array containing your campaigns.

### 2. Check campaign data

```bash
curl http://localhost:3000/api/ads/campaigns/YOUR_USER_ID
```

Expected: Campaigns with non-zero budgets and proper dates.

### 3. Test impression tracking

```bash
curl -X POST http://localhost:3000/api/ads-public/impressions/YOUR_AD_ID
```

Expected: `{"success": true}` and impressions count increases.

### 4. Test click tracking

```bash
curl -X POST http://localhost:3000/api/ads-public/clicks/YOUR_AD_ID
```

Expected: `{"success": true}` and clicks count increases.

## Next Steps

1. **Run the fix script** to automatically correct common issues
2. **Run the test script** to verify tracking is working
3. **Check the dashboard** to see updated metrics
4. **Monitor browser console** for any JavaScript errors
5. **Monitor backend logs** for any API errors

## Additional Resources

- **Full Troubleshooting Guide**: `TROUBLESHOOTING_ADS_METRICS.md`
- **Quick Reference**: `ADS_QUICK_FIX.md`
- **Diagnostic Script**: `backend/scripts/diagnose_ads.sql`
- **Fix Script**: `backend/scripts/fix_campaign_tracking.sql`
- **Test Script**: `backend/scripts/test_ad_tracking.js`

