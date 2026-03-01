import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  BookingRequest,
  PublicSpecialistService,
  SpecialistDetail,
  SpecialistService
} from '../../../core/services/public-specialist.service';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { InsightsService } from '../../../core/services/insights.service';
import { environment } from '../../../../environments/environment';

interface CalendarDay {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isAvailable: boolean;
  isPast: boolean;
  isSelected: boolean;
}

@Component({
  selector: 'app-specialist-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './specialist-detail.component.html',
  styleUrls: ['./specialist-detail.component.scss']
})
export class SpecialistDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private publicSpecialistService = inject(PublicSpecialistService);
  private authService = inject(AuthService);
  private insightsService = inject(InsightsService);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

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

  // Availability calendar
  showAvailabilityCalendar = signal(false);
  loadingAvailability = signal(false);
  currentCalendarMonth = signal(new Date());
  unavailableDates = signal<string[]>([]);
  weeklyAvailability = signal<{ [key: string]: boolean }>({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false
  });

  calendarMonthYear = computed(() => {
    const date = this.currentCalendarMonth();
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  calendarDays = computed(() => {
    return this.generateCalendarDays();
  });

  // Review modal state
  showReviewModal = signal(false);
  isSubmittingReview = signal(false);
  reviewSuccess = signal(false);
  reviewError = signal<string | null>(null);

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

  // Review form
  reviewForm: FormGroup = this.fb.group({
    overallRating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    foodQualityRating: [0],
    professionalismRating: [0],
    communicationRating: [0],
    valueRating: [0],
    title: [''],
    comment: ['', [Validators.required, Validators.minLength(20)]],
    eventType: [''],
    eventDate: [''],
    guestCount: [null]
  });

  // Star rating helper for template
  ratingStars = [1, 2, 3, 4, 5];
  today = new Date().toISOString().split('T')[0];

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
    this.showAvailabilityCalendar.set(false);
  }

  updateBookingField(field: keyof BookingRequest, value: any): void {
    this.bookingForm.update(form => ({ ...form, [field]: value }));
  }

  // ============ AVAILABILITY CALENDAR METHODS ============

  toggleAvailabilityCalendar(): void {
    const isShowing = this.showAvailabilityCalendar();
    this.showAvailabilityCalendar.set(!isShowing);
    if (!isShowing) {
      this.loadAvailability();
    }
  }

  loadAvailability(): void {
    const specialist = this.specialist();
    if (!specialist) return;

    this.loadingAvailability.set(true);
    const month = this.currentCalendarMonth();

    this.http.get<any>(`${environment.apiUrl}/public/specialists/${specialist.id}/availability`, {
      params: {
        month: (month.getMonth() + 1).toString(),
        year: month.getFullYear().toString()
      }
    }).subscribe({
      next: (data) => {
        this.unavailableDates.set(data.unavailableDates || []);
        if (data.weeklyAvailability) {
          this.weeklyAvailability.set(data.weeklyAvailability);
        }
        this.loadingAvailability.set(false);
      },
      error: () => {
        this.loadingAvailability.set(false);
      }
    });
  }

  previousMonth(): void {
    const current = this.currentCalendarMonth();
    const newDate = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    this.currentCalendarMonth.set(newDate);
    this.loadAvailability();
  }

  nextMonth(): void {
    const current = this.currentCalendarMonth();
    const newDate = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    this.currentCalendarMonth.set(newDate);
    this.loadAvailability();
  }

  selectDate(day: CalendarDay): void {
    if (!day.isAvailable || day.isPast || !day.isCurrentMonth) return;

    this.updateBookingField('bookingDate', day.date);
    this.showAvailabilityCalendar.set(false);
  }

  private generateCalendarDays(): CalendarDay[] {
    const currentMonth = this.currentCalendarMonth();
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDate = this.bookingForm().bookingDate;
    const unavailable = this.unavailableDates();
    const weekly = this.weeklyAvailability();

    const days: CalendarDay[] = [];

    // Days from previous month
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const date = new Date(year, month - 1, day);
      days.push({
        date: date.toISOString().split('T')[0],
        day,
        isCurrentMonth: false,
        isAvailable: false,
        isPast: true,
        isSelected: false
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const isWeeklyAvailable = weekly[dayNames[dayOfWeek]] ?? true;
      const isUnavailable = unavailable.includes(dateStr);
      const isPast = date < today;

      days.push({
        date: dateStr,
        day,
        isCurrentMonth: true,
        isAvailable: isWeeklyAvailable && !isUnavailable && !isPast,
        isPast,
        isSelected: dateStr === selectedDate
      });
    }

    // Days from next month to fill the grid
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date: date.toISOString().split('T')[0],
        day,
        isCurrentMonth: false,
        isAvailable: false,
        isPast: false,
        isSelected: false
      });
    }

    return days;
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

  // Open review modal
  openWriteReview(): void {
    const user = this.authService.currentUser();
    if (!user) {
      alert('Please log in to write a review');
      return;
    }

    this.reviewForm.reset({
      overallRating: 0,
      foodQualityRating: 0,
      professionalismRating: 0,
      communicationRating: 0,
      valueRating: 0,
      title: '',
      comment: '',
      eventType: '',
      eventDate: '',
      guestCount: null
    });
    this.reviewSuccess.set(false);
    this.reviewError.set(null);
    this.showReviewModal.set(true);
  }

  // Close review modal
  closeReviewModal(): void {
    this.showReviewModal.set(false);
    this.reviewSuccess.set(false);
    this.reviewError.set(null);
  }

  // Set rating for a specific field
  setRating(field: string, rating: number): void {
    this.reviewForm.get(field)?.setValue(rating);
  }

  // Get current rating value for display
  getRatingValue(field: string): number {
    return this.reviewForm.get(field)?.value || 0;
  }

  // Submit review
  submitReview(): void {
    if (this.reviewForm.invalid) {
      if (this.reviewForm.get('overallRating')?.value < 1) {
        this.reviewError.set('Please select an overall rating');
        return;
      }
      if (this.reviewForm.get('comment')?.invalid) {
        this.reviewError.set('Please write a review with at least 20 characters');
        return;
      }
      return;
    }

    const user = this.authService.currentUser();
    const specialist = this.specialist();
    if (!user || !specialist) {
      this.reviewError.set('Please log in to submit a review');
      return;
    }

    this.isSubmittingReview.set(true);
    this.reviewError.set(null);

    const reviewData = {
      userId: user.id,
      specialistId: specialist.id,
      rating: this.reviewForm.get('overallRating')?.value,
      foodQualityRating: this.reviewForm.get('foodQualityRating')?.value || null,
      professionalismRating: this.reviewForm.get('professionalismRating')?.value || null,
      communicationRating: this.reviewForm.get('communicationRating')?.value || null,
      valueRating: this.reviewForm.get('valueRating')?.value || null,
      title: this.reviewForm.get('title')?.value || '',
      comment: this.reviewForm.get('comment')?.value,
      eventType: this.reviewForm.get('eventType')?.value || null,
      eventDate: this.reviewForm.get('eventDate')?.value || null,
      guestCount: this.reviewForm.get('guestCount')?.value || null
    };

    this.http.post(`${environment.apiUrl}/specialist-reviews`, reviewData).subscribe({
      next: () => {
        this.isSubmittingReview.set(false);
        this.reviewSuccess.set(true);
        // Reload specialist to show the new review
        this.loadSpecialist(specialist.id);
      },
      error: (error) => {
        this.isSubmittingReview.set(false);
        this.reviewError.set(error.error?.error || 'Failed to submit review. Please try again.');
      }
    });
  }
}
