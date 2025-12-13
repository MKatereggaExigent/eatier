import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BusinessOwnerService, Booking } from '../../../core/services/business-owner.service';

@Component({
  selector: 'app-business-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './business-bookings.component.html',
  styleUrls: ['./business-bookings.component.scss']
})
export class BusinessBookingsComponent implements OnInit {
  private businessOwnerService = inject(BusinessOwnerService);

  // State
  bookings = signal<Booking[]>([]);
  selectedBooking = signal<Booking | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  showDetailsModal = signal<boolean>(false);

  // Filters
  statusFilter = signal<string>('all');
  searchQuery = signal<string>('');
  dateFrom = signal<string>('');
  dateTo = signal<string>('');

  // Pagination
  currentPage = signal<number>(1);
  totalBookings = signal<number>(0);
  pageSize = signal<number>(20);
  hasMore = signal<boolean>(false);

  // Computed
  filteredBookings = computed(() => {
    let filtered = this.bookings();
    const query = this.searchQuery().toLowerCase();

    if (query) {
      filtered = filtered.filter(booking =>
        booking.customer_name?.toLowerCase().includes(query) ||
        booking.customer_email?.toLowerCase().includes(query) ||
        booking.customer_phone?.includes(query)
      );
    }

    return filtered;
  });

  statistics = computed(() => {
    const all = this.bookings();
    const today = new Date().toISOString().split('T')[0];

    return {
      total: all.length,
      pending: all.filter(b => b.status === 'pending').length,
      confirmed: all.filter(b => b.status === 'confirmed').length,
      completed: all.filter(b => b.status === 'completed').length,
      cancelled: all.filter(b => b.status === 'cancelled').length,
      today: all.filter(b => b.booking_date === today).length
    };
  });

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const params: any = {
      page: this.currentPage(),
      limit: this.pageSize()
    };

    if (this.statusFilter() !== 'all') {
      params.status = this.statusFilter();
    }

    if (this.dateFrom()) {
      params.date_from = this.dateFrom();
    }

    if (this.dateTo()) {
      params.date_to = this.dateTo();
    }

    this.businessOwnerService.getBookings(params).subscribe({
      next: (response) => {
        this.bookings.set(response.bookings);
        this.totalBookings.set(response.total);
        this.hasMore.set(response.pagination.hasMore);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading bookings:', error);
        this.errorMessage.set('Failed to load bookings. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  onStatusFilterChange(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
    this.loadBookings();
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  onDateFilterChange(): void {
    this.currentPage.set(1);
    this.loadBookings();
  }

  clearFilters(): void {
    this.statusFilter.set('all');
    this.searchQuery.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.currentPage.set(1);
    this.loadBookings();
  }

  viewBookingDetails(booking: Booking): void {
    this.selectedBooking.set(booking);
    this.showDetailsModal.set(true);
  }

  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.selectedBooking.set(null);
  }

  updateBookingStatus(bookingId: string, newStatus: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.businessOwnerService.updateBookingStatus(bookingId, newStatus).subscribe({
      next: (response) => {
        this.successMessage.set(response.message);
        this.loadBookings();
        this.closeDetailsModal();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (error) => {
        console.error('Error updating booking status:', error);
        this.errorMessage.set('Failed to update booking status. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  nextPage(): void {
    if (this.hasMore()) {
      this.currentPage.update(page => page + 1);
      this.loadBookings();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.loadBookings();
    }
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'pending': 'status-pending',
      'confirmed': 'status-confirmed',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return classes[status] || 'status-pending';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'pending': '⏳',
      'confirmed': '✅',
      'completed': '🎉',
      'cancelled': '❌'
    };
    return icons[status] || '⏳';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatTime(timeString: string): string {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }
}
