import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Subject, catchError, finalize, of, takeUntil } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { BusinessOwner } from '../../../shared/models/user.model';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

// Production-ready interfaces
interface BusinessStats {
  totalReviews: number;
  averageRating: number;
  monthlyViews: number;
  favoriteCount: number;
  monthlyReviewsChange: number;
  monthlyViewsChange: number;
  monthlyFavoritesChange: number;
  ratingChange: number;
}

interface Review {
  id: string;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  comment: string;
  date: Date;
  isResponded: boolean;
  helpfulCount: number;
}

interface LoadingState {
  stats: boolean;
  reviews: boolean;
  profile: boolean;
}

interface ErrorState {
  stats: string | null;
  reviews: string | null;
  profile: string | null;
}

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  // Reactive state management
  currentUser = this.authService.currentUser;
  businessOwner = signal<BusinessOwner | null>(null);

  // Loading states
  loading = signal<LoadingState>({
    stats: true,
    reviews: true,
    profile: true
  });

  // Error states
  errors = signal<ErrorState>({
    stats: null,
    reviews: null,
    profile: null
  });

  // Data signals
  stats = signal<BusinessStats>({
    totalReviews: 0,
    averageRating: 0,
    monthlyViews: 0,
    favoriteCount: 0,
    monthlyReviewsChange: 0,
    monthlyViewsChange: 0,
    monthlyFavoritesChange: 0,
    ratingChange: 0
  });

  recentReviews = signal<Review[]>([]);

  // Computed properties
  hasData = computed(() =>
    !this.loading().stats &&
    !this.loading().reviews &&
    !this.errors().stats &&
    !this.errors().reviews
  );

  hasErrors = computed(() =>
    this.errors().stats ||
    this.errors().reviews ||
    this.errors().profile
  );

  ngOnInit(): void {
    this.initializeComponent();
    this.loadBusinessData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    const user = this.currentUser();
    if (user && user.role === 'business') {
      this.businessOwner.set(user as BusinessOwner);
    } else {
      this.errors.update(state => ({
        ...state,
        profile: 'Invalid user role or not authenticated'
      }));
    }
  }

  private loadBusinessData(): void {
    // Load stats
    this.loadBusinessStats();
    // Load recent reviews
    this.loadRecentReviews();
  }

  private loadBusinessStats(): void {
    this.loading.update(state => ({ ...state, stats: true }));
    this.errors.update(state => ({ ...state, stats: null }));

    // Simulate API call - replace with actual service
    setTimeout(() => {
      try {
        // Mock data with realistic production structure
        const mockStats: BusinessStats = {
          totalReviews: 127,
          averageRating: 4.3,
          monthlyViews: 2456,
          favoriteCount: 89,
          monthlyReviewsChange: 12,
          monthlyViewsChange: 18,
          monthlyFavoritesChange: 7,
          ratingChange: 0.2
        };

        this.stats.set(mockStats);
      } catch (error) {
        this.errors.update(state => ({
          ...state,
          stats: 'Failed to load business statistics'
        }));
      } finally {
        this.loading.update(state => ({ ...state, stats: false }));
      }
    }, 1000);
  }

  private loadRecentReviews(): void {
    this.loading.update(state => ({ ...state, reviews: true }));
    this.errors.update(state => ({ ...state, reviews: null }));

    // Simulate API call - replace with actual service
    setTimeout(() => {
      try {
        const mockReviews: Review[] = [
          {
            id: '1',
            customerName: 'Sarah Johnson',
            customerAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face',
            rating: 5,
            comment: 'Amazing food and excellent service! Will definitely come back.',
            date: new Date('2024-01-15'),
            isResponded: false,
            helpfulCount: 3
          },
          {
            id: '2',
            customerName: 'Mike Chen',
            customerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
            rating: 4,
            comment: 'Great atmosphere and delicious pasta. Highly recommended.',
            date: new Date('2024-01-14'),
            isResponded: true,
            helpfulCount: 5
          },
          {
            id: '3',
            customerName: 'Emily Davis',
            customerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face',
            rating: 5,
            comment: 'Best Italian restaurant in town! The tiramisu is to die for.',
            date: new Date('2024-01-13'),
            isResponded: false,
            helpfulCount: 8
          }
        ];

        this.recentReviews.set(mockReviews);
      } catch (error) {
        this.errors.update(state => ({
          ...state,
          reviews: 'Failed to load recent reviews'
        }));
      } finally {
        this.loading.update(state => ({ ...state, reviews: false }));
      }
    }, 800);
  }

  // Utility methods
  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < Math.floor(rating));
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }

  formatPercentage(num: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(num / 100);
  }

  getChangeIcon(change: number): string {
    return change > 0 ? '📈' : change < 0 ? '📉' : '➖';
  }

  getChangeClass(change: number): string {
    return change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
  }

  // Action handlers
  onRespondToReview(reviewId: string): void {
    // Navigate to review response page or open modal
    console.log('Responding to review:', reviewId);
  }

  onMarkHelpful(reviewId: string): void {
    // Update helpful count
    console.log('Marking review as helpful:', reviewId);
  }

  onRetryLoad(section: 'stats' | 'reviews'): void {
    if (section === 'stats') {
      this.loadBusinessStats();
    } else if (section === 'reviews') {
      this.loadRecentReviews();
    }
  }

  // Accessibility helpers
  getAriaLabel(rating: number): string {
    return `${rating} out of 5 stars`;
  }

  getStatAriaLabel(value: number, label: string, change: number): string {
    const changeText = change > 0 ? `increased by ${change}` :
                      change < 0 ? `decreased by ${Math.abs(change)}` : 'no change';
    return `${label}: ${value}, ${changeText} this month`;
  }
}
