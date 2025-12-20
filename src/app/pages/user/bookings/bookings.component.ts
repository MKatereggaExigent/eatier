import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

interface Booking {
  id: string;
  business_id: string;
  business_name: string;
  business_phone?: string;
  business_email?: string;
  booking_date: string;
  booking_time: string;
  party_size: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  special_requests?: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  table_preferences?: string;
  occasion?: string;
  booking_tier: string;
  tier_price: number;
  booking_reference: string;
  total_amount: number;
  created_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
}

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './bookings.component.html',
  styleUrls: ['./bookings.component.scss']
})
export class BookingsComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  currentUser = this.authService.currentUser;

  // State
  bookings = signal<Booking[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  activeTab = signal<'upcoming' | 'past' | 'cancelled'>('upcoming');

  // Modal state
  showCancelModal = signal(false);
  selectedBooking = signal<Booking | null>(null);
  cancellationReason = signal('');
  cancelling = signal(false);

  // Computed
  upcomingBookings = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.bookings().filter(b =>
      b.booking_date >= today &&
      (b.status === 'pending' || b.status === 'confirmed')
    ).sort((a, b) => a.booking_date.localeCompare(b.booking_date));
  });

  pastBookings = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.bookings().filter(b =>
      b.booking_date < today || b.status === 'completed'
    ).sort((a, b) => b.booking_date.localeCompare(a.booking_date));
  });

  cancelledBookings = computed(() => {
    return this.bookings().filter(b =>
      b.status === 'cancelled' || b.status === 'no_show'
    ).sort((a, b) => b.booking_date.localeCompare(a.booking_date));
  });

  currentBookings = computed(() => {
    switch (this.activeTab()) {
      case 'upcoming': return this.upcomingBookings();
      case 'past': return this.pastBookings();
      case 'cancelled': return this.cancelledBookings();
      default: return [];
    }
  });

  ngOnInit(): void {
    this.loadBookings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBookings(): void {
    const userId = this.currentUser()?.id || localStorage.getItem('user_id') || 'temp-user';
    this.loading.set(true);
    this.error.set(null);

    this.http.get<any>(`${environment.apiUrl}/bookings/user/${userId}`)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Error loading bookings:', err);
          this.error.set('Failed to load bookings');
          return of({ bookings: [] });
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(response => {
        this.bookings.set(response.bookings || []);
      });
  }

  setActiveTab(tab: 'upcoming' | 'past' | 'cancelled'): void {
    this.activeTab.set(tab);
  }

  openCancelModal(booking: Booking): void {
    this.selectedBooking.set(booking);
    this.cancellationReason.set('');
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    this.showCancelModal.set(false);
    this.selectedBooking.set(null);
    this.cancellationReason.set('');
  }

  confirmCancellation(): void {
    const booking = this.selectedBooking();
    if (!booking) return;

    this.cancelling.set(true);

    this.http.patch<any>(`${environment.apiUrl}/bookings/${booking.id}/status`, {
      status: 'cancelled',
      cancellationReason: this.cancellationReason()
    })
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Error cancelling booking:', err);
          this.error.set('Failed to cancel booking');
          return of(null);
        }),
        finalize(() => this.cancelling.set(false))
      )
      .subscribe(response => {
        if (response) {
          this.loadBookings();
          this.closeCancelModal();
        }
      });
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'status-pending',
      confirmed: 'status-confirmed',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      no_show: 'status-no-show'
    };
    return classes[status] || '';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No Show'
    };
    return labels[status] || status;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatTime(timeStr: string): string {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  getTierLabel(tier: string): string {
    const labels: Record<string, string> = {
      basic: 'Basic',
      standard: 'Standard',
      premium: 'Premium',
      priority: 'Priority'
    };
    return labels[tier] || tier;
  }

  canCancel(booking: Booking): boolean {
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return false;
    }
    const bookingDate = new Date(booking.booking_date);
    const now = new Date();
    const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilBooking > 24;
  }
}
