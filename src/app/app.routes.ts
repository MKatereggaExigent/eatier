import { AuthGuard, GuestGuard, RoleGuard } from './core/guards/auth.guard';

import { LayoutComponent } from './core/layout.component';
import { Routes } from '@angular/router';

export const routes: Routes = [
    // Public routes with layout
    {
        path: '',
        component: LayoutComponent,
        children: [
            { path: '', redirectTo: 'about', pathMatch: 'full' },
            { path: 'about', loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent) },
            { path: 'grow', loadComponent: () => import('./pages/grow/grow.component').then(m => m.GrowComponent) },
            { path: 'help', loadComponent: () => import('./pages/help-centre/help-centre.component').then(m => m.HelpCentreComponent) },
            { path: 'feedback', loadComponent: () => import('./pages/feedback/feedback.component').then(m => m.FeedbackComponent) },
            { path: 'community', loadComponent: () => import('./pages/community/community.component').then(m => m.CommunityComponent) },
            { path: 'faqs', loadComponent: () => import('./pages/faqs/faqs.component').then(m => m.FaqsComponent) },
            { path: 'legal/terms', loadComponent: () => import('./pages/legal/legal.component').then(m => m.LegalComponent), data: { page: 'terms' } },
            { path: 'legal/privacy', loadComponent: () => import('./pages/legal/legal.component').then(m => m.LegalComponent), data: { page: 'privacy' } },
            { path: 'legal', redirectTo: 'legal/terms', pathMatch: 'full' },

            // Public restaurant discovery
            {
                path: 'restaurants',
                loadComponent: () => import('./pages/restaurants/restaurant-list/restaurant-list.component').then(m => m.RestaurantListComponent)
            },
            {
                path: 'restaurants/:id',
                loadComponent: () => import('./pages/restaurants/restaurant-detail/restaurant-detail.component').then(m => m.RestaurantDetailComponent)
            },

            // Checkout (requires authentication)
            {
                path: 'checkout/:cartId',
                loadComponent: () => import('./pages/checkout/checkout.component').then(m => m.CheckoutComponent)
            },

            // Order confirmation
            {
                path: 'order-confirmation/:orderId',
                loadComponent: () => import('./pages/checkout/order-confirmation/order-confirmation.component').then(m => m.OrderConfirmationComponent)
            },

            // Public specialist discovery
            {
                path: 'specialists',
                loadComponent: () => import('./pages/specialists/specialist-list/specialist-list.component').then(m => m.SpecialistListComponent)
            },
            {
                path: 'specialists/:id',
                loadComponent: () => import('./pages/specialists/specialist-detail/specialist-detail.component').then(m => m.SpecialistDetailComponent)
            },

            // Public blog routes
            {
                path: 'blog',
                loadComponent: () => import('./pages/blog/blog-list/blog-list.component').then(m => m.BlogListComponent)
            },
            {
                path: 'blog/:slug',
                loadComponent: () => import('./pages/blog/blog-post/blog-post.component').then(m => m.BlogPostComponent)
            },

            // Pricing/Subscription page
            {
                path: 'pricing',
                loadComponent: () => import('./pages/subscribe/subscribe.component').then(m => m.SubscribeComponent)
            },
        ]
    },

    // Payment callback route (no layout - standalone page)
    {
        path: 'payment/callback',
        loadComponent: () => import('./pages/payment/payment-callback.component').then(m => m.PaymentCallbackComponent)
    },

    // Booking confirmation page (public - no login required)
    {
        path: 'booking/:reference',
        loadComponent: () => import('./pages/booking/booking-confirmation.component').then(m => m.BookingConfirmationComponent)
    },

    // Direct authentication routes (no layout)
    { path: 'login', canActivate: [GuestGuard], loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent) },
    { path: 'register', canActivate: [GuestGuard], loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent) },
    { path: 'forgot-password', canActivate: [GuestGuard], loadComponent: () => import('./auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
    { path: 'reset-password', canActivate: [GuestGuard], loadComponent: () => import('./auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },

    // Authentication routes with /auth prefix (for backward compatibility)
    {
        path: 'auth',
        canActivate: [GuestGuard],
        children: [
            { path: '', redirectTo: '/login', pathMatch: 'full' },
            { path: 'login', redirectTo: '/login', pathMatch: 'full' },
            { path: 'register', redirectTo: '/register', pathMatch: 'full' },
            { path: 'forgot-password', redirectTo: '/forgot-password', pathMatch: 'full' },
            { path: 'reset-password', redirectTo: '/reset-password', pathMatch: 'full' }
        ]
    },

    // Itiyum Admin Dashboard - Superuser managing all accounts
    {
        path: 'admin',
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['itiyum_admin'] },
        loadComponent: () => import('./pages/user/dashboard/dashboard.component').then(m => m.UserDashboardComponent),
        children: [
            { path: '', redirectTo: 'overview', pathMatch: 'full' },
            { path: 'overview', loadComponent: () => import('./pages/admin/overview/admin-overview.component').then(m => m.AdminOverviewComponent) },
            { path: 'users', loadComponent: () => import('./pages/admin/users/admin-users.component').then(m => m.AdminUsersComponent) },
            { path: 'users/:id', loadComponent: () => import('./pages/admin/users/user-detail/user-detail.component').then(m => m.UserDetailComponent) },
            { path: 'businesses', loadComponent: () => import('./pages/admin/businesses/admin-businesses.component').then(m => m.AdminBusinessesComponent) },
            { path: 'businesses/:id', loadComponent: () => import('./pages/admin/businesses/business-detail/business-detail.component').then(m => m.BusinessDetailComponent) },
            { path: 'bookings', loadComponent: () => import('./pages/admin/bookings/admin-bookings.component').then(m => m.AdminBookingsComponent) },
            { path: 'ads/:adId/edit', loadComponent: () => import('./pages/ads/ad-creation/ad-creation.component').then(m => m.AdCreationComponent) },
            { path: 'ads/create', loadComponent: () => import('./pages/ads/ad-creation/ad-creation.component').then(m => m.AdCreationComponent) },
            { path: 'ads', loadComponent: () => import('./pages/admin/ads/admin-ads.component').then(m => m.AdminAdsComponent) },
            { path: 'analytics', loadComponent: () => import('./pages/admin/analytics/admin-analytics.component').then(m => m.AdminAnalyticsComponent) },
            { path: 'reports', loadComponent: () => import('./pages/admin/reports/admin-reports.component').then(m => m.AdminReportsComponent) },
            { path: 'settings', loadComponent: () => import('./pages/admin/settings/admin-settings.component').then(m => m.AdminSettingsComponent) },
            { path: 'blog', loadComponent: () => import('./pages/admin/blog-management/blog-management.component').then(m => m.BlogManagementComponent) }
        ]
    },

    // Business Dashboard - Short URL (preferred)
    {
        path: 'business',
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['business_owner', 'business'] },
        loadComponent: () => import('./pages/business/dashboard/dashboard.component').then(m => m.DashboardComponent),
        children: [
            { path: '', redirectTo: 'overview', pathMatch: 'full' },
            { path: 'overview', loadComponent: () => import('./pages/business/overview/overview.component').then(m => m.OverviewComponent) },
            { path: 'profile', loadComponent: () => import('./pages/business/profile/business-profile.component').then(m => m.BusinessProfileComponent) },
            { path: 'menu', loadComponent: () => import('./pages/business/menu/menu-management.component').then(m => m.MenuManagementComponent) },
            { path: 'bookings', loadComponent: () => import('./pages/business/bookings/business-bookings.component').then(m => m.BusinessBookingsComponent) },
            { path: 'reviews', loadComponent: () => import('./pages/business/reviews/business-reviews.component').then(m => m.BusinessReviewsComponent) },
            { path: 'insights', loadComponent: () => import('./pages/business/insights/business-insights.component').then(m => m.BusinessInsightsComponent) },
            { path: 'ads/:adId/edit', loadComponent: () => import('./pages/ads/ad-creation/ad-creation.component').then(m => m.AdCreationComponent) },
            { path: 'ads/create', loadComponent: () => import('./pages/ads/ad-creation/ad-creation.component').then(m => m.AdCreationComponent) },
            { path: 'ads', loadComponent: () => import('./pages/ads/ad-management/ad-management.component').then(m => m.AdManagementComponent) },
            { path: 'digital-card', loadComponent: () => import('./pages/business/digital-card/digital-card.component').then(m => m.DigitalCardComponent) },
            { path: 'accounts', loadComponent: () => import('./pages/business/accounts/accounts-center.component').then(m => m.AccountsCenterComponent) }
        ]
    },

    // Business Dashboard - Long URL (backward compatibility)
    {
        path: 'dashboard/business',
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['business_owner', 'business'] },
        loadComponent: () => import('./pages/business/dashboard/dashboard.component').then(m => m.DashboardComponent),
        children: [
            { path: '', redirectTo: 'overview', pathMatch: 'full' },
            { path: 'overview', loadComponent: () => import('./pages/business/overview/overview.component').then(m => m.OverviewComponent) },
            { path: 'profile', loadComponent: () => import('./pages/business/profile/business-profile.component').then(m => m.BusinessProfileComponent) },
            { path: 'menu', loadComponent: () => import('./pages/business/menu/menu-management.component').then(m => m.MenuManagementComponent) },
            { path: 'bookings', loadComponent: () => import('./pages/business/bookings/business-bookings.component').then(m => m.BusinessBookingsComponent) },
            { path: 'reviews', loadComponent: () => import('./pages/business/reviews/business-reviews.component').then(m => m.BusinessReviewsComponent) },
            { path: 'insights', loadComponent: () => import('./pages/business/insights/business-insights.component').then(m => m.BusinessInsightsComponent) },
            { path: 'ads/:adId/edit', loadComponent: () => import('./pages/ads/ad-creation/ad-creation.component').then(m => m.AdCreationComponent) },
            { path: 'ads/create', loadComponent: () => import('./pages/ads/ad-creation/ad-creation.component').then(m => m.AdCreationComponent) },
            { path: 'ads', loadComponent: () => import('./pages/ads/ad-management/ad-management.component').then(m => m.AdManagementComponent) },
            { path: 'digital-card', loadComponent: () => import('./pages/business/digital-card/digital-card.component').then(m => m.DigitalCardComponent) },
            { path: 'analytics', loadComponent: () => import('./pages/business/analytics/business-analytics.component').then(m => m.BusinessAnalyticsComponent) },
            { path: 'accounts', loadComponent: () => import('./pages/business/accounts/accounts-center.component').then(m => m.AccountsCenterComponent) }
        ]
    },

    // Food Enthusiast Dashboard - Food lovers exploring cuisines, rating, reviewing
    {
        path: 'dashboard/food-enthusiast',
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['food_enthusiast'] },
        loadComponent: () => import('./pages/user/dashboard/dashboard.component').then(m => m.UserDashboardComponent),
        children: [
            { path: '', redirectTo: 'overview', pathMatch: 'full' },
            { path: 'overview', loadComponent: () => import('./pages/food-enthusiast/overview/food-enthusiast-overview.component').then(m => m.FoodEnthusiastOverviewComponent) },
            { path: 'bookings', loadComponent: () => import('./pages/food-enthusiast/bookings/food-enthusiast-bookings.component').then(m => m.FoodEnthusiastBookingsComponent) },
            { path: 'specialist-bookings', loadComponent: () => import('./pages/user/specialist-bookings/user-specialist-bookings.component').then(m => m.UserSpecialistBookingsComponent) },
            { path: 'reviews', loadComponent: () => import('./pages/food-enthusiast/reviews/food-enthusiast-reviews.component').then(m => m.FoodEnthusiastReviewsComponent) },
            { path: 'profile', loadComponent: () => import('./pages/user/profile/user-profile.component').then(m => m.UserProfileComponent) },
            { path: 'favorites', loadComponent: () => import('./pages/user/favorites/user-favorites.component').then(m => m.UserFavoritesComponent) },
            { path: 'ads/:adId/edit', loadComponent: () => import('./pages/ads/ad-creation/ad-creation.component').then(m => m.AdCreationComponent) },
            { path: 'ads/create', loadComponent: () => import('./pages/ads/ad-creation/ad-creation.component').then(m => m.AdCreationComponent) },
            { path: 'ads', loadComponent: () => import('./pages/ads/ad-management/ad-management.component').then(m => m.AdManagementComponent) },
            { path: 'insights', loadComponent: () => import('./pages/user/insights/user-insights.component').then(m => m.UserInsightsComponent) },
            { path: 'digital-card', loadComponent: () => import('./pages/user/digital-card/user-digital-card.component').then(m => m.UserDigitalCardComponent) },
            { path: 'legacy-access', loadComponent: () => import('./pages/user/legacy-access/legacy-access.component').then(m => m.LegacyAccessComponent) },
            { path: 'accounts', loadComponent: () => import('./pages/user/accounts/user-accounts-center.component').then(m => m.UserAccountsCenterComponent) }
        ]
    },

    // Normal User Dashboard - Regular people looking for nearby food options
    {
        path: 'dashboard/user',
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['normal_user'] },
        loadComponent: () => import('./pages/user/dashboard/dashboard.component').then(m => m.UserDashboardComponent),
        children: [
            { path: '', redirectTo: 'overview', pathMatch: 'full' },
            { path: 'overview', loadComponent: () => import('./pages/user/overview/overview.component').then(m => m.UserOverviewComponent) },
            { path: 'profile', loadComponent: () => import('./pages/user/profile/user-profile.component').then(m => m.UserProfileComponent) },
            { path: 'favorites', loadComponent: () => import('./pages/user/favorites/user-favorites.component').then(m => m.UserFavoritesComponent) },
            { path: 'reviews', loadComponent: () => import('./pages/user/reviews/user-reviews.component').then(m => m.UserReviewsComponent) },
            { path: 'ads/:adId/edit', loadComponent: () => import('./pages/ads/ad-creation/ad-creation.component').then(m => m.AdCreationComponent) },
            { path: 'ads/create', loadComponent: () => import('./pages/ads/ad-creation/ad-creation.component').then(m => m.AdCreationComponent) },
            { path: 'ads', loadComponent: () => import('./pages/ads/ad-management/ad-management.component').then(m => m.AdManagementComponent) },
            { path: 'insights', loadComponent: () => import('./pages/user/insights/user-insights.component').then(m => m.UserInsightsComponent) },
            { path: 'digital-card', loadComponent: () => import('./pages/user/digital-card/user-digital-card.component').then(m => m.UserDigitalCardComponent) },
            { path: 'legacy-access', loadComponent: () => import('./pages/user/legacy-access/legacy-access.component').then(m => m.LegacyAccessComponent) },
            { path: 'accounts', loadComponent: () => import('./pages/user/accounts/user-accounts-center.component').then(m => m.UserAccountsCenterComponent) },
            { path: 'bookings', loadComponent: () => import('./pages/user/bookings/bookings.component').then(m => m.BookingsComponent) },
            { path: 'specialist-bookings', loadComponent: () => import('./pages/user/specialist-bookings/user-specialist-bookings.component').then(m => m.UserSpecialistBookingsComponent) },
            { path: 'preferences', loadComponent: () => import('./pages/user/preferences/user-preferences.component').then(m => m.UserPreferencesComponent) },
            { path: 'orders', loadComponent: () => import('./pages/user/orders/user-orders.component').then(m => m.UserOrdersComponent) },
            { path: 'wallet', loadComponent: () => import('./pages/user/wallet/user-wallet.component').then(m => m.UserWalletComponent) },
            { path: 'promotions', loadComponent: () => import('./pages/user/promotions/user-promotions.component').then(m => m.UserPromotionsComponent) },
            { path: 'social', loadComponent: () => import('./pages/user/social/user-social.component').then(m => m.UserSocialComponent) }
        ]
    },

    // Specialist Dashboard - Individual chefs, waiters advertising private services
    {
        path: 'dashboard/specialist',
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['specialist'] },
        loadComponent: () => import('./pages/user/dashboard/dashboard.component').then(m => m.UserDashboardComponent),
        children: [
            { path: '', redirectTo: 'overview', pathMatch: 'full' },
            { path: 'overview', loadComponent: () => import('./pages/specialist/overview/specialist-overview.component').then(m => m.SpecialistOverviewComponent) },
            { path: 'services', loadComponent: () => import('./pages/specialist/services/services-management.component').then(m => m.ServicesManagementComponent) },
            { path: 'portfolio', loadComponent: () => import('./pages/specialist/portfolio/portfolio-management.component').then(m => m.PortfolioManagementComponent) },
            { path: 'availability', loadComponent: () => import('./pages/specialist/availability/availability-management.component').then(m => m.AvailabilityManagementComponent) },
            { path: 'ads/:adId/edit', loadComponent: () => import('./pages/ads/ad-creation/ad-creation.component').then(m => m.AdCreationComponent) },
            { path: 'ads/create', loadComponent: () => import('./pages/ads/ad-creation/ad-creation.component').then(m => m.AdCreationComponent) },
            { path: 'ads', loadComponent: () => import('./pages/ads/ad-management/ad-management.component').then(m => m.AdManagementComponent) },
            { path: 'profile', loadComponent: () => import('./pages/user/profile/user-profile.component').then(m => m.UserProfileComponent) },
            { path: 'insights', loadComponent: () => import('./pages/user/insights/user-insights.component').then(m => m.UserInsightsComponent) },
            { path: 'digital-card', loadComponent: () => import('./pages/user/digital-card/user-digital-card.component').then(m => m.UserDigitalCardComponent) },
            { path: 'legacy-access', loadComponent: () => import('./pages/user/legacy-access/legacy-access.component').then(m => m.LegacyAccessComponent) },
            { path: 'accounts', loadComponent: () => import('./pages/user/accounts/user-accounts-center.component').then(m => m.UserAccountsCenterComponent) },
            { path: 'bookings', loadComponent: () => import('./pages/user/bookings/bookings.component').then(m => m.BookingsComponent) },
            { path: 'wallet', loadComponent: () => import('./pages/user/wallet/user-wallet.component').then(m => m.UserWalletComponent) }
        ]
    },

    // Error pages
    { path: 'unauthorized', loadComponent: () => import('./shared/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent) },
    { path: '**', loadComponent: () => import('./shared/not-found/not-found.component').then(m => m.NotFoundComponent) }
];
