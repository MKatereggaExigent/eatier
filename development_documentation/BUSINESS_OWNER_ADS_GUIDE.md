# Business Owner Ads Pipeline - Complete Guide

## ✅ Status: FULLY IMPLEMENTED

The ads pipeline for business owners is **already fully built and integrated** with the database, payment system, and subscription features.

## Correct URLs

### ✅ Working URLs:
- **Ad Management**: `https://itiyum.com/business/ads`
- **Create Ad**: `https://itiyum.com/business/ads/create`
- **Edit Ad**: `https://itiyum.com/business/ads/{adId}/edit`

### ❌ Invalid URLs:
- `https://itiyum.com/business-owner/ads/create` (This route does NOT exist)

## Architecture Overview

### 1. Frontend Components

**Ad Management** (`src/app/pages/ads/ad-management/ad-management.component.ts`)
- View all ad campaigns
- Filter by status (draft, active, paused, completed)
- Campaign analytics (impressions, clicks, CTR)
- Start/pause/delete campaigns

**Ad Creation** (`src/app/pages/ads/ad-creation/ad-creation.component.ts`)
- 6-step wizard:
  1. Basic Info (title, description, type, category)
  2. Tier & Placement Selection
  3. Targeting (regions, cities, locations)
  4. Content (headline, body, CTA, media)
  5. Budget (total budget, daily budget, currency)
  6. Schedule (start date, end date)

### 2. Backend API Endpoints

**Base URL**: `/api/business-ads`

**Campaign Management**:
- `GET /my-ads` - Get all user's ad campaigns
- `GET /my-ads/:adId` - Get specific ad campaign
- `POST /my-ads` - Create new ad campaign
- `PUT /my-ads/:adId` - Update ad campaign
- `DELETE /my-ads/:adId` - Delete ad campaign

**Campaign Actions**:
- `POST /my-ads/:adId/start` - Start/activate campaign
- `POST /my-ads/:adId/pause` - Pause campaign
- `POST /my-ads/:adId/payment` - Initialize payment for campaign

**Tier & Placement**:
- `GET /tiers` - Get all ad tiers with placements
- `GET /placements/:tierId` - Get placements for specific tier

**Analytics**:
- `GET /my-ads/:adId/analytics` - Get campaign analytics

### 3. Database Tables

**ad_campaigns**
- Stores all ad campaign data
- Links to: `users`, `businesses`, `tenants`, `ad_space_tiers`, `ad_placements`
- Tracks: budget, spend, impressions, clicks, conversions

**ad_space_tiers**
- Defines ad tiers (basic, standard, premium, featured)
- Pricing: daily, weekly, monthly
- Features: video support, animation, priority weight

**ad_placements**
- Specific ad positions (header, sidebar, footer, etc.)
- Dimensions, rotation intervals
- Linked to tiers

**ad_campaign_daily_stats**
- Daily performance metrics
- Impressions, clicks, conversions, spend, CTR

### 4. Payment Integration

**Paystack Integration**:
- Minimum budget: $5 (or R5 for ZAR)
- Payment flow:
  1. Create ad campaign (status: draft)
  2. Initialize Paystack payment
  3. Redirect to Paystack checkout
  4. Verify payment callback
  5. Activate campaign (status: active)

**Payment Endpoints**:
- `POST /my-ads/:adId/payment` - Initialize payment
- `POST /my-ads/:adId/verify-payment` - Verify and activate

### 5. Subscription Feature Gating

**Advertising Credits** (from subscription plans):
- Basic: R0 ad credits/month
- Professional: R50 ad credits/month
- Enterprise: R200 ad credits/month

**Feature Check**:
```typescript
if (plan.advertising_credits > 0) {
  // User has ad credits
  // Can create ads with credits applied
}
```

## How to Use (Business Owner)

### Step 1: Navigate to Ads
1. Log in as business owner
2. Go to `https://itiyum.com/business/ads`
3. Click "Create Campaign" button

### Step 2: Create Ad Campaign
1. **Basic Info**: Enter title, description, select type
2. **Tier & Placement**: Choose ad tier and placement
3. **Targeting**: Select target regions/cities
4. **Content**: Add headline, body text, CTA, upload media
5. **Budget**: Set total and daily budget (min $5)
6. **Schedule**: Set start and end dates
7. Click "Create Campaign"

### Step 3: Payment
1. Redirected to Paystack checkout
2. Complete payment
3. Redirected back to ad management
4. Campaign status: "active"

### Step 4: Monitor Performance
1. View campaign in ad management dashboard
2. Check impressions, clicks, CTR
3. Pause/resume as needed

## Testing

### Test Ad Creation:
```bash
# Navigate to
https://itiyum.com/business/ads/create

# Fill in the form:
- Title: "Summer Special Offer"
- Description: "Get 20% off all meals"
- Tier: "Standard"
- Placement: "Header Banner"
- Budget: R50
- Start Date: Today
- End Date: +30 days

# Complete payment with test card:
- Card: 4084 0840 8408 4081
- CVV: 408
- PIN: 0000
- OTP: 123456
```

## Next Steps

1. ✅ Ads pipeline is fully functional
2. ✅ Payment integration works
3. ✅ Database tables are wired up
4. ⚠️ **Update any links** pointing to `/business-owner/ads/*` to use `/business/ads/*`
5. 🔄 Consider adding subscription feature checks to limit ad creation based on plan

## Files Reference

- **Frontend**: `src/app/pages/ads/`
- **Backend**: `backend/routes/business-ads.js`
- **Service**: `src/app/core/services/ad-management.service.ts`
- **Routes**: `src/app/app.routes.ts` (lines 142-144)
- **Database**: `backend/scripts/schema-with-rbac-multitenancy.sql` (ad tables)

