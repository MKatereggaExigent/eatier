import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { DatabaseService } from './database.service';

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
  private http = inject(HttpClient);
  private databaseService = inject(DatabaseService);
  private apiUrl = '/api/reviews';

  // State management
  private reviewsSubject = new BehaviorSubject<Review[]>([]);
  private restaurantsSubject = new BehaviorSubject<Restaurant[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  reviews$ = this.reviewsSubject.asObservable();
  restaurants$ = this.restaurantsSubject.asObservable();
  isLoading$ = this.isLoadingSubject.asObservable();

  constructor() {
    // Initialize with mock data and test database connection
    this.initializeReviews();
  }

  private initializeReviews(): void {
    this.databaseService.testConnection().subscribe({
      next: (connected) => {
        if (connected) {
          console.log('Database connected, loading reviews from database');
          this.loadReviewsFromDatabase();
          this.loadRestaurantsFromDatabase();
        } else {
          console.log('Database not available, using mock data');
          this.reviewsSubject.next(this.mockReviews);
          this.restaurantsSubject.next(this.mockRestaurants);
        }
      },
      error: () => {
        console.log('Database connection failed, using mock data');
        this.reviewsSubject.next(this.mockReviews);
        this.restaurantsSubject.next(this.mockRestaurants);
      }
    });
  }

  // Database methods
  private loadReviewsFromDatabase(): void {
    this.databaseService.getUserReviews().subscribe({
      next: (dbReviews) => {
        const reviews = this.transformDatabaseReviews(dbReviews);
        this.reviewsSubject.next(reviews);
      },
      error: (error) => {
        console.error('Error loading reviews from database:', error);
        this.reviewsSubject.next(this.mockReviews);
      }
    });
  }

  private loadRestaurantsFromDatabase(): void {
    this.databaseService.getRestaurants().subscribe({
      next: (dbRestaurants) => {
        const restaurants = this.transformDatabaseRestaurants(dbRestaurants);
        this.restaurantsSubject.next(restaurants);
      },
      error: (error) => {
        console.error('Error loading restaurants from database:', error);
        this.restaurantsSubject.next(this.mockRestaurants);
      }
    });
  }

  private transformDatabaseReviews(dbReviews: any[]): Review[] {
    return dbReviews.map(dbReview => ({
      id: dbReview.id,
      restaurantId: dbReview.business_id,
      restaurant: {
        id: dbReview.business.id,
        name: dbReview.business.name,
        slug: dbReview.business.slug,
        description: dbReview.business.description || '',
        cuisineTypes: dbReview.business.cuisine_types || [],
        priceRange: dbReview.business.price_range || 'moderate',
        averageRating: dbReview.business.average_rating || 0,
        totalReviews: dbReview.business.total_reviews || 0,
        imageUrl: `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop`,
        address: dbReview.business_location?.address || '',
        city: dbReview.business_location?.city || '',
        state: dbReview.business_location?.state || '',
        phone: dbReview.business.contact_phone || '',
        email: dbReview.business.contact_email || '',
        website: dbReview.business.website
      },
      userId: dbReview.user_id,
      overallRating: dbReview.overall_rating,
      foodRating: dbReview.food_rating,
      serviceRating: dbReview.service_rating,
      ambianceRating: dbReview.ambiance_rating,
      valueRating: dbReview.value_rating,
      title: dbReview.title,
      content: dbReview.content,
      visitDate: dbReview.visit_date ? new Date(dbReview.visit_date) : undefined,
      dishesOrdered: dbReview.dishes_ordered || [],
      pricePaid: dbReview.price_paid,
      partySize: dbReview.party_size,
      occasion: dbReview.occasion,
      wouldRecommend: dbReview.would_recommend,
      status: dbReview.status,
      isVerifiedVisit: dbReview.is_verified_visit,
      helpfulVotes: dbReview.helpful_votes,
      totalVotes: dbReview.total_votes,
      isFeatured: dbReview.is_featured,
      responseFromBusiness: dbReview.response_from_business,
      responseDate: dbReview.response_date ? new Date(dbReview.response_date) : undefined,
      photos: dbReview.photos || [],
      createdAt: new Date(dbReview.created_at),
      updatedAt: new Date(dbReview.updated_at)
    }));
  }

  private transformDatabaseRestaurants(dbRestaurants: any[]): Restaurant[] {
    return dbRestaurants.map(dbRestaurant => ({
      id: dbRestaurant.id,
      name: dbRestaurant.name,
      slug: dbRestaurant.slug,
      description: dbRestaurant.description || '',
      cuisineTypes: dbRestaurant.cuisine_types || [],
      priceRange: dbRestaurant.price_range || 'moderate',
      averageRating: dbRestaurant.average_rating || 0,
      totalReviews: dbRestaurant.total_reviews || 0,
      imageUrl: `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop`,
      address: dbRestaurant.location?.address || '',
      city: dbRestaurant.location?.city || '',
      state: dbRestaurant.location?.state || '',
      phone: dbRestaurant.contact_phone || '',
      email: dbRestaurant.contact_email || '',
      website: dbRestaurant.website
    }));
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

  // Create new review
  createReview(reviewRequest: ReviewRequest): Observable<Review> {
    return this.databaseService.createReview(reviewRequest).pipe(
      switchMap(success => {
        if (success) {
          // Reload reviews to get updated list
          this.loadReviewsFromDatabase();
          return this.getReviews().pipe(
            map(reviews => {
              const newReview = reviews.find(r =>
                r.restaurantId === reviewRequest.restaurantId &&
                r.overallRating === reviewRequest.overallRating &&
                r.content === reviewRequest.content
              );
              return newReview || this.createMockReview(reviewRequest);
            })
          );
        } else {
          return of(this.createMockReview(reviewRequest));
        }
      }),
      catchError(error => {
        console.error('Error creating review:', error);
        return of(this.createMockReview(reviewRequest));
      })
    );
  }

  // Update review
  updateReview(reviewId: string, updates: Partial<ReviewRequest>): Observable<boolean> {
    return this.databaseService.updateReview(reviewId, updates).pipe(
      tap(success => {
        if (success) {
          this.loadReviewsFromDatabase();
        } else {
          // Update mock data
          const currentReviews = this.reviewsSubject.value;
          const updatedReviews = currentReviews.map(review => {
            if (review.id === reviewId) {
              const updatedReview: Review = {
                ...review,
                overallRating: updates.overallRating ?? review.overallRating,
                foodRating: updates.foodRating ?? review.foodRating,
                serviceRating: updates.serviceRating ?? review.serviceRating,
                ambianceRating: updates.ambianceRating ?? review.ambianceRating,
                valueRating: updates.valueRating ?? review.valueRating,
                title: updates.title ?? review.title,
                content: updates.content ?? review.content,
                visitDate: updates.visitDate ? new Date(updates.visitDate) : review.visitDate,
                dishesOrdered: updates.dishesOrdered ?? review.dishesOrdered,
                pricePaid: updates.pricePaid ?? review.pricePaid,
                partySize: updates.partySize ?? review.partySize,
                occasion: updates.occasion ?? review.occasion,
                wouldRecommend: updates.wouldRecommend ?? review.wouldRecommend,
                updatedAt: new Date()
              };
              return updatedReview;
            }
            return review;
          });
          this.reviewsSubject.next(updatedReviews);
        }
      }),
      catchError(error => {
        console.error('Error updating review:', error);
        return of(false);
      })
    );
  }

  // Delete review
  deleteReview(reviewId: string): Observable<boolean> {
    return this.databaseService.deleteReview(reviewId).pipe(
      tap(success => {
        if (success) {
          this.loadReviewsFromDatabase();
        } else {
          // Update mock data
          const currentReviews = this.reviewsSubject.value;
          const updatedReviews = currentReviews.filter(review => review.id !== reviewId);
          this.reviewsSubject.next(updatedReviews);
        }
      }),
      catchError(error => {
        console.error('Error deleting review:', error);
        return of(false);
      })
    );
  }

  // Vote on review helpfulness
  voteOnReview(reviewId: string, isHelpful: boolean): Observable<boolean> {
    return this.databaseService.voteOnReview(reviewId, isHelpful).pipe(
      tap(success => {
        if (success) {
          this.loadReviewsFromDatabase();
        } else {
          // Update mock data
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
        }
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

  private createMockReview(request: ReviewRequest): Review {
    const restaurant = this.mockRestaurants.find(r => r.id === request.restaurantId) || this.mockRestaurants[0];

    return {
      id: Date.now().toString(),
      restaurantId: request.restaurantId,
      restaurant,
      userId: 'current-user',
      overallRating: request.overallRating,
      foodRating: request.foodRating,
      serviceRating: request.serviceRating,
      ambianceRating: request.ambianceRating,
      valueRating: request.valueRating,
      title: request.title,
      content: request.content,
      visitDate: request.visitDate ? new Date(request.visitDate) : undefined,
      dishesOrdered: request.dishesOrdered,
      pricePaid: request.pricePaid,
      partySize: request.partySize,
      occasion: request.occasion,
      wouldRecommend: request.wouldRecommend,
      status: 'published',
      isVerifiedVisit: false,
      helpfulVotes: 0,
      totalVotes: 0,
      isFeatured: false,
      photos: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // Mock data for development
  private mockRestaurants: Restaurant[] = [
    {
      id: 'rest-1',
      name: 'The Golden Spoon',
      slug: 'the-golden-spoon',
      description: 'Fine dining experience with contemporary American cuisine',
      cuisineTypes: ['American', 'Contemporary'],
      priceRange: 'expensive',
      averageRating: 4.8,
      totalReviews: 342,
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      phone: '(555) 123-4567',
      email: 'info@goldenspoon.com',
      website: 'https://goldenspoon.com'
    },
    {
      id: 'rest-2',
      name: 'Sakura Sushi Bar',
      slug: 'sakura-sushi-bar',
      description: 'Authentic Japanese sushi and sashimi with omakase experience',
      cuisineTypes: ['Japanese', 'Sushi'],
      priceRange: 'expensive',
      averageRating: 4.9,
      totalReviews: 198,
      imageUrl: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop',
      address: '456 Sushi Lane',
      city: 'New York',
      state: 'NY',
      phone: '(555) 987-6543',
      email: 'info@sakurasushi.com'
    }
  ];

  private mockReviews: Review[] = [
    {
      id: 'review-1',
      restaurantId: 'rest-1',
      restaurant: this.mockRestaurants[0],
      userId: 'user-1',
      overallRating: 5,
      foodRating: 5,
      serviceRating: 5,
      ambianceRating: 4,
      valueRating: 4,
      title: 'Exceptional Fine Dining Experience',
      content: 'The Golden Spoon exceeded all expectations. The chef\'s tasting menu was a masterpiece, with each course perfectly executed. The service was impeccable, and the ambiance was sophisticated yet welcoming. The wine pairing was spot-on. This is definitely a special occasion restaurant that delivers on every front.',
      visitDate: new Date('2024-01-15'),
      dishesOrdered: ['Chef\'s Tasting Menu', 'Wine Pairing'],
      pricePaid: 285,
      partySize: 2,
      occasion: 'Anniversary',
      wouldRecommend: true,
      status: 'published',
      isVerifiedVisit: true,
      helpfulVotes: 23,
      totalVotes: 25,
      isFeatured: true,
      photos: [],
      createdAt: new Date('2024-01-16'),
      updatedAt: new Date('2024-01-16')
    }
  ];
}
