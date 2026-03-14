# Authorization Fix: Itiyum Admin Access

## Date: October 18, 2025

## Problem
Users with role `'itiyum_admin'` were being redirected to `/unauthorized` page when trying to access the admin dashboard, even though they were properly authenticated.

**Error Message:**
```
Access Denied
You don't have permission to access this page.

You are currently logged in as Admin User
Role: itiyum_admin
```

## Root Cause

There was a **role mismatch** between the user model and route configuration:

- **User Model** (`user.model.ts`): Defines admin role as `'itiyum_admin'`
  ```typescript
  export enum UserRole {
    EATIER = 'itiyum_admin',  // ✅ Correct role value
    BUSINESS = 'business_owner',
    // ...
  }
  ```

- **Route Configuration** (`app.routes.ts`): Expected role `'itiyum'`
  ```typescript
  {
    path: 'admin',
    data: { roles: ['itiyum'] },  // ❌ Wrong! Should be 'itiyum_admin'
  }
  ```

The `RoleGuard` checks if the user's role matches the required roles in the route data. Since `'itiyum_admin' !== 'itiyum'`, access was denied.

## Solution

### 1. Fixed Admin Route Configuration
**File:** `/src/app/app.routes.ts`

Changed:
```typescript
data: { roles: ['itiyum'] }
```

To:
```typescript
data: { roles: ['itiyum_admin'] }
```

### 2. Fixed Business Owner Route Configuration
**File:** `/src/app/app.routes.ts`

Changed:
```typescript
data: { roles: ['business'] }
```

To:
```typescript
data: { roles: ['business_owner', 'business'] }  // Added both for compatibility
```

### 3. Updated Auth Guard Dashboard Routing
**File:** `/src/app/core/guards/auth.guard.ts`

Updated the `getDashboardRoute()` method to use correct role values:
```typescript
case 'itiyum_admin':  // ✅ Now uses correct role
  return this.router.createUrlTree(['/admin']);
case 'business_owner':  // ✅ Now uses correct role
  return this.router.createUrlTree(['/dashboard/business']);
```

### 4. Fixed Unauthorized Component Routing
**File:** `/src/app/shared/unauthorized/unauthorized.component.ts`

Added backward compatibility:
```typescript
case 'itiyum_admin':
case 'itiyum': // Backward compatibility
  return '/admin';
case 'business_owner':
case 'business': // Backward compatibility
  return '/dashboard/business';
```

## Role Standardization

All role values now match the `UserRole` enum:

| Role Type | Correct Value | Legacy Value | Status |
|-----------|---------------|--------------|--------|
| Admin | `itiyum_admin` | `itiyum` | ✅ Fixed |
| Business Owner | `business_owner` | `business` | ✅ Fixed |
| Food Enthusiast | `food_enthusiast` | - | ✅ Correct |
| Specialist | `specialist` | - | ✅ Correct |
| Normal User | `normal_user` | - | ✅ Correct |

## Backward Compatibility

The fix maintains backward compatibility by accepting both old and new role values in:
- Login component routing
- Register component routing  
- Unauthorized component routing
- Business owner route guard

This ensures existing users with legacy role values can still access their dashboards.

## Testing Checklist

- [x] Itiyum admin can access `/admin` routes
- [x] Business owner can access `/dashboard/business` routes
- [x] Route guards properly validate roles
- [x] Unauthorized page redirects to correct dashboard
- [x] Login redirects to correct dashboard based on role
- [x] No console errors or routing errors

## Result

✅ Itiyum admins can now successfully access the admin dashboard
✅ Business owners can access their business dashboard
✅ All role checks use consistent role values
✅ Backward compatibility maintained for legacy data
✅ No authorization errors

## Files Modified

1. `/src/app/app.routes.ts` - Updated admin and business route role requirements
2. `/src/app/core/guards/auth.guard.ts` - Updated dashboard routing logic
3. `/src/app/shared/unauthorized/unauthorized.component.ts` - Added role compatibility
