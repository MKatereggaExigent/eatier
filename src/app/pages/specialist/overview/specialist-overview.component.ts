import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { LucideAngularModule, ChefHat, UtensilsCrossed, Calendar, Camera, AlertTriangle, DollarSign, Star, Users, TrendingUp, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-angular';
import { SpecialistBooking, SpecialistEarning, SpecialistReview, SpecialistService } from '../../../core/services/specialist.service';

import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Specialist } from '../../../shared/models/user.model';

interface BookingRequest {
  id: string;
  clientName: string;
  clientAvatar?: string;
  eventType: string;
  eventDate: Date;
  location: string;
  guests: number;
  budget: number;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  message: string;
  requestDate: Date;
}

interface Earning {
  id: string;
  clientName: string;
  eventType: string;
  amount: number;
  date: Date;
  status: 'pending' | 'paid' | 'processing';
}

interface Review {
  id: string;
  clientName: string;
  clientAvatar?: string;
  rating: number;
  comment: string;
  eventType: string;
  date: Date;
}

@Component({
  selector: 'app-specialist-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './specialist-overview.component.html',
  styleUrls: ['./specialist-overview.component.scss']
})
export class SpecialistOverviewComponent implements OnInit {
  // Lucide Icons
  readonly ChefHat = ChefHat;
  readonly UtensilsCrossed = UtensilsCrossed;
  readonly Calendar = Calendar;
  readonly Camera = Camera;
  readonly AlertTriangle = AlertTriangle;
  readonly DollarSign = DollarSign;
  readonly Star = Star;
  readonly Users = Users;
  readonly TrendingUp = TrendingUp;
  readonly Clock = Clock;
  readonly CheckCircle = CheckCircle;
  readonly XCircle = XCircle;
  readonly MessageSquare = MessageSquare;
  private authService = inject(AuthService);
  private specialistService = inject(SpecialistService);

  currentUser = this.authService.currentUser;
  specialist = computed(() => this.currentUser() as Specialist);

  // Loading states
  loading = signal(true);
  loadingBookings = signal(true);
  loadingReviews = signal(true);
  loadingEarnings = signal(true);

  // Error states
  error = signal<string | null>(null);

  // Business metrics - initialized with zeros, will be populated from API
  businessMetrics = signal({
    totalBookings: 0,
    completedBookings: 0,
    totalEarnings: 0,
    monthlyEarnings: 0,
    averageRating: 0,
    totalReviews: 0,
    responseRate: 0,
    repeatClientRate: 0,
    upcomingBookings: 0,
    pendingRequests: 0
  });

  // Recent booking requests from database
  recentRequests = signal<BookingRequest[]>([]);

  // Upcoming bookings from database
  upcomingBookings = signal<any[]>([]);

  // Recent earnings from database
  recentEarnings = signal<Earning[]>([]);

  // Recent reviews from database
  recentReviews = signal<Review[]>([]);

  // Services count for onboarding prompt
  servicesCount = signal(0);
  loadingServices = signal(true);

  // Computed: show onboarding prompt when no services
  showServicesOnboarding = computed(() =>
    !this.loadingServices() && this.servicesCount() === 0
  );

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    // Load overview statistics
    this.specialistService.getOverview().subscribe({
      next: (data) => {
        this.businessMetrics.set({
          totalBookings: data.totalBookings,
          completedBookings: data.completedBookings,
          totalEarnings: data.totalEarnings,
          monthlyEarnings: data.monthlyEarnings,
          averageRating: data.averageRating,
          totalReviews: data.totalReviews,
          responseRate: data.responseRate,
          repeatClientRate: data.repeatClientRate,
          upcomingBookings: data.upcomingBookings,
          pendingRequests: data.pendingRequests
        });
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading overview:', err);
        this.error.set('Failed to load overview data');
        this.loading.set(false);
      }
    });

    // Load pending booking requests
    this.loadingBookings.set(true);
    this.specialistService.getBookings('pending', 10).subscribe({
      next: (data) => {
        // Transform pending bookings to match existing format
        const bookings = data.bookings.map(b => ({
          id: b.id,
          clientName: b.client_name,
          eventType: b.event_type || 'Private Event',
          eventDate: new Date(b.booking_date),
          location: b.event_city || 'Unknown',
          guests: b.guest_count,
          budget: b.total_price,
          status: this.mapBookingStatus(b.status),
          message: b.special_requests || '',
          requestDate: new Date(b.created_at)
        }));
        this.recentRequests.set(bookings as BookingRequest[]);
        this.loadingBookings.set(false);
      },
      error: (err) => {
        console.error('Error loading pending bookings:', err);
        this.loadingBookings.set(false);
      }
    });

    // Load confirmed upcoming bookings separately
    this.specialistService.getBookings('confirmed', 10).subscribe({
      next: (data) => {
        // Filter for future bookings only
        const upcoming = data.bookings
          .filter(b => new Date(b.booking_date) >= new Date())
          .map(b => ({
            id: b.id,
            clientName: b.client_name,
            eventType: b.event_type || 'Private Event',
            eventDate: new Date(b.booking_date),
            location: b.event_city || 'Unknown',
            guests: b.guest_count,
            amount: b.total_price,
            status: 'confirmed'
          }));
        this.upcomingBookings.set(upcoming);
      },
      error: (err) => {
        console.error('Error loading upcoming bookings:', err);
      }
    });

    // Load reviews
    this.loadingReviews.set(true);
    this.specialistService.getReviews(5).subscribe({
      next: (data) => {
        const reviews = data.reviews.map(r => ({
          id: r.id,
          clientName: r.client_name,
          rating: r.rating,
          comment: r.comment || '',
          eventType: r.event_type || 'Private Event',
          date: new Date(r.created_at)
        }));
        this.recentReviews.set(reviews as Review[]);
        this.loadingReviews.set(false);
      },
      error: (err) => {
        console.error('Error loading reviews:', err);
        this.loadingReviews.set(false);
      }
    });

    // Load earnings
    this.loadingEarnings.set(true);
    this.specialistService.getEarnings(5).subscribe({
      next: (data) => {
        const earnings = data.earnings.map(e => ({
          id: e.id,
          clientName: e.client_name || 'Client',
          eventType: e.event_type || 'Service',
          amount: e.amount,
          date: new Date(e.created_at),
          status: e.status as 'pending' | 'paid' | 'processing'
        }));
        this.recentEarnings.set(earnings);
        this.loadingEarnings.set(false);
      },
      error: (err) => {
        console.error('Error loading earnings:', err);
        this.loadingEarnings.set(false);
      }
    });

    // Load services count for onboarding prompt
    this.loadingServices.set(true);
    this.specialistService.getServices().subscribe({
      next: (data) => {
        this.servicesCount.set(data.services.length);
        this.loadingServices.set(false);
      },
      error: (err) => {
        console.error('Error loading services:', err);
        this.loadingServices.set(false);
      }
    });
  }

  private mapBookingStatus(status: string): 'pending' | 'accepted' | 'declined' | 'completed' {
    const statusMap: Record<string, 'pending' | 'accepted' | 'declined' | 'completed'> = {
      'pending': 'pending',
      'confirmed': 'accepted',
      'completed': 'completed',
      'cancelled': 'declined',
      'declined': 'declined'
    };
    return statusMap[status] || 'pending';
  }

  // Computed properties
  pendingRequests = computed(() =>
    this.recentRequests().filter(req => req.status === 'pending')
  );

  thisMonthEarnings = computed(() => {
    const thisMonth = new Date().getMonth();
    return this.recentEarnings()
      .filter(earning => earning.date.getMonth() === thisMonth)
      .reduce((total, earning) => total + earning.amount, 0);
  });

  // Utility methods
  getStatusClass(status: string): string {
    const classes = {
      pending: 'status-pending',
      accepted: 'status-accepted',
      declined: 'status-declined',
      completed: 'status-completed',
      confirmed: 'status-confirmed',
      paid: 'status-paid',
      processing: 'status-processing'
    };
    return classes[status as keyof typeof classes] || 'status-default';
  }

  getStatusText(status: string): string {
    const texts = {
      pending: 'Pending',
      accepted: 'Accepted',
      declined: 'Declined',
      completed: 'Completed',
      confirmed: 'Confirmed',
      paid: 'Paid',
      processing: 'Processing'
    };
    return texts[status as keyof typeof texts] || status;
  }

  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < Math.floor(rating));
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDateRelative(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return this.formatDate(date);
  }

  // Action methods
  acceptRequest(requestId: string): void {
    // Call API to confirm the booking
    this.specialistService.updateBookingStatus(requestId, 'confirmed').subscribe({
      next: (response) => {
        // Update local state after successful API call
        const requests = this.recentRequests();
        const updatedRequests = requests.filter(req => req.id !== requestId);
        this.recentRequests.set(updatedRequests);

        // Reload data to reflect changes
        this.loadData();
      },
      error: (error) => {
        console.error('Error accepting request:', error);
        alert('Failed to accept request. Please try again.');
      }
    });
  }

  declineRequest(requestId: string): void {
    // Call API to decline the booking
    this.specialistService.updateBookingStatus(requestId, 'declined').subscribe({
      next: (response) => {
        // Update local state after successful API call
        const requests = this.recentRequests();
        const updatedRequests = requests.filter(req => req.id !== requestId);
        this.recentRequests.set(updatedRequests);

        // Reload data to reflect changes
        this.loadData();
      },
      error: (error) => {
        console.error('Error declining request:', error);
        alert('Failed to decline request. Please try again.');
      }
    });
  }

  viewBookingDetails(bookingId: string): void {
    console.log('View booking details:', bookingId);
    // TODO: Navigate to booking details page
  }

  viewAllRequests(): void {
    console.log('Navigate to all requests');
    // TODO: Navigate to requests page
  }

  viewAllBookings(): void {
    console.log('Navigate to all bookings');
    // TODO: Navigate to bookings page
  }

  viewAllEarnings(): void {
    console.log('Navigate to earnings page');
    // TODO: Navigate to earnings page
  }

  viewAllReviews(): void {
    console.log('Navigate to reviews page');
    // TODO: Navigate to reviews page
  }
}
