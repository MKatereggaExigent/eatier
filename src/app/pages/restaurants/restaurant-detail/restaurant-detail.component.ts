import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PublicBusiness, PublicBusinessService } from '../../../core/services/public-business.service';

import { AuthService } from '../../../core/services/auth.service';
import { BookingsService } from '../../../services/bookings.service';
import { CartService } from '../../../core/services/cart.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { InsightsService } from '../../../core/services/insights.service';
import { environment } from '../../../../environments/environment';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  formattedPrice: string;
  description: string;
  image: string;
  rating: number;
  orders: number;
  isAdding?: boolean;
}

@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './restaurant-detail.component.html',
  styleUrls: ['./restaurant-detail.component.scss']
})
export class RestaurantDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private publicBusinessService = inject(PublicBusinessService);
  private bookingsService = inject(BookingsService);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private insightsService = inject(InsightsService);
  private authService = inject(AuthService);
  protected cartService = inject(CartService);

  restaurantId = signal<string>('');
  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  private sessionId = this.generateSessionId();
  private sessionStartTime = Date.now();
  private pagesVisited = 1;

  // Menu items with IDs for cart
  menuItems = signal<MenuItem[]>([]);

  // Cart notification state
  addedToCartNotification = signal<string | null>(null);

  // Booking modal state
  showBookingModal = signal<boolean>(false);
  isSubmittingBooking = signal<boolean>(false);
  bookingSuccess = signal<boolean>(false);
  bookingReference = signal<string>('');
  bookingConfirmedEmail = signal<string>('');
  bookingError = signal<string | null>(null);
  availableTimeSlots = signal<any[]>([]);
  isLoadingSlots = signal<boolean>(false);

  // Restaurant data from API
  restaurant = signal<any>({
    id: '',
    name: '',
    cuisine: '',
    priceRange: '$',
    rating: 0,
    reviewCount: 0,
    images: [],
    address: '',
    phone: '',
    website: '',
    hours: [],
    description: '',
    features: [],
    isOpen: false
  });

  // Reviews and dishes loaded from API - filtered by business_id
  recentReviews = signal<any[]>([]);
  popularDishes = signal<any[]>([]);

  // Track helpful clicks per review
  helpfulClicked = signal<{ [key: string]: boolean }>({});

  // Track if user is replying to a review
  replyingTo = signal<string | null>(null);

  // Track if write review modal is open
  showWriteReviewModal = signal(false);
  isSubmittingReview = signal(false);
  reviewSuccess = signal(false);
  reviewError = signal<string | null>(null);

  // Table preference notice
  showTablePreferenceNotice = signal(false);

  // Booking form
  bookingForm: FormGroup = this.fb.group({
    bookingDate: ['', Validators.required],
    bookingTime: ['', Validators.required],
    partySize: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
    contactName: ['', Validators.required],
    contactPhone: ['', Validators.required],
    contactEmail: ['', [Validators.required, Validators.email]],
    specialRequests: [''],
    tablePreferences: [''],
    occasion: ['']
  });

  // Review form
  reviewForm: FormGroup = this.fb.group({
    overallRating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    foodRating: [0],
    serviceRating: [0],
    ambianceRating: [0],
    valueRating: [0],
    title: [''],
    comment: ['', [Validators.required, Validators.minLength(20)]],
    visitDate: [''],
    wouldRecommend: [true]
  });

  // Star rating helper for template
  ratingStars = [1, 2, 3, 4, 5];

  // Today's date for max date on visit date input
  today = new Date().toISOString().split('T')[0];

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const businessId = params['id'];
      this.restaurantId.set(businessId);
      this.loadRestaurantData(businessId);
      this.loadMenuItems(businessId);
      this.loadReviews(businessId);
    });

    // Handle query parameters for actions (e.g., ?action=book)
    this.route.queryParams.subscribe(queryParams => {
      const action = queryParams['action'];
      const tab = queryParams['tab'];

      if (action === 'book' || action === 'order') {
        // Slight delay to ensure restaurant data is loaded
        setTimeout(() => {
          this.openBookingModal();
        }, 500);
      }

      // Handle tab navigation (can be extended later)
      if (tab === 'menu') {
        // Scroll to menu section
        setTimeout(() => {
          const menuSection = document.getElementById('menu-section');
          if (menuSection) {
            menuSection.scrollIntoView({ behavior: 'smooth' });
          }
        }, 500);
      }
    });
  }

  loadRestaurantData(businessId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.publicBusinessService.getBusinessById(businessId).subscribe({
      next: (response) => {
        const business = response.business;

        // Map business data to restaurant format
        const images = business.profilePhotos && business.profilePhotos.length > 0
          ? business.profilePhotos
          : [
              'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop',
              'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=600&fit=crop',
              'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=600&fit=crop'
            ];

        const hours = this.generateHoursFromOpenClose(business.opensAt, business.closesAt);
        const isOpen = this.isBusinessOpen(business.opensAt, business.closesAt);

        this.restaurant.set({
          id: business.id,
          name: business.businessName,
          cuisine: business.businessType,
          priceRange: '$', // Default, could be added to business model later
          rating: 0, // Will be calculated from reviews later
          reviewCount: 0, // Will be fetched from reviews later
          images,
          address: business.address || 'Address not provided',
          phone: business.phone || 'Phone not provided',
          website: business.email || '', // Using email as fallback
          hours,
          description: business.bio || `Welcome to ${business.businessName}. ${business.sustainabilityEthos || ''}`,
          features: business.facilities || [],
          isOpen
        });

        // Track page view for analytics
        this.trackPageView(business.id, 'profile');

        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading restaurant:', error);
        this.errorMessage.set('Failed to load restaurant details. Please try again later.');
        this.isLoading.set(false);
      }
    });
  }

  private generateHoursFromOpenClose(opensAt?: string, closesAt?: string): any[] {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    if (!opensAt || !closesAt) {
      return days.map(day => ({ day, hours: 'Hours not available' }));
    }

    const hoursString = `${opensAt} - ${closesAt}`;
    return days.map(day => ({ day, hours: hoursString }));
  }

  private isBusinessOpen(opensAt?: string, closesAt?: string): boolean {
    if (!opensAt || !closesAt) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [openHour, openMin] = opensAt.split(':').map(Number);
    const [closeHour, closeMin] = closesAt.split(':').map(Number);

    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;

    return currentTime >= openTime && currentTime <= closeTime;
  }

  loadMenuItems(businessId: string): void {
    // Fetch menu items for this specific business only
    this.http.get<any[]>(`${environment.apiUrl}/menus/business/${businessId}`).subscribe({
      next: (menus) => {
        // Map menu items with IDs for cart functionality
        const items: MenuItem[] = menus.map((menu: any) => ({
          id: menu.id,
          name: menu.title,
          price: menu.price,
          formattedPrice: `UGX ${menu.price.toLocaleString()}`,
          description: menu.description,
          image: menu.backgroundImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop',
          rating: 0,
          orders: 0,
          isAdding: false
        }));

        this.menuItems.set(items);

        // Also set popular dishes for backward compatibility
        const dishes = items.map(item => ({
          name: item.name,
          price: item.formattedPrice,
          description: item.description,
          image: item.image,
          rating: item.rating,
          orders: item.orders
        }));
        this.popularDishes.set(dishes);
      },
      error: (error) => {
        console.error('Error loading menu items:', error);
        this.menuItems.set([]);
        this.popularDishes.set([]);
      }
    });
  }

  // Add item to cart
  addToCart(item: MenuItem): void {
    if (!this.authService.isAuthenticated()) {
      // Redirect to login if not authenticated
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: `/restaurants/${this.restaurantId()}` }
      });
      return;
    }

    // Set loading state for this item
    this.menuItems.update(items =>
      items.map(i => i.id === item.id ? { ...i, isAdding: true } : i)
    );

    this.cartService.addToCart({
      businessId: this.restaurantId(),
      menuItemId: item.id,
      quantity: 1
    }).subscribe({
      next: () => {
        // Reset loading state
        this.menuItems.update(items =>
          items.map(i => i.id === item.id ? { ...i, isAdding: false } : i)
        );

        // Show notification
        this.addedToCartNotification.set(item.name);
        setTimeout(() => this.addedToCartNotification.set(null), 3000);
      },
      error: (error) => {
        console.error('Error adding to cart:', error);
        // Reset loading state
        this.menuItems.update(items =>
          items.map(i => i.id === item.id ? { ...i, isAdding: false } : i)
        );
        alert('Failed to add item to cart. Please try again.');
      }
    });
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  loadReviews(businessId: string): void {
    // Fetch reviews for this specific business only
    this.http.get<any>(`${environment.apiUrl}/reviews/business/${businessId}`).subscribe({
      next: (response) => {
        const reviews = response.reviews || [];

        // Map reviews to component format
        const mappedReviews = reviews.map((review: any) => ({
          id: review.id,
          customerName: review.customerName,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          date: new Date(review.createdAt),
          helpful: review.helpfulCount,
          notHelpful: review.notHelpfulCount,
          responseFromOwner: review.responseFromOwner,
          responseDate: review.responseDate ? new Date(review.responseDate) : null,
          isVerifiedVisit: review.isVerifiedVisit
        }));

        this.recentReviews.set(mappedReviews);

        // Update restaurant rating and review count
        if (response.stats) {
          this.restaurant.update(r => ({
            ...r,
            rating: response.stats.averageRating || 0,
            reviewCount: response.stats.reviewCount || 0
          }));
        }
      },
      error: (error) => {
        console.error('Error loading reviews:', error);
        // Keep empty array on error
        this.recentReviews.set([]);
      }
    });
  }

  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < Math.floor(rating));
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getCurrentDayHours(): string {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todayHours = this.restaurant().hours.find((h: any) => h.day === today);
    return todayHours ? todayHours.hours : 'Hours not available';
  }

  callRestaurant(): void {
    this.trackContactClick('phone');
    window.open(`tel:${this.restaurant().phone}`, '_self');
  }

  getDirections(): void {
    this.trackContactClick('directions');
    const address = encodeURIComponent(this.restaurant().address);
    window.open(`https://maps.google.com?q=${address}`, '_blank');
  }

  visitWebsite(): void {
    this.trackContactClick('website');
    const website = this.restaurant().website;
    if (website) {
      // Check if it's an email or actual website
      if (website.includes('@')) {
        window.open(`mailto:${website}`, '_self');
      } else {
        const url = website.startsWith('http') ? website : `https://${website}`;
        window.open(url, '_blank');
      }
    }
  }

  // View full menu - navigate to menu page or open modal
  viewFullMenu(): void {
    // Track menu view for analytics
    this.trackPageView(this.restaurantId(), 'menu');
    this.pagesVisited++;

    // Option 1: Navigate to menu page
    // this.router.navigate(['/restaurants', this.restaurantId(), 'menu']);

    // Option 2: Show alert for now (you can implement a modal later)
    alert('Opening full menu... This will navigate to the menu page or open a modal with the complete menu.');
  }

  // Share restaurant - track and open share dialog
  shareRestaurant(platform?: string): void {
    const businessId = this.restaurantId();
    if (!businessId) return;

    const deviceInfo = this.insightsService.getDeviceInfo();

    this.insightsService.trackShare({
      businessId,
      platform: platform || 'native',
      sessionId: this.sessionId,
      deviceType: deviceInfo.deviceType
    }).subscribe();

    // Native share if available
    if (navigator.share) {
      navigator.share({
        title: this.restaurant().name,
        text: `Check out ${this.restaurant().name} on iTiYum!`,
        url: window.location.href
      }).catch(console.error);
    } else {
      // Fallback: copy link to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  }

  // Write a review - open review modal
  openWriteReview(): void {
    // Check if user is logged in
    const user = this.authService.currentUser();
    if (!user) {
      alert('Please log in to write a review');
      return;
    }

    // Reset form and state
    this.reviewForm.reset({
      overallRating: 0,
      foodRating: 0,
      serviceRating: 0,
      ambianceRating: 0,
      valueRating: 0,
      title: '',
      comment: '',
      visitDate: '',
      wouldRecommend: true
    });
    this.reviewSuccess.set(false);
    this.reviewError.set(null);
    this.showWriteReviewModal.set(true);
  }

  // Close review modal
  closeReviewModal(): void {
    this.showWriteReviewModal.set(false);
    this.reviewSuccess.set(false);
    this.reviewError.set(null);
  }

  // Set rating for a specific field
  setRating(field: string, rating: number): void {
    this.reviewForm.get(field)?.setValue(rating);
  }

  // Get current rating value for display
  getRating(field: string): number {
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
    if (!user) {
      this.reviewError.set('Please log in to submit a review');
      return;
    }

    this.isSubmittingReview.set(true);
    this.reviewError.set(null);

    const reviewData = {
      userId: user.id,
      businessId: this.restaurantId(),
      overallRating: this.reviewForm.get('overallRating')?.value,
      foodRating: this.reviewForm.get('foodRating')?.value || null,
      serviceRating: this.reviewForm.get('serviceRating')?.value || null,
      ambianceRating: this.reviewForm.get('ambianceRating')?.value || null,
      valueRating: this.reviewForm.get('valueRating')?.value || null,
      title: this.reviewForm.get('title')?.value || '',
      comment: this.reviewForm.get('comment')?.value,
      visitDate: this.reviewForm.get('visitDate')?.value || null,
      wouldRecommend: this.reviewForm.get('wouldRecommend')?.value
    };

    this.http.post(`${environment.apiUrl}/reviews`, reviewData).subscribe({
      next: (response: any) => {
        this.isSubmittingReview.set(false);
        this.reviewSuccess.set(true);
        // Reload reviews to show the new one
        this.loadReviews(this.restaurantId());
      },
      error: (error) => {
        this.isSubmittingReview.set(false);
        this.reviewError.set(error.error?.error || 'Failed to submit review. Please try again.');
      }
    });
  }

  // Mark review as helpful
  markHelpful(reviewId: string): void {
    const clicked = this.helpfulClicked();

    if (clicked[reviewId]) {
      // Already clicked, unmark
      const review = this.recentReviews().find((r: any) => r.id === reviewId);
      if (review) {
        review.helpful--;
      }
      this.helpfulClicked.set({ ...clicked, [reviewId]: false });
    } else {
      // Mark as helpful
      const review = this.recentReviews().find((r: any) => r.id === reviewId);
      if (review) {
        review.helpful++;
      }
      this.helpfulClicked.set({ ...clicked, [reviewId]: true });
    }
  }

  // Check if review is marked helpful
  isMarkedHelpful(reviewId: string): boolean {
    return this.helpfulClicked()[reviewId] || false;
  }

  // Reply to review
  replyToReview(reviewId: string): void {
    if (this.replyingTo() === reviewId) {
      // Cancel reply
      this.replyingTo.set(null);
    } else {
      // Start replying
      this.replyingTo.set(reviewId);
      // In a real app, this would show a reply input field
      setTimeout(() => {
        alert(`Reply to review ${reviewId}:\nThis will display an input field where you can type your response to the customer's review.`);
        this.replyingTo.set(null);
      }, 100);
    }
  }

  // View all reviews - navigate to reviews page
  viewAllReviews(): void {
    // Option 1: Navigate to reviews page
    // this.router.navigate(['/restaurants', this.restaurantId(), 'reviews']);

    // Option 2: Show alert for now
    alert(`Viewing all ${this.restaurant().reviewCount} reviews... This will navigate to a dedicated reviews page or expand the current section.`);
  }

  // ============ BOOKING FUNCTIONALITY ============

  openBookingModal(): void {
    this.showBookingModal.set(true);
    this.bookingSuccess.set(false);
    this.bookingError.set(null);
    this.bookingForm.reset({
      partySize: 2,
      bookingDate: '',
      bookingTime: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      specialRequests: '',
      tablePreferences: '',
      occasion: ''
    });
  }

  closeBookingModal(): void {
    this.showBookingModal.set(false);
    this.bookingSuccess.set(false);
    this.bookingError.set(null);
    this.bookingReference.set('');
    this.bookingConfirmedEmail.set('');
    this.availableTimeSlots.set([]);
  }

  onDateChange(event: any): void {
    const selectedDate = event.target.value;
    if (selectedDate) {
      this.loadAvailableTimeSlots(selectedDate);
    }
  }

  onTablePreferenceChange(event: any): void {
    const preference = event.target.value;
    // Show notice when user selects a specific seating preference
    this.showTablePreferenceNotice.set(preference !== '');
  }

  loadAvailableTimeSlots(date: string): void {
    this.isLoadingSlots.set(true);
    this.availableTimeSlots.set([]);

    this.bookingsService.getAvailableTimeSlots(this.restaurantId(), date, 'basic').subscribe({
      next: (slots) => {
        this.availableTimeSlots.set(slots);
        this.isLoadingSlots.set(false);
      },
      error: (error) => {
        console.error('Error loading time slots:', error);
        this.isLoadingSlots.set(false);
      }
    });
  }

  submitBooking(): void {
    if (this.bookingForm.invalid) {
      Object.keys(this.bookingForm.controls).forEach(key => {
        this.bookingForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmittingBooking.set(true);
    this.bookingError.set(null);

    const formValue = this.bookingForm.value;
    const bookingRequest = {
      restaurantId: this.restaurantId(),
      bookingDate: formValue.bookingDate,
      bookingTime: formValue.bookingTime,
      partySize: formValue.partySize,
      contactName: formValue.contactName,
      contactPhone: formValue.contactPhone,
      contactEmail: formValue.contactEmail,
      specialRequests: formValue.specialRequests || '',
      tablePreferences: formValue.tablePreferences || '',
      occasion: formValue.occasion || '',
      bookingTier: 'basic' as const
    };

    this.bookingsService.createBooking(bookingRequest).subscribe({
      next: (response: any) => {
        this.isSubmittingBooking.set(false);
        this.bookingSuccess.set(true);
        // Use bookingReference (camelCase) as that's what transformBooking returns
        this.bookingReference.set(response.bookingReference || response.booking_reference || response.id);

        // Store email before resetting form so success message can display it
        this.bookingConfirmedEmail.set(formValue.contactEmail);

        // Reset form
        this.bookingForm.reset({ partySize: 2 });

        // Auto-close modal after 8 seconds (increased for better UX)
        setTimeout(() => {
          this.closeBookingModal();
        }, 8000);
      },
      error: (error) => {
        this.isSubmittingBooking.set(false);
        this.bookingError.set(
          error.error?.error || 'Failed to create booking. Please try again.'
        );
        console.error('Booking error:', error);
      }
    });
  }

  // Get minimum date for booking (today)
  getMinDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Get maximum date for booking (90 days from now)
  getMaxDate(): string {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    return maxDate.toISOString().split('T')[0];
  }

  // ==================== ANALYTICS TRACKING ====================

  private generateSessionId(): string {
    // Check if session ID exists in sessionStorage, otherwise create new one
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
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

    // Track session end on page unload
    this.setupSessionTracking(businessId);
  }

  private setupSessionTracking(businessId: string): void {
    // Only set up once
    if ((window as any).__sessionTrackingSet) return;
    (window as any).__sessionTrackingSet = true;

    const trackEnd = () => {
      const duration = Math.round((Date.now() - this.sessionStartTime) / 1000);

      // Use sendBeacon for reliable tracking on page unload
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

  private trackContactClick(clickType: string): void {
    const businessId = this.restaurantId();
    if (!businessId) return;

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
}
