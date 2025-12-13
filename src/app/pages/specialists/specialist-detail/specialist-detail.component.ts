import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  BookingRequest,
  PublicSpecialistService,
  SpecialistDetail,
  SpecialistService
} from '../../../core/services/public-specialist.service';
import { Component, OnInit, inject, signal } from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InsightsService } from '../../../core/services/insights.service';

@Component({
  selector: 'app-specialist-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './specialist-detail.component.html',
  styleUrls: ['./specialist-detail.component.scss']
})
export class SpecialistDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private publicSpecialistService = inject(PublicSpecialistService);
  private authService = inject(AuthService);
  private insightsService = inject(InsightsService);

  specialist = signal<SpecialistDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Analytics tracking
  private sessionId = this.generateSessionId();
  private sessionStartTime = Date.now();
  private pagesVisited = 1;

  // Booking form
  showBookingForm = signal(false);
  bookingLoading = signal(false);
  bookingSuccess = signal(false);
  bookingError = signal<string | null>(null);

  selectedService = signal<SpecialistService | null>(null);
  bookingForm = signal<BookingRequest>({
    bookingDate: '',
    guestCount: 4,
    eventType: 'Private Dinner',
    eventCity: '',
    eventAddress: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    specialRequests: ''
  });

  eventTypes = [
    'Private Dinner',
    'Birthday Party',
    'Corporate Event',
    'Wedding Reception',
    'Cooking Class',
    'Family Gathering',
    'Anniversary Dinner',
    'Other'
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadSpecialist(id);
    }
  }

  loadSpecialist(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.publicSpecialistService.getSpecialistById(id).subscribe({
      next: (specialist) => {
        this.specialist.set(specialist);
        this.loading.set(false);
        // Track page view for the specialist (using specialist ID as business ID for analytics)
        this.trackPageView(specialist.id, 'specialist_profile');
      },
      error: (err) => {
        console.error('Error loading specialist:', err);
        this.error.set('Failed to load specialist details');
        this.loading.set(false);
      }
    });
  }

  selectService(service: SpecialistService): void {
    this.selectedService.set(service);
    this.openBookingForm();
  }

  openBookingForm(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    const user = this.authService.currentUser();
    if (user) {
      this.bookingForm.update(form => ({
        ...form,
        contactName: `${user.firstName} ${user.lastName}`,
        contactEmail: user.email
      }));
    }
    this.showBookingForm.set(true);
  }

  closeBookingForm(): void {
    this.showBookingForm.set(false);
    this.bookingSuccess.set(false);
    this.bookingError.set(null);
  }

  updateBookingField(field: keyof BookingRequest, value: any): void {
    this.bookingForm.update(form => ({ ...form, [field]: value }));
  }

  submitBooking(): void {
    const specialist = this.specialist();
    if (!specialist) return;

    this.bookingLoading.set(true);
    this.bookingError.set(null);

    const booking: BookingRequest = {
      ...this.bookingForm(),
      serviceId: this.selectedService()?.id
    };

    this.publicSpecialistService.bookSpecialist(specialist.id, booking).subscribe({
      next: (response) => {
        this.bookingSuccess.set(true);
        this.bookingLoading.set(false);
      },
      error: (err) => {
        console.error('Booking error:', err);
        this.bookingError.set(err.error?.error || 'Failed to submit booking');
        this.bookingLoading.set(false);
      }
    });
  }

  getStarRating(rating: number): string {
    return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '');
  }

  getDefaultAvatar(name: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4ecdc4&color=fff&size=200`;
  }

  calculatePrice(): number {
    const service = this.selectedService();
    const guests = this.bookingForm().guestCount;
    if (!service) return 0;
    return service.basePrice + (service.pricePerPerson * guests);
  }

  // Analytics tracking methods
  private generateSessionId(): string {
    const stored = sessionStorage.getItem('analytics_session_id');
    if (stored) return stored;
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('analytics_session_id', newId);
    return newId;
  }

  private trackPageView(businessId: string, pageType: string): void {
    const deviceInfo = this.insightsService.getDeviceInfo();
    const user = this.authService.currentUser();
    const isReturningVisitor = this.insightsService.isReturningVisitor(businessId);

    this.insightsService.trackPageView({
      businessId,
      userId: user?.id,
      pageType,
      sessionId: this.sessionId,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      referrer: document.referrer || 'direct',
      isReturningVisitor
    }).subscribe();

    this.setupSessionTracking(businessId);
  }

  private setupSessionTracking(businessId: string): void {
    if ((window as any).__specialistSessionTrackingSet) return;
    (window as any).__specialistSessionTrackingSet = true;

    const trackEnd = () => {
      const duration = Math.round((Date.now() - this.sessionStartTime) / 1000);
      const payload = JSON.stringify({
        businessId,
        sessionId: this.sessionId,
        duration,
        pagesVisited: this.pagesVisited
      });

      const url = `${this.insightsService['apiUrl']}/insights/track/session-end`;
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
      }
    };

    window.addEventListener('beforeunload', trackEnd);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        trackEnd();
      }
    });
  }

  private trackContactClick(businessId: string, clickType: string): void {
    const deviceInfo = this.insightsService.getDeviceInfo();
    const user = this.authService.currentUser();

    this.insightsService.trackContactClick({
      businessId,
      userId: user?.id,
      clickType,
      sessionId: this.sessionId,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os
    }).subscribe();
  }

  shareSpecialist(): void {
    const specialist = this.specialist();
    if (!specialist) return;

    const shareData = {
      title: specialist.fullName,
      text: `Check out ${specialist.fullName} - Private Chef`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
    }

    // Track share (using specialist ID as business ID for analytics)
    this.insightsService.trackShare({
      businessId: specialist.id,
      platform: 'native',
      sessionId: this.sessionId,
      deviceType: this.insightsService.getDeviceInfo().deviceType
    }).subscribe();
  }
}

