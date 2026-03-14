import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  isAbsolute?: boolean; // Flag to indicate if path is absolute (e.g., /about)
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class UserDashboardComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Mobile menu state
  mobileMenuOpen = signal(false);

  currentUser = this.authService.currentUser;
  userRole = this.authService.userRole;

  // Dynamic navigation based on user role
  navigationItems = computed<NavigationItem[]>(() => {
    const role = this.userRole();

    switch (role) {
      case 'itiyum_admin':
        return [
          { path: 'overview', label: 'Overview', icon: '📊' },
          { path: '/about', label: 'Site', icon: '🌐', isAbsolute: true },
          { path: 'users', label: 'Users', icon: '👥' },
          { path: 'businesses', label: 'Businesses', icon: '🏪' },
          { path: 'bookings', label: 'Bookings', icon: '📅' },
          { path: 'blog', label: 'Blog', icon: '📝' },
          { path: 'ads', label: 'Manage My Ads', icon: '📢' },
          { path: 'analytics', label: 'Analytics', icon: '📈' },
          { path: 'reports', label: 'Reports', icon: '📋' },
          { path: 'settings', label: 'Settings', icon: '⚙️' }
        ];

      case 'specialist':
        return [
          { path: 'overview', label: 'Overview', icon: '📊' },
          { path: '/about', label: 'Site', icon: '🌐', isAbsolute: true },
          { path: 'portfolio', label: 'Portfolio', icon: '📸' },
          { path: 'availability', label: 'Availability', icon: '📅' },
          { path: 'bookings', label: 'Bookings', icon: '📋' },
          { path: 'wallet', label: 'Earnings', icon: '💰' },
          { path: 'ads', label: 'Manage My Ads', icon: '📢' },
          { path: 'profile', label: 'Profile', icon: '👤' }
        ];

      case 'food_enthusiast':
        return [
          { path: 'overview', label: 'Overview', icon: '📊' },
          { path: '/about', label: 'Site', icon: '🌐', isAbsolute: true },
          { path: 'profile', label: 'Profile', icon: '👤' },
          { path: 'favorites', label: 'Favorites', icon: '❤️' },
          { path: 'reviews', label: 'My Reviews', icon: '⭐' },
          { path: 'ads', label: 'Manage My Ads', icon: '📢' },
          { path: 'insights', label: 'Insights', icon: '📈' },
          { path: 'bookings', label: 'Bookings', icon: '📋' },
          { path: 'specialist-bookings', label: 'Chef Bookings', icon: '👨‍🍳' }
        ];

      case 'normal_user':
      default:
        return [
          { path: 'overview', label: 'Overview', icon: '📊' },
          { path: '/about', label: 'Site', icon: '🌐', isAbsolute: true },
          { path: 'favorites', label: 'Favorites', icon: '❤️' },
          { path: 'orders', label: 'Order History', icon: '📦' },
          { path: 'bookings', label: 'Bookings', icon: '📅' },
          { path: 'specialist-bookings', label: 'Chef Bookings', icon: '👨‍🍳' },
          { path: 'reviews', label: 'My Reviews', icon: '⭐' },
          { path: 'promotions', label: 'Deals', icon: '🎉' },
          { path: 'wallet', label: 'Wallet', icon: '💳' },
          { path: 'social', label: 'Social', icon: '👥' },
          { path: 'preferences', label: 'Preferences', icon: '🎯' },
          { path: 'profile', label: 'Profile', icon: '👤' }
        ];
    }
  });

  dashboardTitle = computed(() => {
    const role = this.userRole();

    switch (role) {
      case 'itiyum_admin':
        return 'Admin Dashboard';
      case 'specialist':
        return 'Specialist Dashboard';
      case 'food_enthusiast':
        return 'Food Enthusiast Hub';
      case 'normal_user':
      default:
        return 'My Itiyum';
    }
  });

  // Base path for navigation links (absolute path)
  basePath = computed(() => {
    const role = this.userRole();
    switch (role) {
      case 'itiyum_admin':
        return '/admin';
      case 'specialist':
        return '/dashboard/specialist';
      case 'food_enthusiast':
        return '/dashboard/food-enthusiast';
      case 'normal_user':
      default:
        return '/dashboard/user';
    }
  });

  getUserDisplayName(): string {
    const user = this.currentUser();
    if (!user) return 'User';

    // Try firstName + lastName first
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    if (fullName) return fullName;

    // Fallback to email (without domain) if no name
    if (user.email) {
      return user.email.split('@')[0];
    }

    return 'User';
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(open => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
