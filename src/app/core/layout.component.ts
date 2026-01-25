import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { FooterAdComponent } from '../shared/components/ads/footer-ad/footer-ad.component';
import { FormsModule } from '@angular/forms';
import { HeaderAdComponent } from '../shared/components/ads/header-ad/header-ad.component';
import { LeftSidebarAdComponent } from '../shared/components/ads/left-sidebar-ad/left-sidebar-ad.component';
import { NotificationService } from './services/notification.service';
import { RightSidebarAdComponent } from '../shared/components/ads/right-sidebar-ad/right-sidebar-ad.component';
import { SearchService } from './services/search.service';
import { User } from '../shared/models/user.model';

// Navigation item interface
interface NavItem {
  label: string;
  icon: string;
  route: string;
  exactMatch?: boolean;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    FormsModule,
    HeaderAdComponent,
    FooterAdComponent,
    LeftSidebarAdComponent,
    RightSidebarAdComponent
  ]
})
export class LayoutComponent {
  // Inject services
  private router = inject(Router);
  protected authService = inject(AuthService);
  protected searchService = inject(SearchService);
  protected notificationService = inject(NotificationService);

  // State management for UI interactions
  showProfileMenu = signal(false);
  showSearchModal = signal(false);
  showNotifications = signal(false);
  showMobileMenu = signal(false);

  // Search state
  searchQuery = signal('');

  // Expose service signals to template
  searchResults = this.searchService.searchResults;
  isSearching = this.searchService.isSearching;
  hasResults = this.searchService.hasResults;

  // Notification state
  notifications = this.notificationService.notifications;
  unreadCount = this.notificationService.unreadCount;

  // Computed values from AuthService
  isLoggedIn = computed(() => this.authService.isAuthenticated());
  currentUser = computed(() => this.authService.currentUser());

  // User display name
  userDisplayName = computed(() => {
    const user = this.currentUser();
    if (!user) return '';
    return `${user.firstName} ${user.lastName}`;
  });

  // User initials for avatar fallback
  userInitials = computed(() => {
    const user = this.currentUser();
    if (!user) return '?';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  });

  // Navigation items based on login state and role
  navigationItems = computed<NavItem[]>(() => {
    const isAuthenticated = this.isLoggedIn();
    const user = this.currentUser();

    // Guest navigation (not logged in)
    if (!isAuthenticated || !user) {
      return [
        { label: 'About', icon: '🏠', route: '/about' },
        { label: 'Grow', icon: '📈', route: '/grow' },
        { label: 'Restaurants', icon: '🍽️', route: '/restaurants' },
        { label: 'Specialists', icon: '👨‍🍳', route: '/specialists' },
        { label: 'Pricing', icon: '💳', route: '/pricing' },
        { label: 'Blog', icon: '📝', route: '/blog' },
        { label: 'Community', icon: '🌟', route: '/community' },
        { label: 'FAQs', icon: '❓', route: '/faqs' },
        { label: 'Help', icon: '💬', route: '/help' }
      ];
    }

    // Role-based navigation for authenticated users
    const role = user.role;

    switch (role) {
      case 'itiyum_admin':
        return [
          { label: 'Dashboard', icon: '📊', route: '/admin' },
          { label: 'Users', icon: '👥', route: '/admin/users' },
          { label: 'Businesses', icon: '🏢', route: '/admin/businesses' },
          { label: 'Analytics', icon: '📈', route: '/admin/analytics' },
          { label: 'Reports', icon: '📋', route: '/admin/reports' },
          { label: 'Settings', icon: '⚙️', route: '/admin/settings' }
        ];

      case 'business_owner':
        return [
          { label: 'Dashboard', icon: '📊', route: '/dashboard/business' },
          { label: 'Restaurants', icon: '🍽️', route: '/restaurants' },
          { label: 'Bookings', icon: '📅', route: '/dashboard/business/bookings' },
          { label: 'Menu', icon: '📜', route: '/dashboard/business/menu' },
          { label: 'Reviews', icon: '⭐', route: '/dashboard/business/reviews' },
          { label: 'Analytics', icon: '📈', route: '/dashboard/business/analytics' }
        ];

      case 'specialist':
        return [
          { label: 'Dashboard', icon: '📊', route: '/dashboard/specialist' },
          { label: 'Restaurants', icon: '🍽️', route: '/restaurants' },
          { label: 'My Bookings', icon: '📅', route: '/dashboard/specialist/bookings' },
          { label: 'Portfolio', icon: '🎨', route: '/dashboard/specialist/portfolio' },
          { label: 'Community', icon: '🌟', route: '/community' },
          { label: 'Wallet', icon: '💰', route: '/dashboard/specialist/wallet' }
        ];

      case 'food_enthusiast':
        return [
          { label: 'Dashboard', icon: '📊', route: '/dashboard/food-enthusiast' },
          { label: 'Restaurants', icon: '🍽️', route: '/restaurants' },
          { label: 'Specialists', icon: '👨‍🍳', route: '/specialists' },
          { label: 'My Bookings', icon: '📅', route: '/dashboard/food-enthusiast/bookings' },
          { label: 'Community', icon: '🌟', route: '/community' },
          { label: 'Favorites', icon: '❤️', route: '/dashboard/food-enthusiast/favorites' }
        ];

      case 'normal_user':
      default:
        return [
          { label: 'Dashboard', icon: '📊', route: '/dashboard/user' },
          { label: 'Restaurants', icon: '🍽️', route: '/restaurants' },
          { label: 'Specialists', icon: '👨‍🍳', route: '/specialists' },
          { label: 'My Bookings', icon: '📅', route: '/dashboard/user/bookings' },
          { label: 'Favorites', icon: '❤️', route: '/dashboard/user/favorites' },
          { label: 'Wallet', icon: '💰', route: '/dashboard/user/wallet' }
        ];
    }
  });

  constructor() {
    // Effect to update authentication state
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      if (!isAuth) {
        // Close all menus when user logs out
        this.closeAllMenus();
      }
    });

    // Load notifications when component initializes
    this.notificationService.loadNotifications();
  }

  // Toggle methods for interactive elements
  toggleProfileMenu(): void {
    this.showProfileMenu.set(!this.showProfileMenu());
    // Close other menus
    this.showSearchModal.set(false);
    this.showNotifications.set(false);
  }

  toggleSearch(): void {
    this.showSearchModal.set(!this.showSearchModal());
    // Close other menus
    this.showProfileMenu.set(false);
    this.showNotifications.set(false);
  }

  toggleNotifications(): void {
    this.showNotifications.set(!this.showNotifications());
    // Close other menus
    this.showProfileMenu.set(false);
    this.showSearchModal.set(false);
    this.showMobileMenu.set(false);
  }

  toggleMobileMenu(): void {
    this.showMobileMenu.set(!this.showMobileMenu());
    // Close other menus
    this.showProfileMenu.set(false);
    this.showSearchModal.set(false);
    this.showNotifications.set(false);
  }

  // Close all menus when clicking outside
  closeAllMenus(): void {
    this.showProfileMenu.set(false);
    this.showSearchModal.set(false);
    this.showNotifications.set(false);
    this.showMobileMenu.set(false);
  }

  // Get dashboard route based on user role
  getDashboardRoute(): string {
    const user = this.currentUser();
    if (!user) return '/dashboard/user';

    switch (user.role) {
      case 'itiyum_admin':
        return '/admin';
      case 'business_owner':
        return '/dashboard/business';
      case 'specialist':
        return '/dashboard/specialist';
      case 'food_enthusiast':
        return '/dashboard/food-enthusiast';
      case 'normal_user':
      default:
        return '/dashboard/user';
    }
  }

  // Logout functionality
  logout(): void {
    // Use AuthService for proper logout
    this.authService.logout();

    // Close profile menu
    this.showProfileMenu.set(false);

    // Redirect to home page
    this.router.navigate(['/']);
  }

  // Search functionality
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input.value;
    this.searchQuery.set(query);

    if (query.trim().length >= 2) {
      // Perform search via service
      this.searchService.search(query).subscribe();
    } else {
      // Clear results if query is too short
      this.searchService.clearSearch();
    }
  }

  navigateToResult(result: any): void {
    this.router.navigate([result.link]);
    this.showSearchModal.set(false);
    this.searchQuery.set('');
    this.searchService.clearSearch();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchService.clearSearch();
  }

  searchSuggestion(query: string): void {
    this.searchQuery.set(query);
    this.searchService.search(query).subscribe();
  }

  // Notification functionality
  markAsRead(notificationId: string): void {
    this.notificationService.markAsRead(notificationId).subscribe();
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  deleteNotification(notificationId: string): void {
    this.notificationService.deleteNotification(notificationId).subscribe();
  }

  getTimeAgo(timestamp: Date): string {
    return this.notificationService.getTimeAgo(timestamp);
  }

  navigateToNotificationAction(notification: any): void {
    if (notification.action_url) {
      this.router.navigate([notification.action_url]);
      this.showNotifications.set(false);
      this.markAsRead(notification.id);
    }
  }
}
