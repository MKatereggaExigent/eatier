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

  // Expose Math for template
  Math = Math;

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

  // Bookings table state
  bookingsPage = signal<number>(1);
  bookingsPageSize = signal<number>(10);
  bookingsTotalCount = signal<number>(0);
  bookingsSearchQuery = signal<string>('');
  bookingsSortColumn = signal<string>('booking_date');
  bookingsSortDirection = signal<'asc' | 'desc'>('desc');

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

  // Bookings pagination computed
  bookingsTotalPages = computed(() =>
    Math.ceil(this.bookingsTotalCount() / this.bookingsPageSize())
  );

  bookingsHasNextPage = computed(() =>
    this.bookingsPage() < this.bookingsTotalPages()
  );

  bookingsHasPrevPage = computed(() =>
    this.bookingsPage() > 1
  );

  // Filtered bookings for display (client-side search)
  filteredBookings = computed(() => {
    const query = this.bookingsSearchQuery().toLowerCase();
    if (!query) return this.recentBookings();

    return this.recentBookings().filter(booking =>
      booking.customer_name?.toLowerCase().includes(query) ||
      booking.customer_email?.toLowerCase().includes(query) ||
      booking.booking_reference?.toLowerCase().includes(query) ||
      booking.customer_phone?.includes(query)
    );
  });

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
    this.loadBookingStats();
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

    // Fetch bookings with pagination
    this.businessOwnerService.getBookings({
      page: this.bookingsPage(),
      limit: this.bookingsPageSize()
    })
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
          this.bookingsTotalCount.set(response.total);

          // Calculate booking stats from current page
          const bookings = response.bookings;
          const pendingCount = bookings.filter(b => b.status === 'pending').length;
          const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
          const todayCount = bookings.filter(b => b.booking_date === today).length;

          this.stats.update(state => ({
            ...state,
            totalBookings: response.total,
            pendingBookings: pendingCount,
            confirmedBookings: confirmedCount,
            todayBookings: todayCount
          }));
        }
      });
  }

  // Load stats from all bookings (for accurate counts)
  private loadBookingStats(): void {
    const today = new Date().toISOString().split('T')[0];
    console.log('Today\'s date for comparison:', today);

    // Fetch ALL bookings to calculate accurate stats
    this.businessOwnerService.getBookings({ page: 1, limit: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => {
        if (response && response.bookings) {
          const allBookings = response.bookings;

          // Debug: Log all booking dates
          console.log('All booking dates:', allBookings.map(b => ({
            ref: b.booking_reference,
            date: b.booking_date,
            matchesToday: b.booking_date === today
          })));

          const pendingCount = allBookings.filter(b => b.status === 'pending').length;
          const confirmedCount = allBookings.filter(b => b.status === 'confirmed').length;
          const todayCount = allBookings.filter(b => b.booking_date === today).length;

          console.log('Today\'s bookings count:', todayCount);

          this.stats.update(state => ({
            ...state,
            totalBookings: response.total,
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

  // Bookings table methods
  onBookingsPageChange(page: number): void {
    this.bookingsPage.set(page);
    this.loadRecentBookings();
  }

  onBookingsPageSizeChange(pageSize: number): void {
    this.bookingsPageSize.set(pageSize);
    this.bookingsPage.set(1); // Reset to first page
    this.loadRecentBookings();
  }

  onBookingsSearchChange(query: string): void {
    this.bookingsSearchQuery.set(query);
  }

  onBookingsSortChange(column: string): void {
    if (this.bookingsSortColumn() === column) {
      // Toggle direction
      this.bookingsSortDirection.set(
        this.bookingsSortDirection() === 'asc' ? 'desc' : 'asc'
      );
    } else {
      // New column, default to ascending
      this.bookingsSortColumn.set(column);
      this.bookingsSortDirection.set('asc');
    }
    this.sortBookings();
  }

  private sortBookings(): void {
    const column = this.bookingsSortColumn();
    const direction = this.bookingsSortDirection();

    this.recentBookings.update(bookings => {
      const sorted = [...bookings].sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (column) {
          case 'booking_reference':
            aVal = a.booking_reference || '';
            bVal = b.booking_reference || '';
            break;
          case 'customer_name':
            aVal = a.customer_name || '';
            bVal = b.customer_name || '';
            break;
          case 'booking_date':
            aVal = new Date(a.booking_date + ' ' + a.booking_time);
            bVal = new Date(b.booking_date + ' ' + b.booking_time);
            break;
          case 'party_size':
            aVal = a.party_size;
            bVal = b.party_size;
            break;
          case 'status':
            aVal = a.status;
            bVal = b.status;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });

      return sorted;
    });
  }

  // Booking action methods
  confirmBooking(booking: Booking): void {
    if (!confirm(`Confirm booking for ${booking.customer_name}?`)) {
      return;
    }

    this.businessOwnerService.updateBookingStatus(booking.id, 'confirmed')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Update the booking in the list
          this.recentBookings.update(bookings =>
            bookings.map(b => b.id === booking.id ? { ...b, status: 'confirmed' as const } : b)
          );
          // Refresh stats
          this.loadRecentBookings();
        },
        error: (error) => {
          console.error('Error confirming booking:', error);
          alert('Failed to confirm booking. Please try again.');
        }
      });
  }

  cancelBooking(booking: Booking): void {
    if (!confirm(`Cancel booking for ${booking.customer_name}?`)) {
      return;
    }

    this.businessOwnerService.updateBookingStatus(booking.id, 'cancelled')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Update the booking in the list
          this.recentBookings.update(bookings =>
            bookings.map(b => b.id === booking.id ? { ...b, status: 'cancelled' as const } : b)
          );
          // Refresh stats
          this.loadRecentBookings();
        },
        error: (error) => {
          console.error('Error cancelling booking:', error);
          alert('Failed to cancel booking. Please try again.');
        }
      });
  }

  deleteBooking(booking: Booking): void {
    if (!confirm(`Permanently delete booking for ${booking.customer_name}? This cannot be undone.`)) {
      return;
    }

    this.businessOwnerService.deleteBooking(booking.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Remove the booking from the list
          this.recentBookings.update(bookings =>
            bookings.filter(b => b.id !== booking.id)
          );
          // Refresh stats
          this.loadRecentBookings();
        },
        error: (error) => {
          console.error('Error deleting booking:', error);
          alert('Failed to delete booking. Please try again.');
        }
      });
  }

  sendMessage(booking: Booking): void {
    const message = prompt(`Send a message to ${booking.customer_name}:`,
      booking.status === 'confirmed'
        ? `Your booking for ${booking.party_size} on ${this.formatDate(booking.booking_date)} at ${this.formatTime(booking.booking_time)} is confirmed!`
        : `We're sorry, but we need to cancel your booking for ${booking.party_size} on ${this.formatDate(booking.booking_date)}.`
    );

    if (!message) {
      return;
    }

    this.businessOwnerService.sendBookingMessage(booking.id, message)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          alert('Message sent successfully!');
        },
        error: (error) => {
          console.error('Error sending message:', error);
          alert('Failed to send message. Please try again.');
        }
      });
  }
}
