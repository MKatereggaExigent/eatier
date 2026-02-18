import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BookingsService, Booking, Restaurant, BookingRequest, BookingStats, AvailableTimeSlot } from '../../../services/bookings.service';
import { AuthService } from '../../../core/services/auth.service';

interface FilterOptions {
  status: string;
  dateRange: string;
  restaurant: string;
  sortBy: string;
}

interface ViewMode {
  type: 'list' | 'calendar';
  label: string;
  icon: string;
}

@Component({
  selector: 'app-food-enthusiast-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './food-enthusiast-bookings.component.html',
  styleUrls: ['./food-enthusiast-bookings.component.scss']
})
export class FoodEnthusiastBookingsComponent implements OnInit {
  private bookingsService = inject(BookingsService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  currentUser = this.authService.currentUser;

  // State management
  isLoading = signal(false);
  bookings = signal<Booking[]>([]);
  restaurants = signal<Restaurant[]>([]);
  stats = signal<BookingStats | null>(null);
  selectedBooking = signal<Booking | null>(null);
  availableTimeSlots = signal<AvailableTimeSlot[]>([]);

  // UI state
  viewMode = signal<ViewMode>({ type: 'list', label: 'List View', icon: '📋' });
  searchQuery = signal('');
  showFilters = signal(false);
  showNewBookingModal = signal(false);
  showBookingDetailsModal = signal(false);
  showCancelConfirmModal = signal(false);

  // Filter and sort options
  filters = signal<FilterOptions>({
    status: 'all',
    dateRange: 'all',
    restaurant: 'all',
    sortBy: 'date_desc'
  });

  // Form for new booking
  newBookingForm: FormGroup;
  selectedRestaurant = signal<Restaurant | null>(null);
  selectedDate = signal<string>('');

  // Available options
  statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' }
  ];

  sortOptions = [
    { value: 'date_desc', label: 'Newest First' },
    { value: 'date_asc', label: 'Oldest First' },
    { value: 'restaurant', label: 'Restaurant Name' },
    { value: 'status', label: 'Status' }
  ];

  partySizeOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  constructor() {
    this.newBookingForm = this.fb.group({
      restaurantId: ['', Validators.required],
      bookingDate: ['', Validators.required],
      bookingTime: ['', Validators.required],
      partySize: [2, [Validators.required, Validators.min(1), Validators.max(12)]],
      contactName: ['', Validators.required],
      contactPhone: ['', Validators.required],
      contactEmail: ['', [Validators.required, Validators.email]],
      specialRequests: [''],
      tablePreferences: [''],
      occasion: ['']
    });
  }

  // Computed properties
  filteredBookings = computed(() => {
    let filtered = this.bookings();
    const query = this.searchQuery().toLowerCase().trim();
    const currentFilters = this.filters();

    // Search filter - with null-safe checks
    if (query) {
      filtered = filtered.filter(booking => {
        const restaurantName = booking.restaurant?.name?.toLowerCase() || '';
        const bookingRef = booking.bookingReference?.toLowerCase() || '';
        const contactName = booking.contactName?.toLowerCase() || '';

        return restaurantName.includes(query) ||
               bookingRef.includes(query) ||
               contactName.includes(query);
      });
    }

    // Status filter
    if (currentFilters.status !== 'all') {
      filtered = filtered.filter(booking => booking.status === currentFilters.status);
    }

    // Date range filter
    if (currentFilters.dateRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.bookingDate);
        switch (currentFilters.dateRange) {
          case 'upcoming':
            return bookingDate >= now;
          case 'past':
            return bookingDate < now;
          case 'this_month':
            return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear();
          case 'last_month':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return bookingDate.getMonth() === lastMonth.getMonth() && bookingDate.getFullYear() === lastMonth.getFullYear();
          default:
            return true;
        }
      });
    }

    // Restaurant filter
    if (currentFilters.restaurant !== 'all') {
      filtered = filtered.filter(booking => booking.restaurantId === currentFilters.restaurant);
    }

    // Sort - with null-safe checks
    filtered.sort((a, b) => {
      switch (currentFilters.sortBy) {
        case 'date_asc':
          return new Date(a.bookingDate || 0).getTime() - new Date(b.bookingDate || 0).getTime();
        case 'date_desc':
          return new Date(b.bookingDate || 0).getTime() - new Date(a.bookingDate || 0).getTime();
        case 'restaurant':
          const nameA = a.restaurant?.name || '';
          const nameB = b.restaurant?.name || '';
          return nameA.localeCompare(nameB);
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        default:
          return 0;
      }
    });

    return filtered;
  });

  upcomingBookings = computed(() => {
    const now = new Date();
    return this.bookings().filter(booking =>
      booking.status !== 'cancelled' && new Date(booking.bookingDate) >= now
    );
  });

  hasActiveFilters = computed(() => {
    const currentFilters = this.filters();
    return currentFilters.status !== 'all' ||
           currentFilters.dateRange !== 'all' ||
           currentFilters.restaurant !== 'all' ||
           this.searchQuery().length > 0;
  });

  ngOnInit() {
    this.loadBookings();
    this.loadRestaurants();
    this.loadStats();
  }

  // Data loading methods
  loadBookings(): void {
    this.isLoading.set(true);
    this.bookingsService.getBookings().subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading bookings:', error);
        this.isLoading.set(false);
      }
    });
  }

  loadRestaurants(): void {
    this.bookingsService.getRestaurants().subscribe({
      next: (restaurants) => {
        this.restaurants.set(restaurants);
      },
      error: (error) => {
        console.error('Error loading restaurants:', error);
      }
    });
  }

  loadStats(): void {
    this.bookingsService.getBookingStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
      },
      error: (error) => {
        console.error('Error loading stats:', error);
      }
    });
  }

  // UI interaction methods
  toggleViewMode(): void {
    const current = this.viewMode();
    this.viewMode.set(
      current.type === 'list'
        ? { type: 'calendar', label: 'Calendar View', icon: '📅' }
        : { type: 'list', label: 'List View', icon: '📋' }
    );
  }

  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  clearFilters(): void {
    this.filters.set({
      status: 'all',
      dateRange: 'all',
      restaurant: 'all',
      sortBy: 'date_desc'
    });
    this.searchQuery.set('');
  }

  updateFilter(key: keyof FilterOptions, value: string): void {
    this.filters.update(current => ({ ...current, [key]: value }));
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  onFilterChange(key: keyof FilterOptions, event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.updateFilter(key, target.value);
  }

  // Booking actions
  openNewBookingModal(): void {
    this.showNewBookingModal.set(true);
    this.resetNewBookingForm();
  }

  closeNewBookingModal(): void {
    this.showNewBookingModal.set(false);
    this.selectedRestaurant.set(null);
    this.selectedDate.set('');
    this.availableTimeSlots.set([]);
  }

  openBookingDetails(booking: Booking): void {
    this.selectedBooking.set(booking);
    this.showBookingDetailsModal.set(true);
  }

  closeBookingDetails(): void {
    this.selectedBooking.set(null);
    this.showBookingDetailsModal.set(false);
  }

  openCancelConfirm(booking: Booking): void {
    this.selectedBooking.set(booking);
    this.showCancelConfirmModal.set(true);
  }

  closeCancelConfirm(): void {
    this.selectedBooking.set(null);
    this.showCancelConfirmModal.set(false);
  }

  // Form methods
  resetNewBookingForm(): void {
    this.newBookingForm.reset({
      partySize: 2
    });

    // Pre-fill user information if available
    const user = this.currentUser();
    if (user) {
      this.newBookingForm.patchValue({
        contactName: `${user.firstName} ${user.lastName}`,
        contactEmail: user.email,
        contactPhone: user.phone || ''
      });
    }
  }

  onRestaurantChange(): void {
    const restaurantId = this.newBookingForm.get('restaurantId')?.value;
    if (restaurantId) {
      const restaurant = this.restaurants().find(r => r.id === restaurantId);
      this.selectedRestaurant.set(restaurant || null);
    }
  }

  onDateChange(): void {
    const date = this.newBookingForm.get('bookingDate')?.value;
    const restaurantId = this.newBookingForm.get('restaurantId')?.value;

    if (date && restaurantId) {
      this.selectedDate.set(date);
      this.loadAvailableTimeSlots(restaurantId, date);
    }
  }

  loadAvailableTimeSlots(restaurantId: string, date: string): void {
    this.bookingsService.getAvailableTimeSlots(restaurantId, date).subscribe({
      next: (slots) => {
        this.availableTimeSlots.set(slots);
      },
      error: (error) => {
        console.error('Error loading time slots:', error);
        this.availableTimeSlots.set([]);
      }
    });
  }

  createBooking(): void {
    if (this.newBookingForm.valid) {
      const formValue = this.newBookingForm.value;
      const bookingRequest: BookingRequest = {
        restaurantId: formValue.restaurantId,
        bookingDate: formValue.bookingDate,
        bookingTime: formValue.bookingTime,
        partySize: formValue.partySize,
        contactName: formValue.contactName,
        contactPhone: formValue.contactPhone,
        contactEmail: formValue.contactEmail,
        specialRequests: formValue.specialRequests,
        tablePreferences: formValue.tablePreferences,
        occasion: formValue.occasion
      };

      this.isLoading.set(true);
      this.bookingsService.createBooking(bookingRequest).subscribe({
        next: (booking) => {
          console.log('Booking created successfully:', booking);
          this.loadBookings();
          this.loadStats();
          this.closeNewBookingModal();
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error creating booking:', error);
          this.isLoading.set(false);
        }
      });
    }
  }

  cancelBooking(reason?: string): void {
    const booking = this.selectedBooking();
    if (booking) {
      this.isLoading.set(true);
      this.bookingsService.cancelBooking(booking.id, reason).subscribe({
        next: (success) => {
          if (success) {
            console.log('Booking cancelled successfully');
            this.loadBookings();
            this.loadStats();
          }
          this.closeCancelConfirm();
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error cancelling booking:', error);
          this.isLoading.set(false);
        }
      });
    }
  }

  // Utility methods
  getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      case 'completed': return 'info';
      default: return 'neutral';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'confirmed': return '✅';
      case 'pending': return '⏳';
      case 'cancelled': return '❌';
      case 'completed': return '🎉';
      default: return '📋';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
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

  isUpcoming(booking: Booking): boolean {
    return new Date(booking.bookingDate) >= new Date();
  }

  canCancel(booking: Booking): boolean {
    return booking.status === 'pending' || booking.status === 'confirmed';
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}
