import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

interface NavigationItem {
  path: string;
  label: string;
  icon: string;
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

  currentUser = this.authService.currentUser;
  userRole = this.authService.userRole;

  // Dynamic navigation based on user role
  navigationItems = computed<NavigationItem[]>(() => {
    const role = this.userRole();

    switch (role) {
      case 'eatier':
        return [
          { path: 'overview', label: 'Overview', icon: '📊' },
          { path: 'users', label: 'Users', icon: '👥' },
          { path: 'businesses', label: 'Businesses', icon: '🏪' },
          { path: 'bookings', label: 'Bookings', icon: '📅' },
          { path: 'ads', label: 'Manage My Ads', icon: '📢' },
          { path: 'analytics', label: 'Analytics', icon: '📈' },
          { path: 'reports', label: 'Reports', icon: '📋' },
          { path: 'settings', label: 'Settings', icon: '⚙️' }
        ];

      case 'specialist':
        return [
          { path: 'overview', label: 'Overview', icon: '📊' },
          { path: 'portfolio', label: 'Portfolio', icon: '📸' },
          { path: 'availability', label: 'Availability', icon: '📅' },
          { path: 'ads', label: 'Manage My Ads', icon: '📢' },
          { path: 'profile', label: 'Profile', icon: '👤' },
          { path: 'bookings', label: 'Bookings', icon: '📋' }
        ];

      case 'food_enthusiast':
        return [
          { path: 'overview', label: 'Overview', icon: '📊' },
          { path: 'profile', label: 'Profile', icon: '👤' },
          { path: 'favorites', label: 'Favorites', icon: '❤️' },
          { path: 'reviews', label: 'My Reviews', icon: '⭐' },
          { path: 'ads', label: 'Manage My Ads', icon: '📢' },
          { path: 'insights', label: 'Insights', icon: '📈' },
          { path: 'bookings', label: 'Bookings', icon: '📋' }
        ];

      case 'normal_user':
      default:
        return [
          { path: 'overview', label: 'Overview', icon: '📊' },
          { path: 'profile', label: 'Profile', icon: '👤' },
          { path: 'favorites', label: 'Favorites', icon: '❤️' },
          { path: 'reviews', label: 'My Reviews', icon: '⭐' },
          { path: 'ads', label: 'Manage My Ads', icon: '📢' },
          { path: 'bookings', label: 'Bookings', icon: '📋' }
        ];
    }
  });

  dashboardTitle = computed(() => {
    const role = this.userRole();

    switch (role) {
      case 'eatier':
        return 'Admin Dashboard';
      case 'specialist':
        return 'Specialist Dashboard';
      case 'food_enthusiast':
        return 'Food Enthusiast Hub';
      case 'normal_user':
      default:
        return 'My Eatier';
    }
  });

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
