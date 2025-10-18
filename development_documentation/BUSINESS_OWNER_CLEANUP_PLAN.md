# Business Owner Role - Complete Cleanup Plan

## 📋 Overview

This document outlines the complete cleanup and implementation plan for the **Business Owner** role in the Itiyum platform.

**Goal**: Remove all dummy/placeholder data, redesign pages professionally, create all necessary database tables, and implement all backend endpoints with proper authentication and RBAC.

---

## 🎯 Current State Analysis

### Existing Pages (Frontend)
1. ✅ **Overview/Dashboard** - `src/app/pages/business/overview/`
2. ✅ **Business Dashboard** - `src/app/pages/business/dashboard/`
3. ✅ **Menu Management** - `src/app/pages/business/menu/`
4. ✅ **Business Profile** - `src/app/pages/business/profile/`
5. ✅ **Reviews** - `src/app/pages/business/reviews/`
6. ✅ **Insights/Analytics** - `src/app/pages/business/insights/`
7. ✅ **Digital Card** - `src/app/pages/business/digital-card/`
8. ✅ **Accounts Center** - `src/app/pages/business/accounts/`

### Existing Backend Routes
- ✅ `/api/businesses` - Basic CRUD operations
- ⚠️ **Missing**: Business owner-specific endpoints with RBAC
- ⚠️ **Missing**: Menu management endpoints
- ⚠️ **Missing**: Reviews management endpoints
- ⚠️ **Missing**: Analytics/insights endpoints
- ⚠️ **Missing**: Booking management for business owners

---

## 📊 Database Tables Needed

### 1. ✅ **businesses** (Already exists)
```sql
- id, tenant_id, owner_id
- business_name, business_type, email, phone
- country, address, sustainability_ethos
- opens_at, closes_at, facilities
- account_status, created_at, updated_at
```

### 2. ✅ **menus** (Already exists)
```sql
- id, tenant_id, business_id
- item_name, description, price, category
- image_url, is_available, dietary_info
- created_at, updated_at
```

### 3. ✅ **bookings** (Already exists)
```sql
- id, tenant_id, user_id, business_id
- booking_date, booking_time, party_size
- status, special_requests, total_amount
- created_at, updated_at
```

### 4. ⚠️ **reviews** (Need to verify/create)
```sql
- id, tenant_id, user_id, business_id
- rating, comment, images
- helpful_count, response_from_owner
- status, created_at, updated_at
```

### 5. ⚠️ **business_hours** (Need to create)
```sql
- id, business_id
- day_of_week (0-6)
- open_time, close_time
- is_closed (for holidays)
```

### 6. ⚠️ **business_photos** (Need to create)
```sql
- id, business_id
- photo_url, caption, display_order
- is_primary, created_at
```

### 7. ⚠️ **business_analytics** (Materialized view or table)
```sql
- business_id, date
- total_views, total_bookings, total_revenue
- average_rating, review_count
- updated_at
```

---

## 🔧 Backend Endpoints to Create

### Business Management
- [ ] `GET /api/business/my-business` - Get current user's business
- [ ] `PUT /api/business/my-business` - Update business profile
- [ ] `POST /api/business/my-business/photos` - Upload business photos
- [ ] `DELETE /api/business/my-business/photos/:id` - Delete photo
- [ ] `PUT /api/business/my-business/hours` - Update business hours

### Menu Management
- [ ] `GET /api/business/menu` - Get all menu items for current business
- [ ] `POST /api/business/menu` - Create new menu item
- [ ] `PUT /api/business/menu/:id` - Update menu item
- [ ] `DELETE /api/business/menu/:id` - Delete menu item
- [ ] `PATCH /api/business/menu/:id/availability` - Toggle availability

### Booking Management
- [ ] `GET /api/business/bookings` - Get all bookings for current business
- [ ] `GET /api/business/bookings/:id` - Get booking details
- [ ] `PATCH /api/business/bookings/:id/status` - Update booking status
- [ ] `GET /api/business/bookings/calendar` - Get calendar view of bookings

### Reviews Management
- [ ] `GET /api/business/reviews` - Get all reviews for current business
- [ ] `POST /api/business/reviews/:id/response` - Respond to a review
- [ ] `GET /api/business/reviews/stats` - Get review statistics

### Analytics & Insights
- [ ] `GET /api/business/analytics/overview` - Dashboard overview stats
- [ ] `GET /api/business/analytics/revenue` - Revenue trends
- [ ] `GET /api/business/analytics/bookings` - Booking trends
- [ ] `GET /api/business/analytics/popular-items` - Most popular menu items
- [ ] `GET /api/business/analytics/customer-demographics` - Customer insights

---

## 🎨 Frontend Pages to Clean Up

### Priority 1: Core Business Management

#### 1. **Business Dashboard** (`dashboard.component.ts`)
**Current Issues:**
- Placeholder/dummy data
- No real API integration
- Generic styling

**Cleanup Tasks:**
- [ ] Remove all dummy data
- [ ] Integrate with real backend APIs
- [ ] Add proper loading states
- [ ] Implement error handling
- [ ] Redesign with professional UI (similar to admin dashboard)
- [ ] Add real-time statistics
- [ ] Add quick action buttons

#### 2. **Business Profile** (`business-profile.component.ts`)
**Cleanup Tasks:**
- [ ] Remove placeholder data
- [ ] Create form for editing business details
- [ ] Add photo upload functionality
- [ ] Add business hours management
- [ ] Integrate with `PUT /api/business/my-business`
- [ ] Add validation
- [ ] Professional form design

#### 3. **Menu Management** (`menu-management.component.ts`)
**Cleanup Tasks:**
- [ ] Remove dummy menu items
- [ ] Integrate with menu API endpoints
- [ ] Add create/edit/delete functionality
- [ ] Add photo upload for menu items
- [ ] Add category management
- [ ] Add availability toggle
- [ ] Drag-and-drop reordering
- [ ] Professional table/card design

### Priority 2: Customer Interaction

#### 4. **Bookings Management** (New or update existing)
**Cleanup Tasks:**
- [ ] Create bookings list view
- [ ] Add calendar view
- [ ] Add status management (pending, confirmed, completed, cancelled)
- [ ] Add filters (date range, status)
- [ ] Add booking details modal
- [ ] Integrate with booking APIs
- [ ] Add notifications for new bookings

#### 5. **Reviews Management** (`business-reviews.component.ts`)
**Cleanup Tasks:**
- [ ] Remove dummy reviews
- [ ] Integrate with reviews API
- [ ] Add response functionality
- [ ] Add review statistics
- [ ] Add filters (rating, date)
- [ ] Professional review card design

### Priority 3: Analytics & Growth

#### 6. **Business Insights** (`business-insights.component.ts`)
**Cleanup Tasks:**
- [ ] Remove placeholder charts
- [ ] Integrate with analytics APIs
- [ ] Add revenue charts
- [ ] Add booking trends
- [ ] Add popular items analysis
- [ ] Add customer demographics
- [ ] Use Chart.js or similar library
- [ ] Professional dashboard design

#### 7. **Digital Card** (`digital-card.component.ts`)
**Cleanup Tasks:**
- [ ] Remove placeholder data
- [ ] Generate QR code for business
- [ ] Add shareable link
- [ ] Add download/print functionality
- [ ] Professional card design

---

## 🔐 Security & RBAC Implementation

### Authentication Middleware
- [ ] Apply `authenticateToken` to all business endpoints
- [ ] Create `requireBusinessOwner` middleware
- [ ] Verify business ownership in all endpoints

### Data Isolation
- [ ] Ensure business owners only see their own business data
- [ ] Filter bookings by business_id
- [ ] Filter reviews by business_id
- [ ] Filter menu items by business_id
- [ ] Enforce tenant_id in all queries

---

## 📝 Implementation Order

### Phase 1: Database & Backend (Week 1)
1. [ ] Create missing database tables
2. [ ] Create business management endpoints
3. [ ] Create menu management endpoints
4. [ ] Add authentication middleware
5. [ ] Test all endpoints with Postman/curl

### Phase 2: Core Pages (Week 2)
6. [ ] Clean up Business Dashboard
7. [ ] Clean up Business Profile
8. [ ] Clean up Menu Management
9. [ ] Integrate with backend APIs
10. [ ] Add proper error handling

### Phase 3: Customer Interaction (Week 3)
11. [ ] Clean up Bookings Management
12. [ ] Clean up Reviews Management
13. [ ] Add real-time features
14. [ ] Add notifications

### Phase 4: Analytics & Polish (Week 4)
15. [ ] Clean up Business Insights
16. [ ] Add charts and visualizations
17. [ ] Clean up Digital Card
18. [ ] Final UI polish
19. [ ] Testing and bug fixes

---

## ✅ Success Criteria

### Functionality
- [ ] All pages load real data from backend
- [ ] No placeholder/dummy data visible
- [ ] All CRUD operations work correctly
- [ ] Proper error handling and loading states
- [ ] Authentication and RBAC enforced

### Design
- [ ] Professional, modern UI design
- [ ] Consistent with admin dashboard styling
- [ ] Responsive on all devices
- [ ] Accessible (WCAG 2.1 AA)

### Security
- [ ] All endpoints require authentication
- [ ] Business owners can only access their own data
- [ ] Multi-tenancy enforced
- [ ] Input validation on all forms
- [ ] SQL injection prevention

### Performance
- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms
- [ ] Optimized database queries
- [ ] Proper caching where applicable

---

## 🚀 Ready to Start!

**Next Step**: Begin with Phase 1 - Database & Backend setup.

Would you like me to start implementing?

