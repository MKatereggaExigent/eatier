import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AdminBooking {
  id: string;
  bookingReference?: string;
  bookingDate: Date;
  bookingTime: string;
  partySize: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  specialRequests?: string;
  bookingTier?: 'basic' | 'standard' | 'premium' | 'priority';
  tierPrice?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  tablePreferences?: string;
  occasion?: string;
  confirmedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  businessId: string;
  businessName: string;
  businessEmail: string;
  businessPhone?: string;
}

export interface BookingFilters {
  status: string;
  dateFrom: string;
  dateTo: string;
  sortBy: 'newest' | 'oldest' | 'date';
}

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-bookings.component.html',
  styleUrls: ['./admin-bookings.component.scss']
})
export class AdminBookingsComponent implements OnInit {
  private authService = inject(AuthService);
  private adminService = inject(AdminService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;

  // Expose Math for template
  Math = Math;

  // State management
  isLoading = signal(false);
  bookings = signal<AdminBooking[]>([]);
  selectedBooking = signal<AdminBooking | null>(null);

  // Error states
  loadError = signal<string | null>(null);
  actionError = signal<string | null>(null);

  // Action loading states
  isConfirming = signal<string | null>(null); // stores booking ID being confirmed
  isCancelling = signal<string | null>(null); // stores booking ID being cancelled
  isCompleting = signal<string | null>(null); // stores booking ID being completed

  // Toast notification
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error' | 'info'>('info');

  // Pagination
  currentPage = signal(1);
  pageSize = signal(20);
  totalBookings = signal(0);

  // UI state
  searchQuery = signal('');
  showFilters = signal(false);
  showBookingModal = signal(false);
  showConfirmDialog = signal(false);
  showCancelDialog = signal(false);
  pendingAction = signal<{ type: 'confirm' | 'cancel', booking: AdminBooking | null }>({ type: 'confirm', booking: null });
  cancelReason = signal('');
  viewMode = signal<'cards' | 'table'>('table'); // Default to table view

  // Filter options
  filters = signal<BookingFilters>({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: 'newest'
  });

  // Available options
  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'completed', label: 'Completed' }
  ];

  sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'date', label: 'Booking Date' }
  ];

  // Computed properties
  // Server-side filtering is already applied, so just return the bookings
  filteredBookings = computed(() => {
    return this.bookings();
  });

  hasActiveFilters = computed(() => {
    const currentFilters = this.filters();
    return currentFilters.status !== 'all' ||
           currentFilters.dateFrom !== '' ||
           currentFilters.dateTo !== '' ||
           this.searchQuery().length > 0;
  });

  bookingStats = computed(() => {
    const bookings = this.bookings();
    return {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      pending: bookings.filter(b => b.status === 'pending').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      totalRevenue: bookings.reduce((sum, b) => sum + (b.tierPrice || 0), 0)
    };
  });

  // Pagination computed values
  totalPages = computed(() => Math.ceil(this.totalBookings() / this.pageSize()));

  hasNextPage = computed(() => this.currentPage() < this.totalPages());

  hasPreviousPage = computed(() => this.currentPage() > 1);

  ngOnInit() {
    this.loadBookings();
  }

  // Data loading methods
  loadBookings(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    const currentFilters = this.filters();
    const searchTerm = this.searchQuery();

    this.adminService.getBookings(
      this.currentPage(),
      this.pageSize(),
      searchTerm || undefined,
      currentFilters.status,
      undefined,
      currentFilters.dateFrom || undefined,
      currentFilters.dateTo || undefined
    ).subscribe({
      next: (response: any) => {
        this.totalBookings.set(response.total || 0);
        const mappedBookings: AdminBooking[] = response.bookings.map((booking: any) => ({
          id: booking.id,
          bookingReference: booking.booking_reference,
          bookingDate: new Date(booking.booking_date),
          bookingTime: booking.booking_time,
          partySize: booking.party_size,
          status: booking.status,
          specialRequests: booking.special_requests,
          bookingTier: booking.booking_tier,
          tierPrice: booking.tier_price ? parseFloat(booking.tier_price) : undefined,
          contactName: booking.contact_name,
          contactPhone: booking.contact_phone,
          contactEmail: booking.contact_email,
          tablePreferences: booking.table_preferences,
          occasion: booking.occasion,
          confirmedAt: booking.confirmed_at ? new Date(booking.confirmed_at) : undefined,
          cancelledAt: booking.cancelled_at ? new Date(booking.cancelled_at) : undefined,
          cancellationReason: booking.cancellation_reason,
          createdAt: new Date(booking.created_at),
          updatedAt: new Date(booking.updated_at),
          userId: booking.user_id,
          userName: booking.user_name || 'Unknown',
          userEmail: booking.user_email || '',
          userPhone: booking.user_phone,
          businessId: booking.business_id,
          businessName: booking.business_name || 'Unknown',
          businessEmail: booking.business_email || '',
          businessPhone: booking.business_phone
        }));

        this.bookings.set(mappedBookings);
        this.isLoading.set(false);
        this.loadError.set(null);
      },
      error: (error) => {
        console.error('Error loading bookings:', error);
        this.loadError.set('Failed to load bookings. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  retryLoadBookings(): void {
    this.loadBookings();
  }

  // UI interaction methods
  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  clearFilters(): void {
    this.filters.set({
      status: 'all',
      dateFrom: '',
      dateTo: '',
      sortBy: 'newest'
    });
    this.searchQuery.set('');
    this.loadBookings();
  }

  private searchTimeout: any;

  updateFilter(key: keyof BookingFilters, value: string): void {
    this.filters.update(current => ({ ...current, [key]: value }));
    this.loadBookings();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.loadBookings();
    }, 500);
  }

  onFilterChange(key: keyof BookingFilters, event: Event): void {
    const target = event.target as HTMLSelectElement | HTMLInputElement;
    this.updateFilter(key, target.value);
  }

  // Booking actions
  viewBookingDetails(booking: AdminBooking): void {
    this.router.navigate(['/admin/bookings', booking.id]);
  }

  closeBookingModal(): void {
    this.selectedBooking.set(null);
    this.showBookingModal.set(false);
  }

  // Toast notification methods
  showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 5000); // Auto-hide after 5 seconds
  }

  hideToast(): void {
    this.toastMessage.set(null);
  }

  confirmBooking(booking: AdminBooking): void {
    this.pendingAction.set({ type: 'confirm', booking });
    this.showConfirmDialog.set(true);
  }

  cancelBooking(booking: AdminBooking): void {
    this.pendingAction.set({ type: 'cancel', booking });
    this.cancelReason.set('');
    this.showCancelDialog.set(true);
  }

  executeConfirmBooking(): void {
    const action = this.pendingAction();
    if (!action.booking) return;

    this.isConfirming.set(action.booking.id);
    this.adminService.confirmBooking(action.booking.id).subscribe({
      next: () => {
        this.loadBookings(); // Reload to get fresh data
        this.showConfirmDialog.set(false);
        this.showToast(`Booking for ${action.booking!.userName} has been confirmed.`, 'success');
        this.isConfirming.set(null);
      },
      error: (error) => {
        console.error('Error confirming booking:', error);
        this.showToast('Failed to confirm booking. Please try again.', 'error');
        this.isConfirming.set(null);
      }
    });
  }

  executeCancelBooking(): void {
    const action = this.pendingAction();
    const reason = this.cancelReason();

    if (!action.booking || !reason.trim()) {
      this.showToast('Please provide a cancellation reason.', 'error');
      return;
    }

    this.isCancelling.set(action.booking.id);
    this.adminService.cancelBooking(action.booking.id, reason).subscribe({
      next: () => {
        this.loadBookings(); // Reload to get fresh data
        this.showCancelDialog.set(false);
        this.cancelReason.set('');
        this.showToast(`Booking for ${action.booking!.userName} has been cancelled.`, 'success');
        this.isCancelling.set(null);
      },
      error: (error) => {
        console.error('Error cancelling booking:', error);
        this.showToast('Failed to cancel booking. Please try again.', 'error');
        this.isCancelling.set(null);
      }
    });
  }

  closeConfirmDialog(): void {
    this.showConfirmDialog.set(false);
    this.pendingAction.set({ type: 'confirm', booking: null });
  }

  closeCancelDialog(): void {
    this.showCancelDialog.set(false);
    this.pendingAction.set({ type: 'cancel', booking: null });
    this.cancelReason.set('');
  }

  // Navigation methods
  viewUserDetails(userId: string): void {
    this.router.navigate(['/admin/users', userId]);
  }

  viewBusinessDetails(businessId: string): void {
    this.router.navigate(['/admin/businesses', businessId]);
  }

  // Utility methods
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatTime(time: string): string {
    // Convert 24-hour time to 12-hour format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  getStatusBadgeClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'warning',
      'confirmed': 'success',
      'cancelled': 'error',
      'completed': 'info'
    };
    return statusMap[status] || 'secondary';
  }

  // View toggle method
  toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === 'cards' ? 'table' : 'cards');
  }

  // Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadBookings();
    }
  }

  nextPage(): void {
    if (this.hasNextPage()) {
      this.currentPage.update(page => page + 1);
      this.loadBookings();
    }
  }

  previousPage(): void {
    if (this.hasPreviousPage()) {
      this.currentPage.update(page => page - 1);
      this.loadBookings();
    }
  }

  changePageSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newSize = parseInt(target.value, 10);
    this.pageSize.set(newSize);
    this.currentPage.set(1); // Reset to first page
    this.loadBookings();
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current > 3) {
        pages.push(-1); // Ellipsis
      }

      // Show pages around current
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push(-1); // Ellipsis
      }

      // Always show last page
      pages.push(total);
    }

    return pages;
  }
}

