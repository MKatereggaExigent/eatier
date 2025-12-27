import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { UserSpecialistBookingsService, SpecialistBooking, ReviewableBooking } from '../../../core/services/user-specialist-bookings.service';

@Component({
  selector: 'app-user-specialist-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './user-specialist-bookings.component.html',
  styleUrls: ['./user-specialist-bookings.component.scss']
})
export class UserSpecialistBookingsComponent implements OnInit, OnDestroy {
  private bookingsService = inject(UserSpecialistBookingsService);
  private destroy$ = new Subject<void>();

  // State
  bookings = signal<SpecialistBooking[]>([]);
  reviewableBookings = signal<ReviewableBooking[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  activeTab = signal<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');

  // Cancel modal state
  showCancelModal = signal(false);
  selectedBooking = signal<SpecialistBooking | null>(null);
  cancellationReason = signal('');
  cancelling = signal(false);

  // Testimonial modal state
  showTestimonialModal = signal(false);
  selectedReviewBooking = signal<SpecialistBooking | ReviewableBooking | null>(null);
  testimonialRating = signal(5);
  testimonialReview = signal('');
  submittingTestimonial = signal(false);

  // Computed bookings
  upcomingBookings = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.bookings().filter(b =>
      b.bookingDate >= today &&
      (b.status === 'pending' || b.status === 'confirmed')
    ).sort((a, b) => a.bookingDate.localeCompare(b.bookingDate));
  });

  completedBookings = computed(() => {
    return this.bookings().filter(b => b.status === 'completed')
      .sort((a, b) => b.bookingDate.localeCompare(a.bookingDate));
  });

  cancelledBookings = computed(() => {
    return this.bookings().filter(b => b.status === 'cancelled')
      .sort((a, b) => b.bookingDate.localeCompare(a.bookingDate));
  });

  currentBookings = computed(() => {
    switch (this.activeTab()) {
      case 'upcoming': return this.upcomingBookings();
      case 'completed': return this.completedBookings();
      case 'cancelled': return this.cancelledBookings();
      default: return this.bookings();
    }
  });

  pendingReviewCount = computed(() => {
    return this.bookings().filter(b => b.status === 'completed' && !b.hasTestimonial).length;
  });

  ngOnInit(): void {
    this.loadBookings();
    this.loadReviewableBookings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBookings(): void {
    this.loading.set(true);
    this.error.set(null);

    this.bookingsService.getBookings({ limit: 50 })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (response) => {
          this.bookings.set(response.bookings);
        },
        error: (err) => {
          console.error('Error loading bookings:', err);
          this.error.set('Failed to load bookings');
        }
      });
  }

  loadReviewableBookings(): void {
    this.bookingsService.getReviewableBookings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.reviewableBookings.set(response.bookings);
        },
        error: (err) => console.error('Error loading reviewable bookings:', err)
      });
  }

  setActiveTab(tab: 'all' | 'upcoming' | 'completed' | 'cancelled'): void {
    this.activeTab.set(tab);
  }

  // Cancel modal methods
  openCancelModal(booking: SpecialistBooking): void {
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

    this.bookingsService.cancelBooking(booking.id, this.cancellationReason())
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cancelling.set(false))
      )
      .subscribe({
        next: () => {
          this.loadBookings();
          this.closeCancelModal();
        },
        error: (err) => {
          console.error('Error cancelling booking:', err);
          this.error.set(err.error?.message || 'Failed to cancel booking');
        }
      });
  }

  // Testimonial modal methods
  openTestimonialModal(booking: SpecialistBooking | ReviewableBooking): void {
    this.selectedReviewBooking.set(booking);
    this.testimonialRating.set(5);
    this.testimonialReview.set('');
    this.showTestimonialModal.set(true);
  }

  closeTestimonialModal(): void {
    this.showTestimonialModal.set(false);
    this.selectedReviewBooking.set(null);
    this.testimonialRating.set(5);
    this.testimonialReview.set('');
  }

  submitTestimonial(): void {
    const booking = this.selectedReviewBooking();
    if (!booking || !this.testimonialReview().trim()) return;

    this.submittingTestimonial.set(true);

    this.bookingsService.submitTestimonial(booking.id, {
      rating: this.testimonialRating(),
      review: this.testimonialReview().trim(),
      eventType: booking.eventType
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.submittingTestimonial.set(false))
      )
      .subscribe({
        next: () => {
          this.loadBookings();
          this.loadReviewableBookings();
          this.closeTestimonialModal();
        },
        error: (err) => {
          console.error('Error submitting testimonial:', err);
          this.error.set(err.error?.message || 'Failed to submit testimonial');
        }
      });
  }

  setRating(rating: number): void {
    this.testimonialRating.set(rating);
  }

  // Utility methods
  canCancel(booking: SpecialistBooking): boolean {
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return false;
    }
    const bookingDate = new Date(booking.bookingDate);
    const now = new Date();
    const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilBooking > 24;
  }

  canReview(booking: SpecialistBooking): boolean {
    return booking.status === 'completed' && !booking.hasTestimonial;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'status-pending',
      confirmed: 'status-confirmed',
      completed: 'status-completed',
      cancelled: 'status-cancelled'
    };
    return classes[status] || '';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < rating);
  }
}

