import { Component, computed, effect, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { NotificationService, Notification } from '../services/notification.service';
import { SearchService, SearchResult } from '../services/search.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private searchService = inject(SearchService);

  user = this.authService.currentUser;
  isAuthenticated = computed(() => !!this.user());

  showUserMenu = signal(false);
  showGuestMenu = signal(false);
  showNotifications = signal(false);
  showSearchResults = signal(false);
  showMobileMenu = signal(false);
  isScrolled = signal(false);

  // Notification state
  notifications = this.notificationService.notifications;
  unreadCount = this.notificationService.unreadCount;

  // Search state
  searchQuery = signal('');
  searchResults = this.searchService.searchResults;
  isSearching = this.searchService.isSearching;
  hasResults = this.searchService.hasResults;
  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    // Load notifications if user is authenticated
    if (this.isAuthenticated()) {
      this.notificationService.loadNotifications();
    }

    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      if (query.trim().length >= 2) {
        this.searchService.search(query).subscribe();
      } else {
        this.searchService.clearSearch();
      }
    });

    // Listen for scroll events
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', this.handleScroll.bind(this));
    }

    // Listen for clicks outside to close dropdowns
    if (typeof document !== 'undefined') {
      document.addEventListener('click', this.handleClickOutside.bind(this));
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.handleScroll.bind(this));
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', this.handleClickOutside.bind(this));
    }
    this.searchSubject.complete();
  }

  private handleScroll(): void {
    this.isScrolled.set(window.scrollY > 50);
  }

  private handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-container') && !target.closest('.guest-menu-container')) {
      this.showUserMenu.set(false);
      this.showGuestMenu.set(false);
    }
    if (!target.closest('.notifications-container')) {
      this.showNotifications.set(false);
    }
    if (!target.closest('.search-container')) {
      this.showSearchResults.set(false);
    }
  }

  // Menu toggles
  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.showUserMenu.update(v => !v);
    this.showGuestMenu.set(false);
    this.showNotifications.set(false);
  }

  toggleGuestMenu(event: Event): void {
    event.stopPropagation();
    this.showGuestMenu.update(v => !v);
    this.showUserMenu.set(false);
    this.showNotifications.set(false);
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications.update(v => !v);
    this.showUserMenu.set(false);
    this.showGuestMenu.set(false);
  }

  toggleMobileMenu(): void {
    this.showMobileMenu.update(v => !v);
  }

  closeMenus(): void {
    this.showUserMenu.set(false);
    this.showGuestMenu.set(false);
    this.showNotifications.set(false);
    this.showMobileMenu.set(false);
  }

  // Search methods
  onSearchInput(event: Event): void {
    const { value } = event.target as HTMLInputElement;
    this.searchQuery.set(value);
    this.searchSubject.next(value);
    this.showSearchResults.set(true);
  }

  onSearchFocus(): void {
    if (this.searchQuery().trim().length >= 2) {
      this.showSearchResults.set(true);
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchService.clearSearch();
    this.showSearchResults.set(false);
  }

  navigateToResult(result: SearchResult): void {
    this.router.navigate([result.link]);
    this.clearSearch();
  }

  // Notification methods
  markAsRead(notification: Notification, event: Event): void {
    event.stopPropagation();
    this.notificationService.markAsRead(notification.id).subscribe();
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  deleteNotification(notificationId: string, event: Event): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(notificationId).subscribe();
  }

  navigateToNotification(notification: Notification): void {
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
      this.markAsRead(notification, new Event('click'));
      this.showNotifications.set(false);
    }
  }

  getTimeAgo(timestamp: Date): string {
    return this.notificationService.getTimeAgo(timestamp);
  }

  // Navigation methods
  getDashboardRoute(): string {
    const currentUser = this.user();
    if (!currentUser) return '/login';

    switch (currentUser.role) {
      case 'itiyum_admin':
        return '/admin/overview';
      case 'business_owner':
        return '/business-owner/overview';
      case 'food_enthusiast':
      case 'specialist':
      case 'normal_user':
        return '/dashboard/user';
      default:
        return '/dashboard';
    }
  }

  getUserRoleLabel(): string {
    const currentUser = this.user();
    if (!currentUser) return '';

    const roleLabels: Record<string, string> = {
      'itiyum_admin': 'Admin',
      'business_owner': 'Business Owner',
      'food_enthusiast': 'Food Enthusiast',
      'specialist': 'Specialist',
      'normal_user': 'Member'
    };

    return roleLabels[currentUser.role] || 'User';
  }

  logout(): void {
    this.authService.logout();
    this.closeMenus();
    this.router.navigate(['/']);
  }
}
