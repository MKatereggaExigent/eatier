import { ActivatedRoute, RouterModule } from '@angular/router';
import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { CommonModule } from '@angular/common';
import { PublicBusinessService, PublicBusiness } from '../../../core/services/public-business.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './restaurant-detail.component.html',
  styleUrls: ['./restaurant-detail.component.scss']
})
export class RestaurantDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private publicBusinessService = inject(PublicBusinessService);
  private http = inject(HttpClient);

  restaurantId = signal<string>('');
  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

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

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const businessId = params['id'];
      this.restaurantId.set(businessId);
      this.loadRestaurantData(businessId);
      this.loadMenuItems(businessId);
      this.loadReviews(businessId);
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
        // Map menu items to dish format for display
        const dishes = menus.map((menu: any) => ({
          name: menu.title,
          price: `$${menu.price.toFixed(2)}`,
          description: menu.description,
          image: menu.backgroundImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop',
          rating: 0, // No ratings yet
          orders: 0  // No order tracking yet
        }));

        this.popularDishes.set(dishes);
      },
      error: (error) => {
        console.error('Error loading menu items:', error);
        // Keep empty array on error
        this.popularDishes.set([]);
      }
    });
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
    window.open(`tel:${this.restaurant().phone}`, '_self');
  }

  getDirections(): void {
    const address = encodeURIComponent(this.restaurant().address);
    window.open(`https://maps.google.com?q=${address}`, '_blank');
  }

  visitWebsite(): void {
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
    // Option 1: Navigate to menu page
    // this.router.navigate(['/restaurants', this.restaurantId(), 'menu']);

    // Option 2: Show alert for now (you can implement a modal later)
    alert('Opening full menu... This will navigate to the menu page or open a modal with the complete menu.');
  }

  // Write a review - open review modal
  openWriteReview(): void {
    this.showWriteReviewModal.set(true);
    // In a real app, this would open a modal or navigate to review page
    alert('Opening review form... This will display a modal where customers can write their review with rating, photos, and comments.');
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
}
