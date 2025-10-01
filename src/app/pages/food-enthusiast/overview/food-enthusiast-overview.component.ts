import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FoodEnthusiast } from '../../../shared/models/user.model';

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

  // User stats
  userStats = signal({
    reviewsWritten: 47,
    restaurantsVisited: 156,
    cuisinesExplored: 23,
    followersCount: 342,
    averageRating: 4.2,
    monthlyGoal: 8,
    monthlyProgress: 5
  });

  // Personalized restaurant recommendations
  recommendations = signal<RestaurantRecommendation[]>([
    {
      id: '1',
      name: 'Sakura Sushi Bar',
      image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=300&h=200&fit=crop',
      cuisine: 'Japanese',
      rating: 4.8,
      priceRange: '$$$',
      distance: '0.8 miles',
      specialties: ['Omakase', 'Fresh Sashimi', 'Sake Pairing'],
      isNew: true
    },
    {
      id: '2',
      name: 'Nonna\'s Kitchen',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=200&fit=crop',
      cuisine: 'Italian',
      rating: 4.6,
      priceRange: '$$',
      distance: '1.2 miles',
      specialties: ['Handmade Pasta', 'Wood-fired Pizza', 'Tiramisu'],
      isNew: false
    },
    {
      id: '3',
      name: 'Spice Route',
      image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&h=200&fit=crop',
      cuisine: 'Indian',
      rating: 4.7,
      priceRange: '$$',
      distance: '2.1 miles',
      specialties: ['Tandoor Specialties', 'Regional Curries', 'Naan Varieties'],
      isNew: false
    }
  ]);

  // Trending dishes in the area
  trendingDishes = signal<TrendingDish[]>([
    {
      id: '1',
      name: 'Truffle Ramen',
      image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&h=200&fit=crop',
      restaurant: 'Umami House',
      cuisine: 'Japanese Fusion',
      popularity: 95,
      description: 'Rich tonkotsu broth with black truffle shavings and soft-boiled egg'
    },
    {
      id: '2',
      name: 'Deconstructed Tiramisu',
      image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=300&h=200&fit=crop',
      restaurant: 'Dolce Vita',
      cuisine: 'Modern Italian',
      popularity: 88,
      description: 'Innovative presentation of the classic dessert with espresso caviar'
    },
    {
      id: '3',
      name: 'Smoked Duck Tacos',
      image: 'https://images.unsplash.com/photo-1565299585323-38174c4a6c18?w=300&h=200&fit=crop',
      restaurant: 'Mesa Street',
      cuisine: 'Mexican Fusion',
      popularity: 92,
      description: '12-hour smoked duck with mole negro and pickled onions'
    }
  ]);

  // Recent reviews by the user
  recentReviews = signal<RecentReview[]>([
    {
      id: '1',
      restaurantName: 'The Golden Spoon',
      restaurantImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&h=100&fit=crop',
      rating: 5,
      comment: 'Absolutely phenomenal dining experience! The chef\'s tasting menu was a journey through flavors I never knew existed. Each course was perfectly executed.',
      date: new Date('2024-01-20'),
      likes: 23,
      isPublic: true
    },
    {
      id: '2',
      restaurantName: 'Bistro Laurent',
      restaurantImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100&h=100&fit=crop',
      rating: 4,
      comment: 'Classic French cuisine done right. The coq au vin was tender and flavorful, though the service could be more attentive.',
      date: new Date('2024-01-18'),
      likes: 15,
      isPublic: true
    },
    {
      id: '3',
      restaurantName: 'Street Food Paradise',
      restaurantImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=100&h=100&fit=crop',
      rating: 4,
      comment: 'Great authentic street food experience. The pad thai was exceptional, and the atmosphere was lively and fun.',
      date: new Date('2024-01-15'),
      likes: 31,
      isPublic: true
    }
  ]);

  // Upcoming culinary events
  upcomingEvents = signal<CulinaryEvent[]>([
    {
      id: '1',
      title: 'Wine & Dine Festival',
      type: 'festival',
      date: new Date('2024-02-15'),
      location: 'Central Park',
      price: 85,
      image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&h=200&fit=crop',
      isBookmarked: true
    },
    {
      id: '2',
      title: 'Sushi Making Workshop',
      type: 'workshop',
      date: new Date('2024-02-22'),
      location: 'Culinary Institute',
      price: 120,
      image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=300&h=200&fit=crop',
      isBookmarked: false
    },
    {
      id: '3',
      title: 'Michelin Star Pop-up',
      type: 'popup',
      date: new Date('2024-03-01'),
      location: 'Downtown Gallery',
      price: 200,
      image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=300&h=200&fit=crop',
      isBookmarked: true
    }
  ]);

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
