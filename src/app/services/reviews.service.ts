import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { ApiService } from '../core/services/api.service';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string;
  cuisineTypes: string[];
  priceRange: string;
  averageRating: number;
  totalReviews: number;
  imageUrl: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  website?: string;
}

export interface ReviewPhoto {
  id: string;
  url: string;
  altText?: string;
  caption?: string;
  displayOrder: number;
}

export interface Review {
  id: string;
  restaurantId: string;
  restaurant: Restaurant;
  userId: string;
  overallRating: number;
  foodRating?: number;
  serviceRating?: number;
  ambianceRating?: number;
  valueRating?: number;
  title?: string;
  content: string;
  visitDate?: Date;
  dishesOrdered: string[];
  pricePaid?: number;
  partySize?: number;
  occasion?: string;
  wouldRecommend: boolean;
  status: 'draft' | 'published' | 'flagged' | 'archived';
  isVerifiedVisit: boolean;
  helpfulVotes: number;
  totalVotes: number;
  isFeatured: boolean;
  responseFromBusiness?: string;
  responseDate?: Date;
  photos: ReviewPhoto[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface ReviewRequest {
  restaurantId: string;
  overallRating: number;
  foodRating?: number;
  serviceRating?: number;
  ambianceRating?: number;
  valueRating?: number;
  title?: string;
  content: string;
  visitDate?: string;
  dishesOrdered: string[];
  pricePaid?: number;
  partySize?: number;
  occasion?: string;
  wouldRecommend: boolean;
  photos?: File[];
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  helpfulVotes: number;
  totalVotes: number;
  reviewsThisMonth: number;
  reviewsThisYear: number;
  topCuisines: { name: string; count: number }[];
  reviewStreak: number;
  ratingBreakdown: { [key: number]: number };
  monthlyReviews: { month: string; count: number }[];
}

export interface ReviewFilters {
  status: 'all' | 'published' | 'draft' | 'archived';
  rating: 'all' | '5' | '4' | '3' | '2' | '1';
  timeRange: 'all' | 'week' | 'month' | '3months' | 'year';
  cuisine: string;
  sortBy: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful';
}

@Injectable({
  providedIn: 'root'
})
export class ReviewsService {
  private apiService = inject(ApiService);

  // State management
  private reviewsSubject = new BehaviorSubject<Review[]>([]);
  private restaurantsSubject = new BehaviorSubject<Restaurant[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  reviews$ = this.reviewsSubject.asObservable();
  restaurants$ = this.restaurantsSubject.asObservable();
  isLoading$ = this.isLoadingSubject.asObservable();

  constructor() {
    this.loadUserReviews();
    this.loadRestaurants();
  }

  private loadUserReviews(): void {
    const userId = localStorage.getItem('user_id') || 'temp-user';
    this.isLoadingSubject.next(true);

    this.apiService.get<any>(`reviews/user/${userId}`).subscribe({
      next: (response) => {
        const reviews = response.reviews?.map((review: any) => this.transformReview(review)) || [];
        this.reviewsSubject.next(reviews);
        this.isLoadingSubject.next(false);
      },
      error: (error) => {
        console.error('Error loading reviews:', error);
        this.reviewsSubject.next([]);
        this.isLoadingSubject.next(false);
      }
    });
  }

  private loadRestaurants(): void {
    this.apiService.get<any[]>('businesses').subscribe({
      next: (businesses) => {
        const restaurants = businesses.map(business => this.transformBusinessToRestaurant(business));
        this.restaurantsSubject.next(restaurants);
      },
      error: (error) => {
        console.error('Error loading restaurants:', error);
        this.restaurantsSubject.next([]);
      }
    });
  }

  // Transformation methods
  private transformReview(review: any): Review {
    return {
      id: review.id,
      restaurantId: review.business_id,
      restaurant: {
        id: review.business_id,
        name: review.business_name,
        slug: review.business_name.toLowerCase().replace(/\s+/g, '-'),
        description: '',
        cuisineTypes: [],
        priceRange: 'moderate',
        averageRating: 0,
        totalReviews: 0,
        imageUrl: `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop`,
        address: '',
        city: '',
        state: '',
        phone: '',
        email: '',
        website: ''
      },
      userId: review.user_id,
      overallRating: review.overall_rating,
      foodRating: review.food_rating,
      serviceRating: review.service_rating,
      ambianceRating: review.ambiance_rating,
      valueRating: review.value_rating,
      title: review.title,
      content: review.content,
      visitDate: review.visit_date ? new Date(review.visit_date) : undefined,
      dishesOrdered: review.dishes_ordered || [],
      pricePaid: review.price_paid,
      partySize: review.party_size,
      occasion: review.occasion,
      wouldRecommend: review.would_recommend,
      photos: review.photos || [],
      helpfulVotes: review.helpful_votes || 0,
      totalVotes: review.total_votes || 0,
      status: review.status,
      createdAt: new Date(review.created_at),
      updatedAt: new Date(review.updated_at),
      publishedAt: review.published_at ? new Date(review.published_at) : undefined,
      isVerifiedVisit: review.is_verified_visit || false,
      isFeatured: review.is_featured || false
    };
  }

  private transformBusinessToRestaurant(business: any): Restaurant {
    return {
      id: business.id,
      name: business.business_name,
      slug: business.business_name.toLowerCase().replace(/\s+/g, '-'),
      description: business.bio || '',
      cuisineTypes: [],
      priceRange: 'moderate',
      averageRating: 0,
      totalReviews: 0,
      imageUrl: business.profile_photos?.[0] || `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop`,
      address: business.address || '',
      city: '',
      state: '',
      phone: business.phone || '',
      email: business.email || '',
      website: ''
    };
  }

  // Public API methods
  getReviews(): Observable<Review[]> {
    return this.reviews$;
  }

  getRestaurants(): Observable<Restaurant[]> {
    return this.restaurants$;
  }

  getReviewById(id: string): Observable<Review | null> {
    return this.reviews$.pipe(
      map(reviews => reviews.find(review => review.id === id) || null)
    );
  }

  getRestaurantById(id: string): Observable<Restaurant | null> {
    return this.restaurants$.pipe(
      map(restaurants => restaurants.find(restaurant => restaurant.id === id) || null)
    );
  }

  getReviewsByRestaurant(restaurantId: string): Observable<Review[]> {
    return this.apiService.get<any>(`reviews/business/${restaurantId}`).pipe(
      map(response => response.reviews?.map((review: any) => this.transformReview(review)) || []),
      catchError(error => {
        console.error('Error fetching restaurant reviews:', error);
        return of([]);
      })
    );
  }

  // Create new review
  createReview(reviewRequest: ReviewRequest): Observable<Review> {
    const userId = localStorage.getItem('user_id') || 'temp-user';

    const payload = {
      businessId: reviewRequest.restaurantId,
      userId,
      overallRating: reviewRequest.overallRating,
      foodRating: reviewRequest.foodRating,
      serviceRating: reviewRequest.serviceRating,
      ambianceRating: reviewRequest.ambianceRating,
      valueRating: reviewRequest.valueRating,
      title: reviewRequest.title,
      content: reviewRequest.content,
      visitDate: reviewRequest.visitDate,
      dishesOrdered: reviewRequest.dishesOrdered,
      pricePaid: reviewRequest.pricePaid,
      partySize: reviewRequest.partySize,
      occasion: reviewRequest.occasion,
      wouldRecommend: reviewRequest.wouldRecommend,
      photos: reviewRequest.photos
    };

    return this.apiService.post<any>('reviews', payload).pipe(
      map(response => this.transformReview(response)),
      tap(review => {
        const currentReviews = this.reviewsSubject.value;
        this.reviewsSubject.next([...currentReviews, review]);
      }),
      catchError(error => {
        console.error('Error creating review:', error);
        throw error;
      })
    );
  }

  // Update review
  updateReview(reviewId: string, updates: Partial<Review>): Observable<boolean> {
    return this.apiService.patch(`reviews/${reviewId}`, updates).pipe(
      map(() => true),
      tap(() => {
        const currentReviews = this.reviewsSubject.value;
        const updatedReviews = currentReviews.map(review =>
          review.id === reviewId ? { ...review, ...updates, updatedAt: new Date() } : review
        );
        this.reviewsSubject.next(updatedReviews);
      }),
      catchError(error => {
        console.error('Error updating review:', error);
        return of(false);
      })
    );
  }

  // Delete review
  deleteReview(reviewId: string): Observable<boolean> {
    return this.apiService.delete(`reviews/${reviewId}`).pipe(
      map(() => true),
      tap(() => {
        const currentReviews = this.reviewsSubject.value;
        const updatedReviews = currentReviews.filter(review => review.id !== reviewId);
        this.reviewsSubject.next(updatedReviews);
      }),
      catchError(error => {
        console.error('Error deleting review:', error);
        return of(false);
      })
    );
  }

  // Vote on review helpfulness
  voteOnReview(reviewId: string, isHelpful: boolean): Observable<boolean> {
    return this.apiService.post(`reviews/${reviewId}/vote`, { isHelpful }).pipe(
      map(() => true),
      tap(() => {
        const currentReviews = this.reviewsSubject.value;
        const updatedReviews = currentReviews.map(review =>
          review.id === reviewId
            ? {
                ...review,
                helpfulVotes: isHelpful ? review.helpfulVotes + 1 : review.helpfulVotes,
                totalVotes: review.totalVotes + 1
              }
            : review
        );
        this.reviewsSubject.next(updatedReviews);
      }),
      catchError(error => {
        console.error('Error voting on review:', error);
        return of(false);
      })
    );
  }

  // Get review statistics
  getReviewStats(): Observable<ReviewStats> {
    return this.reviews$.pipe(
      map(reviews => this.calculateReviewStats(reviews))
    );
  }

  private calculateReviewStats(reviews: Review[]): ReviewStats {
    const now = new Date();
    const thisMonth = reviews.filter(r =>
      r.createdAt.getMonth() === now.getMonth() &&
      r.createdAt.getFullYear() === now.getFullYear()
    );
    const thisYear = reviews.filter(r => r.createdAt.getFullYear() === now.getFullYear());

    // Calculate rating breakdown
    const ratingBreakdown: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      const rating = review.overallRating;
      if (rating >= 1 && rating <= 5) {
        ratingBreakdown[rating] = (ratingBreakdown[rating] || 0) + 1;
      }
    });

    // Calculate top cuisines
    const cuisineCounts: { [key: string]: number } = {};
    reviews.forEach(review => {
      review.restaurant.cuisineTypes.forEach(cuisine => {
        cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
      });
    });

    const topCuisines = Object.entries(cuisineCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Calculate monthly reviews for the last 6 months
    const monthlyReviews = this.getMonthlyReviewStats(reviews);

    // Calculate review streak (consecutive days with reviews)
    const reviewStreak = this.calculateReviewStreak(reviews);

    return {
      totalReviews: reviews.length,
      averageRating: reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length : 0,
      helpfulVotes: reviews.reduce((sum, r) => sum + r.helpfulVotes, 0),
      totalVotes: reviews.reduce((sum, r) => sum + r.totalVotes, 0),
      reviewsThisMonth: thisMonth.length,
      reviewsThisYear: thisYear.length,
      topCuisines,
      reviewStreak,
      ratingBreakdown,
      monthlyReviews
    };
  }

  private getMonthlyReviewStats(reviews: Review[]): { month: string; count: number }[] {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const count = reviews.filter(review =>
        review.createdAt.toISOString().slice(0, 7) === monthKey
      ).length;

      months.push({ month: monthName, count });
    }

    return months;
  }

  private calculateReviewStreak(reviews: Review[]): number {
    // Simple implementation - count consecutive days with reviews
    const sortedReviews = reviews
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (sortedReviews.length === 0) return 0;

    let streak = 1;
    const today = new Date();
    const lastReviewDate = sortedReviews[0].createdAt;

    // Check if last review was today or yesterday
    const daysDiff = Math.floor((today.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 1) return 0;

    // Count consecutive days
    for (let i = 1; i < sortedReviews.length; i++) {
      const currentDate = sortedReviews[i].createdAt;
      const prevDate = sortedReviews[i - 1].createdAt;
      const diff = Math.floor((prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  // All data now comes from the backend API

  // All data now comes from the backend API
}
