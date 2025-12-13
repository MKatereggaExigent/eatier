import { Component, computed, inject, signal } from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { FoodEnthusiast } from '../../../shared/models/user.model';
import { RouterModule } from '@angular/router';

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
export class FoodEnthusiastOverviewComponent {
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;
  foodEnthusiast = computed(() => this.currentUser() as FoodEnthusiast);

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

  // Action methods
  bookmarkRestaurant(restaurantId: string): void {
    console.log('Bookmarking restaurant:', restaurantId);
    // TODO: Implement bookmark functionality
  }

  bookmarkEvent(eventId: string): void {
    const events = this.upcomingEvents();
    const updatedEvents = events.map(event =>
      event.id === eventId ? { ...event, isBookmarked: !event.isBookmarked } : event
    );
    this.upcomingEvents.set(updatedEvents);
  }

  viewRestaurant(restaurantId: string): void {
    console.log('Viewing restaurant:', restaurantId);
    // TODO: Navigate to restaurant details
  }

  viewAllRecommendations(): void {
    console.log('Navigate to all recommendations');
    // TODO: Navigate to recommendations page
  }

  viewAllTrending(): void {
    console.log('Navigate to trending dishes');
    // TODO: Navigate to trending page
  }

  viewAllReviews(): void {
    console.log('Navigate to all reviews');
    // TODO: Navigate to reviews page
  }

  viewAllEvents(): void {
    console.log('Navigate to all events');
    // TODO: Navigate to events page
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
