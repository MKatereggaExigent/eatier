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
            { path: 'legal', loadComponent: () => import('./pages/legal/legal.component').then(m => m.LegalComponent) },

            // Public restaurant discovery
            {
                path: 'restaurants',
                loadComponent: () => import('./pages/restaurants/restaurant-list/restaurant-list.component').then(m => m.RestaurantListComponent)
            },
            {
                path: 'restaurants/:id',
                loadComponent: () => import('./pages/restaurants/restaurant-detail/restaurant-detail.component').then(m => m.RestaurantDetailComponent)
            },
        ]
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
            { path: 'businesses', loadComponent: () => import('./pages/admin/businesses/admin-businesses.component').then(m => m.AdminBusinessesComponent) },
            { path: 'bookings', loadComponent: () => import('./pages/admin/bookings/admin-bookings.component').then(m => m.AdminBookingsComponent) },
            { path: 'ads', loadComponent: () => import('./pages/admin/ads/admin-ads.component').then(m => m.AdminAdsComponent) },
            { path: 'analytics', loadComponent: () => import('./pages/admin/analytics/admin-analytics.component').then(m => m.AdminAnalyticsComponent) },
            { path: 'reports', loadComponent: () => import('./pages/admin/reports/admin-reports.component').then(m => m.AdminReportsComponent) },
            { path: 'settings', loadComponent: () => import('./pages/admin/settings/admin-settings.component').then(m => m.AdminSettingsComponent) }
        ]
    },

    // Business Dashboard - Restaurant owners showcasing their businesses
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
            { path: 'reviews', loadComponent: () => import('./pages/business/reviews/business-reviews.component').then(m => m.BusinessReviewsComponent) },
            { path: 'insights', loadComponent: () => import('./pages/business/insights/business-insights.component').then(m => m.BusinessInsightsComponent) },
            { path: 'ads', loadComponent: () => import('./pages/ads/ad-management/ad-management.component').then(m => m.AdManagementComponent) },
            { path: 'ads/create', loadComponent: () => import('./pages/ads/ad-creation/ad-creation.component').then(m => m.AdCreationComponent) },
            { path: 'digital-card', loadComponent: () => import('./pages/business/digital-card/digital-card.component').then(m => m.DigitalCardComponent) },
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
            { path: 'reviews', loadComponent: () => import('./pages/food-enthusiast/reviews/food-enthusiast-reviews.component').then(m => m.FoodEnthusiastReviewsComponent) },
            { path: 'profile', loadComponent: () => import('./pages/user/profile/user-profile.component').then(m => m.UserProfileComponent) },
            { path: 'favorites', loadComponent: () => import('./pages/user/favorites/user-favorites.component').then(m => m.UserFavoritesComponent) },
            { path: 'ads', loadComponent: () => import('./pages/ads/ad-management/ad-management.component').then(m => m.AdManagementComponent) },
            { path: 'ads/create', loadComponent: () => import('./pages/ads/ad-creation/ad-creation.component').then(m => m.AdCreationComponent) },
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
            { path: 'ads', loadComponent: () => import('./pages/ads/ad-management/ad-management.component').then(m => m.AdManagementComponent) },
            { path: 'ads/create', loadComponent: () => import('./pages/ads/ad-creation/ad-creation.component').then(m => m.AdCreationComponent) },
            { path: 'insights', loadComponent: () => import('./pages/user/insights/user-insights.component').then(m => m.UserInsightsComponent) },
            { path: 'digital-card', loadComponent: () => import('./pages/user/digital-card/user-digital-card.component').then(m => m.UserDigitalCardComponent) },
            { path: 'legacy-access', loadComponent: () => import('./pages/user/legacy-access/legacy-access.component').then(m => m.LegacyAccessComponent) },
            { path: 'accounts', loadComponent: () => import('./pages/user/accounts/user-accounts-center.component').then(m => m.UserAccountsCenterComponent) },
            { path: 'bookings', loadComponent: () => import('./pages/user/bookings/bookings.component').then(m => m.BookingsComponent) }
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
            { path: 'portfolio', loadComponent: () => import('./pages/specialist/portfolio/portfolio-management.component').then(m => m.PortfolioManagementComponent) },
            { path: 'availability', loadComponent: () => import('./pages/specialist/availability/availability-management.component').then(m => m.AvailabilityManagementComponent) },
            { path: 'ads', loadComponent: () => import('./pages/ads/ad-management/ad-management.component').then(m => m.AdManagementComponent) },
            { path: 'ads/create', loadComponent: () => import('./pages/ads/ad-creation/ad-creation.component').then(m => m.AdCreationComponent) },
            { path: 'profile', loadComponent: () => import('./pages/user/profile/user-profile.component').then(m => m.UserProfileComponent) },
            { path: 'insights', loadComponent: () => import('./pages/user/insights/user-insights.component').then(m => m.UserInsightsComponent) },
            { path: 'digital-card', loadComponent: () => import('./pages/user/digital-card/user-digital-card.component').then(m => m.UserDigitalCardComponent) },
            { path: 'legacy-access', loadComponent: () => import('./pages/user/legacy-access/legacy-access.component').then(m => m.LegacyAccessComponent) },
            { path: 'accounts', loadComponent: () => import('./pages/user/accounts/user-accounts-center.component').then(m => m.UserAccountsCenterComponent) },
            { path: 'bookings', loadComponent: () => import('./pages/user/bookings/bookings.component').then(m => m.BookingsComponent) }
        ]
    },

    // Error pages
    { path: 'unauthorized', loadComponent: () => import('./shared/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent) },
    { path: '**', loadComponent: () => import('./shared/not-found/not-found.component').then(m => m.NotFoundComponent) }
];
