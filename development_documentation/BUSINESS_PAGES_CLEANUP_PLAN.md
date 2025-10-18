# Business Pages Cleanup Plan - NYT Theme & Real Data

## Objective
Update all business owner pages to:
1. Match admin pages styling (NYT theme with Roboto/Inter fonts)
2. Remove ALL dummy/placeholder data
3. Connect to real backend APIs
4. Ensure database tables exist
5. Implement proper loading states and error handling

---

## Pages to Update

### ✅ 1. Business Overview (`/dashboard/business/overview`)
**Status**: COMPLETED (Phase 1)
- Real API integration ✅
- Loading states ✅
- Error handling ✅
- Backend endpoints exist ✅

### 🔄 2. Menu Management (`/dashboard/business/menu`)
**Current State**: Has mock data (mockMenus array)
**Needs**:
- Remove mock menus data
- Connect to existing `/api/business-owner/menu` endpoints
- Update styling to match NYT theme
- Add loading/error states

**Backend**: ✅ Already exists
- GET /api/business-owner/menu
- POST /api/business-owner/menu
- PUT /api/business-owner/menu/:id
- DELETE /api/business-owner/menu/:id
- PATCH /api/business-owner/menu/:id/availability

### 🔄 3. Reviews Management (`/dashboard/business/reviews`)
**Current State**: Has mock reviews data
**Needs**:
- Remove mock reviews
- Connect to `/api/business-owner/reviews` endpoint
- Update styling to match NYT theme
- Add response functionality
- Add loading/error states

**Backend**: ✅ Already exists
- GET /api/business-owner/reviews

**TODO**: Add POST endpoint for responding to reviews

### 🔄 4. Business Profile (`/dashboard/business/profile`)
**Current State**: Has mockProfile data
**Needs**:
- Remove mock profile
- Connect to `/api/business-owner/my-business` endpoints
- Update styling to match NYT theme
- Add photo upload functionality
- Add loading/error states

**Backend**: ✅ Already exists
- GET /api/business-owner/my-business
- PUT /api/business-owner/my-business
- GET/PUT /api/business-owner/hours
- GET/POST/DELETE /api/business-owner/photos

### 🔄 5. Digital Card (`/dashboard/business/digital-card`)
**Current State**: Has mockProfile data
**Needs**:
- Remove mock profile
- Connect to business profile API
- Generate real QR codes
- Update styling to match NYT theme
- Add download functionality

**Backend**: Partial
- ✅ GET /api/business-owner/my-business
- ❌ Need QR code generation endpoint

**TODO**: Create QR code generation endpoint

### 🔄 6. Business Insights (`/dashboard/business/insights`)
**Current State**: Unknown (need to check for mock data)
**Needs**:
- Check for dummy data
- Connect to analytics endpoints
- Update styling to match NYT theme

**Backend**: ❌ Need to create
- TODO: GET /api/business-owner/analytics
- TODO: GET /api/business-owner/insights

### 🔄 7. Accounts Center (`/dashboard/business/accounts`)
**Current State**: Unknown (need to check)
**Needs**:
- Check for dummy data
- Connect to user management endpoints
- Update styling to match NYT theme

**Backend**: ❌ Need to create
- TODO: GET /api/business-owner/team
- TODO: POST /api/business-owner/team/invite
- TODO: DELETE /api/business-owner/team/:id

### 🔄 8. Ads Management (`/dashboard/business/ads`)
**Current State**: Need to check if page exists
**Needs**:
- Check for dummy data
- Connect to ads endpoints
- Update styling to match NYT theme

**Backend**: ❌ Need to create
- TODO: GET /api/business-owner/ads
- TODO: POST /api/business-owner/ads
- TODO: PUT /api/business-owner/ads/:id
- TODO: DELETE /api/business-owner/ads/:id

### 🔄 9. Help Page (`/help`)
**Current State**: Unknown
**Needs**:
- Check for dummy data
- Update styling to match NYT theme
- Add FAQ, contact form, etc.

---

## Design System (NYT Theme)

### Typography
- **Primary Font**: 'Roboto', sans-serif
- **Secondary Font**: 'Inter', sans-serif
- **Heading Font**: 'Roboto', sans-serif

### Colors
- **Primary**: #0284c7 (Sky Blue)
- **Primary Hover**: #0369a1
- **Secondary**: #000000 (Black)
- **Success**: #16a34a
- **Warning**: #d97706
- **Error**: #dc2626
- **Info**: #0284c7

### Spacing
- Uses CSS variables: --space-1 through --space-24
- Base unit: 0.25rem (4px)

### Components
- **Cards**: White background, 1px border, rounded corners
- **Buttons**: Rounded, medium font weight, transitions
- **Tables**: Striped rows, hover effects, clean borders
- **Forms**: Clean inputs, proper validation states

### Shadows
- Minimal shadows for depth
- Hover effects for interactivity

---

## Implementation Order

### Phase 1: Menu Management (NEXT)
1. Update TypeScript to remove mock data
2. Integrate with BusinessOwnerService
3. Update HTML template
4. Update SCSS with NYT theme
5. Test functionality

### Phase 2: Reviews Management
1. Update TypeScript to remove mock data
2. Integrate with BusinessOwnerService
3. Add response functionality
4. Update HTML template
5. Update SCSS with NYT theme
6. Create POST endpoint for responses
7. Test functionality

### Phase 3: Business Profile
1. Update TypeScript to remove mock data
2. Integrate with BusinessOwnerService
3. Add photo upload
4. Update HTML template
5. Update SCSS with NYT theme
6. Test functionality

### Phase 4: Digital Card
1. Update TypeScript to remove mock data
2. Integrate with BusinessOwnerService
3. Create QR code generation endpoint
4. Update HTML template
5. Update SCSS with NYT theme
6. Test functionality

### Phase 5: Business Insights
1. Check for mock data
2. Create analytics endpoints
3. Integrate with service
4. Update HTML template
5. Update SCSS with NYT theme
6. Test functionality

### Phase 6: Accounts Center
1. Check for mock data
2. Create team management endpoints
3. Integrate with service
4. Update HTML template
5. Update SCSS with NYT theme
6. Test functionality

### Phase 7: Ads Management (if exists)
1. Check if page exists
2. Create ads endpoints
3. Integrate with service
4. Update HTML template
5. Update SCSS with NYT theme
6. Test functionality

### Phase 8: Help Page
1. Check current state
2. Update content
3. Update styling
4. Test functionality

---

## Success Criteria

For each page:
- ✅ No dummy/mock data
- ✅ Real API integration
- ✅ Consistent NYT theme styling
- ✅ Proper loading states
- ✅ Error handling with retry
- ✅ Empty states
- ✅ Responsive design
- ✅ Accessibility (ARIA labels)
- ✅ No TypeScript errors
- ✅ No console errors

---

## Estimated Timeline

- **Menu Management**: 30-45 minutes
- **Reviews Management**: 45-60 minutes (includes backend endpoint)
- **Business Profile**: 45-60 minutes (includes photo upload)
- **Digital Card**: 30-45 minutes (includes QR endpoint)
- **Business Insights**: 60-90 minutes (new endpoints needed)
- **Accounts Center**: 60-90 minutes (new endpoints needed)
- **Ads Management**: 60-90 minutes (new endpoints needed)
- **Help Page**: 15-30 minutes

**Total**: ~6-8 hours of work

---

## Next Steps

1. Start with Menu Management (has existing backend)
2. Move to Reviews (mostly exists, need response endpoint)
3. Continue with Business Profile (all endpoints exist)
4. Then Digital Card (need QR endpoint)
5. Create new endpoints for Insights, Accounts, Ads
6. Finish with Help page

---

**Let's begin with Menu Management!**

