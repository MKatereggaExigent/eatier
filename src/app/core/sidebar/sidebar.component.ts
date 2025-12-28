import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subject, catchError, of, takeUntil } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { BusinessOwner } from '../../shared/models/user.model';
import { BusinessOwnerService, BusinessSubscription } from '../services/business-owner.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TitleCasePipe],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private businessOwnerService = inject(BusinessOwnerService);
  private destroy$ = new Subject<void>();

  // State management
  isCollapsed = signal(false);
  isMobileOpen = signal(false);
  currentUser = this.authService.currentUser;
  isHovering = signal(false);

  // Business information
  businessName = signal('My Restaurant');
  businessType = signal('Restaurant');
  subscriptionStatus = signal<'trial' | 'active' | 'expired' | 'inactive'>('trial');
  trialDaysLeft = signal<number | null>(null);
  unreadReviews = signal(0);
  subscription = signal<BusinessSubscription | null>(null);

  // Computed properties
  businessOwner = computed(() => {
    const user = this.currentUser();
    return user && user.role === 'business_owner' ? user as BusinessOwner : null;
  });

  @HostListener('window:resize', [])
  onResize(): void {
    if (window.innerWidth >= 1024) {
      this.isMobileOpen.set(false);
    }
  }

  ngOnInit(): void {
    this.loadBusinessInfo();
    this.loadUnreadReviewsCount();
    // Auto-collapse on mobile
    if (window.innerWidth < 1024) {
      this.isCollapsed.set(true);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBusinessInfo(): void {
    const owner = this.businessOwner();
    if (owner) {
      // Fetch business and subscription data from API
      this.businessOwnerService.getMyBusiness()
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            console.error('Error loading business info:', error);
            // Fallback to user data if API fails
            this.businessName.set(`${owner.firstName} ${owner.lastName}'s Restaurant`);
            this.businessType.set('Restaurant');
            this.subscriptionStatus.set(owner.subscriptionStatus || 'trial');
            this.trialDaysLeft.set(owner.subscriptionStatus === 'trial' ? 14 : null);
            return of(null);
          })
        )
        .subscribe(response => {
          if (response) {
            const { business, subscription } = response;

            // Set business info
            this.businessName.set(business.business_name || `${owner.firstName}'s Business`);
            this.businessType.set(business.business_type || 'Restaurant');

            // Set subscription info
            if (subscription) {
              this.subscription.set(subscription);
              this.subscriptionStatus.set(subscription.status as 'trial' | 'active' | 'expired' | 'inactive');

              // Set trial days left from API
              if (subscription.status === 'trial' && subscription.trialDaysLeft !== undefined) {
                this.trialDaysLeft.set(subscription.trialDaysLeft);
              } else {
                this.trialDaysLeft.set(null);
              }
            } else {
              // No subscription record - default to trial
              this.subscriptionStatus.set('trial');
              this.trialDaysLeft.set(14);
            }
          }
        });
    }
  }

  private loadUnreadReviewsCount(): void {
    // Fetch all reviews and count those without responses (pending reviews)
    this.businessOwnerService.getReviews({ page: 1, limit: 100 })
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading reviews count:', error);
          this.unreadReviews.set(0);
          return of({ reviews: [], total: 0, pagination: { page: 1, limit: 100, hasMore: false } });
        })
      )
      .subscribe(response => {
        if (response && response.reviews) {
          // Count reviews that don't have a response from owner (pending reviews)
          const pendingCount = response.reviews.filter(review => !review.response_from_owner).length;
          this.unreadReviews.set(pendingCount);
        }
      });
  }

  // UI Methods
  toggleSidebar(): void {
    this.isCollapsed.update(collapsed => !collapsed);
  }

  toggleMobileSidebar(): void {
    this.isMobileOpen.update(open => !open);
  }

  closeMobileSidebar(): void {
    this.isMobileOpen.set(false);
  }

  onMouseEnter(): void {
    if (this.isCollapsed() && window.innerWidth >= 1024) {
      this.isHovering.set(true);
    }
  }

  onMouseLeave(): void {
    this.isHovering.set(false);
  }

  getSubscriptionIcon(): string {
    switch (this.subscriptionStatus()) {
      case 'active':
        return '✅';
      case 'trial':
        return '⏰';
      case 'expired':
        return '⚠️';
      case 'inactive':
        return '⏸️';
      default:
        return '📋';
    }
  }

  // Logout method
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
