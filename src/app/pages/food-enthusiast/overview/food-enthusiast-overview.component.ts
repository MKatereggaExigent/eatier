import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { CommonModule } from '@angular/common';
import { FoodEnthusiast } from '../../../shared/models/user.model';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { environment } from '../../../../environments/environment';

interface RestaurantRecommendation {
  id: string;
  name: string;
  image: string;
  cuisine: string;
  rating: number;
  priceRange: string;
  distance: string;
  specialties: string[];
  isNew: boolean;
}

interface TrendingDish {
  id: string;
  name: string;
  image: string;
  restaurant: string;
  cuisine: string;
  popularity: number;
  description: string;
}

interface RecentReview {
  id: string;
  restaurantName: string;
  restaurantImage: string;
  rating: number;
  comment: string;
  date: Date;
  likes: number;
  isPublic: boolean;
}

interface CulinaryEvent {
  id: string;
  title: string;
  type: 'tasting' | 'workshop' | 'festival' | 'popup';
  date: Date;
  location: string;
  price: number;
  image: string;
  isBookmarked: boolean;
}

@Component({
  selector: 'app-food-enthusiast-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './food-enthusiast-overview.component.html',
  styleUrls: ['./food-enthusiast-overview.component.scss']
})
export class FoodEnthusiastOverviewComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private userService = inject(UserService);
  private currencyService = inject(CurrencyService);
  private http = inject(HttpClient);

  currentUser = this.authService.currentUser;
  foodEnthusiast = computed(() => this.currentUser() as FoodEnthusiast);

  // Loading states
  isLoading = signal(false);

  // User stats - will be populated from API
  userStats = signal({
    reviewsWritten: 0,
    restaurantsVisited: 0,
    cuisinesExplored: 0,
    followersCount: 0,
    averageRating: 0,
    monthlyGoal: 8,
    monthlyProgress: 0
  });

  // Personalized restaurant recommendations - will be populated from API
  recommendations = signal<RestaurantRecommendation[]>([]);

  // Trending dishes in the area - will be populated from API
  trendingDishes = signal<TrendingDish[]>([]);

  // Recent reviews by the user - will be populated from API
  recentReviews = signal<RecentReview[]>([]);

  // Upcoming culinary events - will be populated from API
  upcomingEvents = signal<CulinaryEvent[]>([]);

  // Computed properties
  monthlyProgressPercentage = computed(() => {
    const stats = this.userStats();
    return Math.min((stats.monthlyProgress / stats.monthlyGoal) * 100, 100);
  });

  topRecommendations = computed(() =>
    this.recommendations().slice(0, 3)
  );

  ngOnInit(): void {
    const user = this.currentUser();
    if (user?.id) {
      this.loadUserStats(user.id);
      this.loadRecommendations(user.id);
      this.loadRecentReviews(user.id);
      this.loadTrendingDishes();
    }
  }

  // Data loading methods
  private loadUserStats(userId: string): void {
    this.userService.getUserStats(userId)
      .pipe(
        catchError(error => {
          console.error('Error loading user stats:', error);
          return of({
            totalReviews: 0,
            totalBookings: 0,
            totalFavorites: 0,
            totalPhotos: 0,
            restaurantsVisited: 0
          });
        })
      )
      .subscribe(stats => {
        // Use restaurantsVisited from page views, fallback to bookings
        const visited = stats.restaurantsVisited || stats.totalBookings || 0;

        this.userStats.set({
          reviewsWritten: stats.totalReviews || 0,
          restaurantsVisited: visited,
          cuisinesExplored: Math.floor(visited / 3), // Estimate based on visits
          followersCount: 0, // TODO: Add followers endpoint
          averageRating: 0, // TODO: Calculate from reviews
          monthlyGoal: 8,
          monthlyProgress: Math.min(visited, 8)
        });
      });
  }

  private loadRecommendations(userId: string): void {
    this.userService.getRecommendedBusinesses(userId, { limit: 6 })
      .pipe(
        catchError(error => {
          console.error('Error loading recommendations:', error);
          return of({ businesses: [] });
        })
      )
      .subscribe(response => {
        const recommendations = response.businesses.map((business: any) => ({
          id: business.id,
          name: business.name,
          image: business.image || business.logo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
          cuisine: Array.isArray(business.cuisine) ? business.cuisine.join(', ') : business.cuisine || 'Various',
          rating: parseFloat(business.avgRating || business.rating || '4.0'),
          priceRange: business.priceRange || '$$',
          distance: '2.5 km', // TODO: Calculate actual distance
          specialties: business.specialties || [],
          isNew: false
        }));
        this.recommendations.set(recommendations);
      });
  }

  private loadRecentReviews(userId: string): void {
    this.http.get<any>(`${environment.apiUrl}/reviews/user/${userId}?limit=5`)
      .pipe(
        catchError(error => {
          console.error('Error loading reviews:', error);
          return of({ reviews: [] });
        })
      )
      .subscribe(response => {
        const reviews = (response.reviews || []).map((review: any) => ({
          id: review.id,
          restaurantName: review.business_name,
          restaurantImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100',
          rating: review.overall_rating || review.rating,
          comment: review.content || review.comment,
          date: new Date(review.created_at),
          likes: review.helpful_votes || 0,
          isPublic: review.status === 'published'
        }));
        this.recentReviews.set(reviews);
      });
  }

  private loadTrendingDishes(): void {
    this.http.get<any>(`${environment.apiUrl}/recommendations/trending?limit=6`)
      .pipe(
        catchError(error => {
          console.error('Error loading trending dishes:', error);
          return of({ trending: [] });
        })
      )
      .subscribe(response => {
        const trending = (response.trending || []).map((item: any) => ({
          id: item.id,
          name: item.name || 'Signature Dish',
          image: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
          restaurant: item.restaurant || item.business_name,
          cuisine: item.cuisine || 'Various',
          popularity: Math.floor(Math.random() * 30) + 70, // Mock popularity
          description: item.description || 'A trending favorite'
        }));
        this.trendingDishes.set(trending);
      });
  }

  // Action methods
  bookmarkRestaurant(restaurantId: string): void {
    console.log('Bookmarking restaurant:', restaurantId);
    // TODO: Implement bookmark functionality via favorites API
  }

  bookmarkEvent(eventId: string): void {
    const events = this.upcomingEvents();
    const updatedEvents = events.map(event =>
      event.id === eventId ? { ...event, isBookmarked: !event.isBookmarked } : event
    );
    this.upcomingEvents.set(updatedEvents);
  }

  viewRestaurant(restaurantId: string): void {
    // Navigate to restaurant detail page
    this.router.navigate(['/restaurants', restaurantId]);
  }

  viewAllRecommendations(): void {
    // Navigate to public restaurants page (can show all restaurants)
    this.router.navigate(['/restaurants']);
  }

  viewAllTrending(): void {
    // Navigate to public restaurants page (can add trending filter later)
    this.router.navigate(['/restaurants']);
  }

  viewAllReviews(): void {
    // Navigate to food enthusiast reviews page
    this.router.navigate(['/dashboard/food-enthusiast/reviews']);
  }

  viewAllEvents(): void {
    // Navigate to public restaurants page (events can be added later)
    // For now, navigate to favorites where users can see bookmarked items
    this.router.navigate(['/dashboard/food-enthusiast/favorites']);
  }

  // Utility methods
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  formatCurrency(amount: number): string {
    // Use CurrencyService for dynamic currency formatting
    return this.currencyService?.formatAmount(amount) || `$${amount.toFixed(2)}`;
  }

  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < Math.floor(rating));
  }

  getEventTypeIcon(type: string): string {
    const icons = {
      tasting: '🍷',
      workshop: '👨‍🍳',
      festival: '🎉',
      popup: '⭐'
    };
    return icons[type as keyof typeof icons] || '🍽️';
  }

  getEventTypeLabel(type: string): string {
    const labels = {
      tasting: 'Wine Tasting',
      workshop: 'Cooking Workshop',
      festival: 'Food Festival',
      popup: 'Pop-up Restaurant'
    };
    return labels[type as keyof typeof labels] || type;
  }
}
