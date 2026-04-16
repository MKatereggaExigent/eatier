/**
 * Role-Based Route Helper
 * 
 * Returns correct routes based on user role for notifications and navigation
 */

/**
 * Get the correct social route based on user role
 */
function getSocialRoute(userRole) {
  switch (userRole) {
    case 'specialist':
      return '/dashboard/specialist/social';
    case 'business_owner':
    case 'business':
      return '/business/social';
    case 'food_enthusiast':
      return '/dashboard/food-enthusiast/social';
    case 'normal_user':
      return '/dashboard/user/social';
    case 'itiyum_admin':
      return '/admin/social';
    default:
      return '/social';
  }
}

/**
 * Get the correct messages route based on user role
 */
function getMessagesRoute(userRole) {
  switch (userRole) {
    case 'specialist':
      return '/dashboard/specialist/messages';
    case 'business_owner':
    case 'business':
      return '/business/messages';
    case 'food_enthusiast':
      return '/dashboard/food-enthusiast/messages';
    case 'normal_user':
      return '/dashboard/user/messages';
    case 'itiyum_admin':
      return '/admin/messages';
    default:
      return '/messages';
  }
}

/**
 * Get the correct bookings route based on user role
 */
function getBookingsRoute(userRole) {
  switch (userRole) {
    case 'specialist':
      return '/dashboard/specialist/bookings';
    case 'business_owner':
    case 'business':
      return '/business/bookings';
    case 'food_enthusiast':
      return '/dashboard/food-enthusiast/bookings';
    case 'normal_user':
      return '/dashboard/user/bookings';
    case 'itiyum_admin':
      return '/admin/bookings';
    default:
      return '/dashboard/user/bookings';
  }
}

/**
 * Get the correct reviews route based on user role
 */
function getReviewsRoute(userRole) {
  switch (userRole) {
    case 'business_owner':
    case 'business':
      return '/business/reviews';
    case 'specialist':
      return '/dashboard/specialist/reviews';
    default:
      return '/dashboard/user/reviews';
  }
}

/**
 * Get the correct dashboard route based on user role
 */
function getDashboardRoute(userRole) {
  switch (userRole) {
    case 'specialist':
      return '/dashboard/specialist/overview';
    case 'business_owner':
    case 'business':
      return '/business/overview';
    case 'food_enthusiast':
      return '/dashboard/food-enthusiast/overview';
    case 'normal_user':
      return '/dashboard/user/overview';
    case 'itiyum_admin':
      return '/admin/overview';
    default:
      return '/dashboard/user/overview';
  }
}

/**
 * Get the correct wallet route based on user role
 */
function getWalletRoute(userRole) {
  switch (userRole) {
    case 'specialist':
      return '/dashboard/specialist/wallet';
    case 'business_owner':
    case 'business':
      return '/business/wallet';
    case 'food_enthusiast':
      return '/dashboard/food-enthusiast/wallet';
    case 'normal_user':
      return '/dashboard/user/wallet';
    default:
      return '/dashboard/user/wallet';
  }
}

/**
 * Get the correct settings route based on user role
 */
function getSettingsRoute(userRole) {
  switch (userRole) {
    case 'specialist':
      return '/dashboard/specialist/settings';
    case 'business_owner':
    case 'business':
      return '/business/accounts';
    case 'food_enthusiast':
      return '/dashboard/food-enthusiast/accounts';
    case 'normal_user':
      return '/dashboard/user/settings';
    case 'itiyum_admin':
      return '/admin/settings';
    default:
      return '/dashboard/user/settings';
  }
}

module.exports = {
  getSocialRoute,
  getMessagesRoute,
  getBookingsRoute,
  getReviewsRoute,
  getDashboardRoute,
  getWalletRoute,
  getSettingsRoute
};
