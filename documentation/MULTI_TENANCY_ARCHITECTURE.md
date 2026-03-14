# Multi-Tenancy Architecture & Business Owner Content Management

## Overview
This document outlines the multi-tenancy architecture for the Itiyum platform and the required business owner content management system.

## Database Architecture

### Multi-Tenancy Pattern
All content tables follow this pattern:
- `tenant_id` - References the tenant (business) that owns the data
- `business_id` - References the specific business location/entity
- `user_id` - References the user who created/owns the record
- Proper foreign keys with CASCADE delete
- Indexes on tenant_id, business_id, and user_id for performance

### Existing Tables with Multi-Tenancy ✅

#### 1. `businesses` Table
- **Columns**: `id`, `tenant_id`, `owner_id`, `business_name`, `business_type`, `email`, `phone`, `country`, `address`, `sustainability_ethos`, `opens_at`, `closes_at`, `facilities`, `location_links`, `bio`, `profile_photos`, `background_image`, `account_status`, `created_at`, `updated_at`
- **Purpose**: Stores business information (About section, Location, Hours)
- **Multi-tenancy**: ✅ Has `tenant_id` and `owner_id`
- **Indexes**: ✅ `idx_businesses_tenant_id`, `idx_businesses_owner_id`
- **Foreign Keys**: ✅ `tenant_id → tenants(id)`, `owner_id → users(id)`

#### 2. `menus` Table
- **Columns**: `id`, `tenant_id`, `business_id`, `title`, `category`, `description`, `price`, `background_image`, `is_active`, `created_at`, `updated_at`
- **Purpose**: Stores menu items/dishes (Popular Dishes section)
- **Multi-tenancy**: ✅ Has `tenant_id` and `business_id`
- **Indexes**: ✅ Indexed on tenant_id and business_id
- **Foreign Keys**: ✅ `tenant_id → tenants(id)`, `business_id → businesses(id)`

#### 3. `bookings` Table
- **Columns**: `id`, `tenant_id`, `user_id`, `business_id`, `booking_date`, `booking_time`, `party_size`, `status`, `special_requests`, `total_amount`, `created_at`, `updated_at`
- **Purpose**: Stores customer bookings
- **Multi-tenancy**: ✅ Has `tenant_id`, `business_id`, and `user_id`
- **Indexes**: ✅ `idx_bookings_tenant_id`, `idx_bookings_business_id`, `idx_bookings_user_id`
- **Foreign Keys**: ✅ All properly configured

#### 4. `reviews` Table (NEWLY CREATED ✅)
- **Columns**: `id`, `tenant_id`, `business_id`, `user_id`, `rating`, `title`, `comment`, `images`, `visit_date`, `would_recommend`, `helpful_count`, `not_helpful_count`, `response_from_owner`, `response_date`, `status`, `is_verified_visit`, `created_at`, `updated_at`
- **Purpose**: Stores customer reviews (Reviews section)
- **Multi-tenancy**: ✅ Has `tenant_id`, `business_id`, and `user_id`
- **Indexes**: ✅ All required indexes created
- **Foreign Keys**: ✅ All properly configured
- **Constraints**: ✅ One review per user per business

#### 5. `review_votes` Table (NEWLY CREATED ✅)
- **Columns**: `id`, `review_id`, `user_id`, `is_helpful`, `created_at`
- **Purpose**: Tracks helpful/not helpful votes on reviews
- **Constraints**: ✅ One vote per user per review

## Restaurant Detail Page Content Mapping

### Current Page Sections → Database Tables

| Page Section | Database Table | Multi-Tenancy | Status |
|-------------|----------------|---------------|--------|
| **About** (bio, description) | `businesses.bio`, `businesses.sustainability_ethos` | ✅ tenant_id, owner_id | ✅ Exists |
| **Hours** (operating hours) | `businesses.opens_at`, `businesses.closes_at` | ✅ tenant_id, owner_id | ✅ Exists |
| **Location** (address, map) | `businesses.address`, `businesses.latitude`, `businesses.longitude` | ✅ tenant_id, owner_id | ✅ Exists |
| **Popular Dishes** (menu items) | `menus` table | ✅ tenant_id, business_id | ✅ Exists |
| **Reviews** (customer reviews) | `reviews` table | ✅ tenant_id, business_id, user_id | ✅ Just Created |

## Required Backend API Endpoints

### For Business Owners (Authenticated, RBAC-protected)

All endpoints must:
1. Require authentication (`authenticateToken` middleware)
2. Check user role (Business Owner or Platform Admin)
3. Filter by `tenant_id` AND `business_id` to ensure data isolation
4. Return 403 Forbidden if user doesn't own the business

#### Business Information Management
- `GET /api/business-owner/business` - Get own business info
- `PUT /api/business-owner/business` - Update business info (About, Hours, Location)
- `POST /api/business-owner/business/photos` - Upload profile photos
- `DELETE /api/business-owner/business/photos/:photoId` - Delete photo

#### Menu Management
- `GET /api/business-owner/menu` - Get all menu items for own business ✅ EXISTS
- `POST /api/business-owner/menu` - Create new menu item
- `PUT /api/business-owner/menu/:menuId` - Update menu item
- `DELETE /api/business-owner/menu/:menuId` - Delete menu item

#### Reviews Management
- `GET /api/business-owner/reviews` - Get all reviews for own business ✅ EXISTS
- `POST /api/business-owner/reviews/:reviewId/respond` - Respond to review ✅ EXISTS
- `PUT /api/business-owner/reviews/:reviewId/respond` - Update response ✅ EXISTS

### For Public (No authentication required)

- `GET /api/businesses/:businessId` - Get business info ✅ EXISTS
- `GET /api/menus/business/:businessId` - Get menu items ✅ EXISTS
- `GET /api/reviews/business/:businessId` - Get reviews (NEEDS TO BE CREATED)

## Required Frontend Pages

### For Business Owners (Authenticated)

All pages must be protected by route guards checking for Business Owner role.

#### 1. Business Dashboard (`/business-owner/dashboard`)
- Overview of business stats
- Recent bookings
- Recent reviews
- Quick actions

#### 2. Business Profile Management (`/business-owner/profile`)
- Edit business name, type, contact info
- Edit About section (bio, sustainability ethos)
- Edit Hours (opens_at, closes_at)
- Edit Location (address, Google Maps integration)
- Upload/manage photos
- Edit facilities and location links

#### 3. Menu Management (`/business-owner/menu`)
- View all menu items in a table/grid
- Create new menu item (title, category, description, price, photo)
- Edit existing menu items
- Delete menu items
- Toggle active/inactive status

#### 4. Reviews Management (`/business-owner/reviews`)
- View all reviews for the business
- Filter by rating (1-5 stars)
- Respond to reviews
- Edit responses
- View helpful/not helpful counts

#### 5. Bookings Management (`/business-owner/bookings`)
- View all bookings
- Filter by status (pending, confirmed, cancelled, completed)
- Update booking status
- View customer details

## RBAC Implementation

### Role Permissions

#### Business Owner
- Can view/edit/delete ONLY their own business data
- Can view/respond to reviews for their business
- Can manage their own menu items
- Can view/manage bookings for their business

#### Platform Admin (Itiyum Admin)
- Can view/edit/delete ALL business data
- Can moderate ALL reviews
- Can manage ALL menu items
- Can view ALL bookings

### Backend Authorization Pattern

```javascript
// Example middleware for business owner endpoints
router.get('/business', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const tenantId = req.user.tenant_id;
  
  // Get business owned by this user in this tenant
  const result = await pool.query(`
    SELECT * FROM businesses 
    WHERE owner_id = $1 AND tenant_id = $2
  `, [userId, tenantId]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Business not found' });
  }
  
  res.json({ business: result.rows[0] });
});
```

## Next Steps

1. ✅ Create reviews table with multi-tenancy
2. ⏳ Create public API endpoint for reviews: `GET /api/reviews/business/:businessId`
3. ⏳ Update restaurant detail page to load real reviews from API
4. ⏳ Create business owner frontend pages for content management
5. ⏳ Implement RBAC checks in all backend endpoints
6. ⏳ Add route guards to protect business owner pages

