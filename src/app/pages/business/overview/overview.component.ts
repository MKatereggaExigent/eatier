import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Subject, catchError, finalize, of, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { BusinessOwnerService, Business, Review, Booking } from '../../../core/services/business-owner.service';

interface DashboardStats {
  totalBookings: number;
  totalReviews: number;
  averageRating: number;
  totalMenuItems: number;
  pendingBookings: number;
  confirmedBookings: number;
  todayBookings: number;
}

interface LoadingState {
  business: boolean;
  reviews: boolean;
  bookings: boolean;
}

interface ErrorState {
  business: string | null;
  reviews: string | null;
  bookings: string | null;
}

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private businessOwnerService = inject(BusinessOwnerService);
  private destroy$ = new Subject<void>();

  // Reactive state management
  currentUser = this.authService.currentUser;
  business = signal<Business | null>(null);

  // Loading states
  loading = signal<LoadingState>({
    business: true,
    reviews: true,
    bookings: true
  });

  // Error states
  errors = signal<ErrorState>({
    business: null,
    reviews: null,
    bookings: null
  });

  // Data signals
  stats = signal<DashboardStats>({
    totalBookings: 0,
    totalReviews: 0,
    averageRating: 0,
    totalMenuItems: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    todayBookings: 0
  });

  recentReviews = signal<Review[]>([]);
  recentBookings = signal<Booking[]>([]);

  // Computed properties
  hasData = computed(() =>
    !this.loading().business &&
    !this.loading().reviews &&
    !this.loading().bookings
  );

  hasErrors = computed(() =>
    this.errors().business ||
    this.errors().reviews ||
    this.errors().bookings
  );

  isLoading = computed(() =>
    this.loading().business ||
    this.loading().reviews ||
    this.loading().bookings
  );

  ngOnInit(): void {
    this.loadAllData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAllData(): void {
    this.loadBusinessProfile();
    this.loadRecentReviews();
    this.loadRecentBookings();
  }

  private loadBusinessProfile(): void {
    this.loading.update(state => ({ ...state, business: true }));
    this.errors.update(state => ({ ...state, business: null }));

    this.businessOwnerService.getMyBusiness()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading business:', error);
          this.errors.update(state => ({
            ...state,
            business: 'Failed to load business profile'
          }));
          return of(null);
        }),
        finalize(() => {
          this.loading.update(state => ({ ...state, business: false }));
        })
      )
      .subscribe(response => {
        if (response && response.business) {
          this.business.set(response.business);

          // Update stats from business data
          this.stats.update(state => ({
            ...state,
            totalBookings: response.business.total_bookings || 0,
            totalReviews: response.business.total_reviews || 0,
            averageRating: response.business.average_rating || 0,
            totalMenuItems: response.business.total_menu_items || 0
          }));
        }
      });
  }

  private loadRecentReviews(): void {
    this.loading.update(state => ({ ...state, reviews: true }));
    this.errors.update(state => ({ ...state, reviews: null }));

    this.businessOwnerService.getReviews({ page: 1, limit: 5 })
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading reviews:', error);
          this.errors.update(state => ({
            ...state,
            reviews: 'Failed to load reviews'
          }));
          return of(null);
        }),
        finalize(() => {
          this.loading.update(state => ({ ...state, reviews: false }));
        })
      )
      .subscribe(response => {
        if (response && response.reviews) {
          this.recentReviews.set(response.reviews);
        }
      });
  }

  private loadRecentBookings(): void {
    this.loading.update(state => ({ ...state, bookings: true }));
    this.errors.update(state => ({ ...state, bookings: null }));

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    this.businessOwnerService.getBookings({ page: 1, limit: 10 })
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading bookings:', error);
          this.errors.update(state => ({
            ...state,
            bookings: 'Failed to load bookings'
          }));
          return of(null);
        }),
        finalize(() => {
          this.loading.update(state => ({ ...state, bookings: false }));
        })
      )
      .subscribe(response => {
        if (response && response.bookings) {
          this.recentBookings.set(response.bookings);

          // Calculate booking stats
          const pendingCount = response.bookings.filter(b => b.status === 'pending').length;
          const confirmedCount = response.bookings.filter(b => b.status === 'confirmed').length;
          const todayCount = response.bookings.filter(b => b.booking_date === today).length;

          this.stats.update(state => ({
            ...state,
            pendingBookings: pendingCount,
            confirmedBookings: confirmedCount,
            todayBookings: todayCount
          }));
        }
      });
  }

  // Helper methods for template
  getStarArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i < Math.round(rating) ? 1 : 0);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatTime(time: string): string {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'pending': 'status-pending',
      'confirmed': 'status-confirmed',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return statusClasses[status] || '';
  }

  refreshData(): void {
    this.loadAllData();
  }
}
