import { Component, HostListener, OnInit, effect, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  isAuthenticated = this.authService.isAuthenticated;
  showUserMenu = signal<boolean>(false);
  showMobileMenu = signal<boolean>(false);
  isScrolled = signal<boolean>(false);

  constructor() {
    // Close menus when authentication state changes
    effect(() => {
      if (!this.isAuthenticated()) {
        this.showUserMenu.set(false);
      }
    });
  }

  ngOnInit(): void {
    // Ensure menu is closed on component init if not authenticated
    if (!this.isAuthenticated()) {
      this.showUserMenu.set(false);
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
    this.isScrolled.set(scrollPosition > 20);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu')) {
      this.showUserMenu.set(false);
    }
    if (!target.closest('.mobile-menu-container') && !target.closest('.mobile-menu-button')) {
      this.showMobileMenu.set(false);
    }
  }

  toggleUserMenu(): void {
    this.showUserMenu.update(show => !show);
  }

  toggleMobileMenu(): void {
    this.showMobileMenu.update(show => !show);
  }

  closeMenus(): void {
    this.showUserMenu.set(false);
    this.showMobileMenu.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.closeMenus();
    this.router.navigateByUrl('/');
  }

  getDashboardRoute(): string {
    const user = this.currentUser();
    if (!user) return '/auth/login';

    switch (user.role) {
      case 'business_owner':
        return '/dashboard/business/overview';
      case 'normal_user':
        return '/dashboard/user/overview';
      case 'food_enthusiast':
        return '/dashboard/food-enthusiast/overview';
      case 'specialist':
        return '/dashboard/specialist/overview';
      case 'itiyum_admin':
        return '/admin/overview';
      default:
        return '/';
    }
  }

  getUserRoleLabel(): string {
    const user = this.currentUser();
    if (!user) {
      return '';
    }

    switch (user.role) {
      case 'business_owner':
        return 'Business Owner';
      case 'normal_user':
        return 'User';
      case 'food_enthusiast':
        return 'Food Enthusiast';
      case 'specialist':
        return 'Specialist';
      case 'itiyum_admin':
        return 'Itiyum Admin';
      default:
        return '';
    }
  }

  getProfileRoute(): string {
    const user = this.currentUser();
    if (!user) return '/login';

    switch (user.role) {
      case 'business_owner':
        return '/dashboard/business/profile';
      case 'normal_user':
        return '/dashboard/user/profile';
      case 'food_enthusiast':
        return '/dashboard/food-enthusiast/profile';
      case 'specialist':
        return '/dashboard/specialist/profile';
      case 'itiyum_admin':
        return '/admin/settings';
      default:
        return '/';
    }
  }

  getFavoritesRoute(): string {
    const user = this.currentUser();
    if (!user) return '/login';

    switch (user.role) {
      case 'normal_user':
        return '/dashboard/user/favorites';
      case 'food_enthusiast':
        return '/dashboard/food-enthusiast/favorites';
      default:
        return '/';
    }
  }

  getReviewsRoute(): string {
    const user = this.currentUser();
    if (!user) return '/login';

    switch (user.role) {
      case 'business_owner':
        return '/dashboard/business/reviews';
      case 'normal_user':
        return '/dashboard/user/reviews';
      case 'food_enthusiast':
        return '/dashboard/food-enthusiast/reviews';
      default:
        return '/';
    }
  }

  getSettingsRoute(): string {
    const user = this.currentUser();
    if (!user) return '/login';

    switch (user.role) {
      case 'business_owner':
        return '/dashboard/business/profile';
      case 'normal_user':
        return '/dashboard/user/profile';
      case 'food_enthusiast':
        return '/dashboard/food-enthusiast/profile';
      case 'specialist':
        return '/dashboard/specialist/profile';
      case 'itiyum_admin':
        return '/admin/settings';
      default:
        return '/';
    }
  }

  // Role-based visibility helpers
  canAccessBookings(): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return ['food_enthusiast', 'normal_user'].includes(user.role);
  }

  canAccessMyAds(): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return ['business_owner', 'specialist'].includes(user.role);
  }

  canAccessAnalytics(): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return ['business_owner', 'specialist', 'itiyum_admin'].includes(user.role);
  }

  getBookingsRoute(): string {
    const user = this.currentUser();
    if (!user) return '/login';

    switch (user.role) {
      case 'food_enthusiast':
        return '/dashboard/food-enthusiast/bookings';
      case 'normal_user':
        return '/dashboard/user/bookings';
      default:
        return '/';
    }
  }

  getMyAdsRoute(): string {
    const user = this.currentUser();
    if (!user) return '/login';

    switch (user.role) {
      case 'business_owner':
        return '/dashboard/business/ads';
      case 'specialist':
        return '/dashboard/specialist/ads';
      default:
        return '/';
    }
  }

  getAnalyticsRoute(): string {
    const user = this.currentUser();
    if (!user) return '/login';

    switch (user.role) {
      case 'business_owner':
        return '/dashboard/business/analytics';
      case 'specialist':
        return '/dashboard/specialist/analytics';
      case 'itiyum_admin':
        return '/admin/analytics';
      default:
        return '/';
    }
  }
}
