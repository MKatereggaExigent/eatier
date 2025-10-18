import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';

export interface AdminBooking {
  id: string;
  bookingDate: Date;
  bookingTime: string;
  partySize: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  specialRequests?: string;
  totalAmount?: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  businessId: string;
  businessName: string;
  businessType: string;
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

  currentUser = this.authService.currentUser;

  // State management
  isLoading = signal(false);
  bookings = signal<AdminBooking[]>([]);
  selectedBooking = signal<AdminBooking | null>(null);

  // UI state
  searchQuery = signal('');
  showFilters = signal(false);
  showBookingModal = signal(false);

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
  filteredBookings = computed(() => {
    let filtered = this.bookings();
    const query = this.searchQuery().toLowerCase();
    const currentFilters = this.filters();

    // Search filter
    if (query) {
      filtered = filtered.filter(booking =>
        booking.userName.toLowerCase().includes(query) ||
        booking.userEmail.toLowerCase().includes(query) ||
        booking.businessName.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (currentFilters.status !== 'all') {
      filtered = filtered.filter(booking => booking.status === currentFilters.status);
    }

    // Date range filter
    if (currentFilters.dateFrom) {
      const fromDate = new Date(currentFilters.dateFrom);
      filtered = filtered.filter(booking => new Date(booking.bookingDate) >= fromDate);
    }

    if (currentFilters.dateTo) {
      const toDate = new Date(currentFilters.dateTo);
      filtered = filtered.filter(booking => new Date(booking.bookingDate) <= toDate);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (currentFilters.sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date':
          return new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime();
        default:
          return 0;
      }
    });

    return filtered;
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
      totalRevenue: bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
    };
  });

  ngOnInit() {
    this.loadBookings();
  }

  // Data loading methods
  loadBookings(): void {
    this.isLoading.set(true);
    
    const currentFilters = this.filters();
    const searchTerm = this.searchQuery();
    
    this.adminService.getBookings(
      1,
      100,
      searchTerm || undefined,
      currentFilters.status,
      undefined,
      currentFilters.dateFrom || undefined,
      currentFilters.dateTo || undefined
    ).subscribe({
      next: (response: any) => {
        const mappedBookings: AdminBooking[] = response.bookings.map((booking: any) => ({
          id: booking.id,
          bookingDate: new Date(booking.booking_date),
          bookingTime: booking.booking_time,
          partySize: booking.party_size,
          status: booking.status,
          specialRequests: booking.special_requests,
          totalAmount: booking.total_amount ? parseFloat(booking.total_amount) : undefined,
          createdAt: new Date(booking.created_at),
          updatedAt: new Date(booking.updated_at),
          userId: booking.user_id,
          userName: booking.user_name || 'Unknown',
          userEmail: booking.user_email || '',
          userPhone: booking.user_phone,
          businessId: booking.business_id,
          businessName: booking.business_name || 'Unknown',
          businessType: booking.business_type || '',
          businessEmail: booking.business_email || '',
          businessPhone: booking.business_phone
        }));
        
        this.bookings.set(mappedBookings);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading bookings:', error);
        this.isLoading.set(false);
        alert('Failed to load bookings. Please try again.');
      }
    });
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
    this.selectedBooking.set(booking);
    this.showBookingModal.set(true);
  }

  closeBookingModal(): void {
    this.selectedBooking.set(null);
    this.showBookingModal.set(false);
  }

  confirmBooking(booking: AdminBooking): void {
    if (confirm(`Confirm booking for ${booking.userName} at ${booking.businessName}?`)) {
      this.adminService.confirmBooking(booking.id).subscribe({
        next: () => {
          const bookings = this.bookings();
          const updatedBookings = bookings.map(b =>
            b.id === booking.id ? { ...b, status: 'confirmed' as const } : b
          );
          this.bookings.set(updatedBookings);
          alert('Booking confirmed successfully.');
        },
        error: (error) => {
          console.error('Error confirming booking:', error);
          alert('Failed to confirm booking. Please try again.');
        }
      });
    }
  }

  cancelBooking(booking: AdminBooking): void {
    const reason = prompt(`Enter reason for cancelling booking for ${booking.userName}:`);
    if (reason !== null) {
      this.adminService.cancelBooking(booking.id, reason).subscribe({
        next: () => {
          const bookings = this.bookings();
          const updatedBookings = bookings.map(b =>
            b.id === booking.id ? { ...b, status: 'cancelled' as const } : b
          );
          this.bookings.set(updatedBookings);
          alert('Booking cancelled successfully.');
        },
        error: (error) => {
          console.error('Error cancelling booking:', error);
          alert('Failed to cancel booking. Please try again.');
        }
      });
    }
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
}

