import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { User } from '../shared/models/user.model';

@Component({
  selector: 'app-layout',
  standalone: true,
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule]
})
export class LayoutComponent {
  // Inject services
  private router = inject(Router);
  protected authService = inject(AuthService);

  // State management for UI interactions
  showProfileMenu = signal(false);
  showSearchModal = signal(false);
  showNotifications = signal(false);
  showMobileMenu = signal(false);

  // Search state
  searchQuery = signal('');

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

  constructor() {
    // Effect to update authentication state
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      if (!isAuth) {
        // Close all menus when user logs out
        this.closeAllMenus();
      }
    });
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
  performSearch(): void {
    const query = this.searchQuery();
    if (query.trim()) {
      // Navigate to search results page with query
      this.router.navigate(['/search'], { queryParams: { q: query } });
      this.showSearchModal.set(false);
      this.searchQuery.set('');
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }
}
