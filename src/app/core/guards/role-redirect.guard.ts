import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Redirect Guard - Redirects legacy/generic routes to role-specific routes
 * 
 * Example: /dashboard/social → /business/social (for business owners)
 */
export const RoleRedirectGuard = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  const user = authService.currentUser();
  if (!user) {
    router.navigate(['/login']);
    return false;
  }
  
  const path = route.routeConfig?.path;
  const role = user.role;
  
  // Determine the correct route based on path and role
  let targetRoute = '/';
  
  if (path === 'social') {
    // Redirect /dashboard/social to role-specific social page
    switch (role) {
      case 'specialist':
        targetRoute = '/dashboard/specialist/social';
        break;
      case 'business_owner':
        targetRoute = '/business/social';
        break;
      case 'food_enthusiast':
        targetRoute = '/dashboard/food-enthusiast/social';
        break;
      case 'normal_user':
        targetRoute = '/dashboard/user/social';
        break;
      case 'itiyum_admin':
        targetRoute = '/admin/social';
        break;
      default:
        targetRoute = '/social'; // Fallback to public social
    }
  } else if (path === 'messages') {
    // Redirect /dashboard/messages to role-specific messages page
    switch (role) {
      case 'specialist':
        targetRoute = '/dashboard/specialist/messages';
        break;
      case 'business_owner':
        targetRoute = '/business/messages';
        break;
      case 'food_enthusiast':
        targetRoute = '/dashboard/food-enthusiast/messages';
        break;
      case 'normal_user':
        targetRoute = '/dashboard/user/messages';
        break;
      case 'itiyum_admin':
        targetRoute = '/admin/messages';
        break;
      default:
        targetRoute = '/messages';
    }
  } else if (path === 'bookings') {
    // Redirect /dashboard/bookings to role-specific bookings page
    switch (role) {
      case 'specialist':
        targetRoute = '/dashboard/specialist/bookings';
        break;
      case 'business_owner':
        targetRoute = '/business/bookings';
        break;
      case 'food_enthusiast':
        targetRoute = '/dashboard/food-enthusiast/bookings';
        break;
      case 'normal_user':
        targetRoute = '/dashboard/user/bookings';
        break;
      case 'itiyum_admin':
        targetRoute = '/admin/bookings';
        break;
      default:
        targetRoute = '/dashboard/user/bookings';
    }
  } else if (path === 'reviews') {
    // Redirect /dashboard/reviews to role-specific reviews page
    switch (role) {
      case 'business_owner':
        targetRoute = '/business/reviews';
        break;
      case 'specialist':
        targetRoute = '/dashboard/specialist/reviews';
        break;
      default:
        targetRoute = '/dashboard/user/reviews';
    }
  } else if (path === 'wallet') {
    // Redirect /dashboard/wallet to role-specific wallet page
    switch (role) {
      case 'specialist':
        targetRoute = '/dashboard/specialist/wallet';
        break;
      case 'business_owner':
        targetRoute = '/business/wallet';
        break;
      case 'food_enthusiast':
        targetRoute = '/dashboard/food-enthusiast/wallet';
        break;
      case 'normal_user':
        targetRoute = '/dashboard/user/wallet';
        break;
      default:
        targetRoute = '/dashboard/user/wallet';
    }
  } else if (path === 'settings') {
    // Redirect /dashboard/settings to role-specific settings page
    switch (role) {
      case 'specialist':
        targetRoute = '/dashboard/specialist/settings';
        break;
      case 'business_owner':
        targetRoute = '/business/accounts';
        break;
      case 'food_enthusiast':
        targetRoute = '/dashboard/food-enthusiast/accounts';
        break;
      case 'normal_user':
        targetRoute = '/dashboard/user/settings';
        break;
      case 'itiyum_admin':
        targetRoute = '/admin/settings';
        break;
      default:
        targetRoute = '/dashboard/user/settings';
    }
  }
  
  // Navigate to the correct route
  router.navigate([targetRoute]);
  return false;
};
