import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

interface Review {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage?: string;
  rating: number;
  title: string;
  content: string;
  photos: string[];
  visitDate: Date;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  helpfulVotes: number;
  totalVotes: number;
  tags: string[];
  dishesOrdered: string[];
  priceRange: 'budget' | 'moderate' | 'expensive' | 'fine_dining';
  serviceRating: number;
  foodRating: number;
  ambianceRating: number;
  valueRating: number;
  wouldRecommend: boolean;
  status: 'draft' | 'published' | 'flagged' | 'archived';
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  helpfulVotes: number;
  totalVotes: number;
  reviewsThisMonth: number;
  reviewsThisYear: number;
  topCuisines: { name: string; count: number }[];
  reviewStreak: number;
}

interface FilterOptions {
  status: 'all' | 'published' | 'draft' | 'archived';
  rating: 'all' | '5' | '4' | '3' | '2' | '1';
  timeRange: 'all' | 'week' | 'month' | '3months' | 'year';
  cuisine: string;
  sortBy: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful';
}

@Component({
  selector: 'app-user-reviews',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './user-reviews.component.html',
  styleUrls: ['./user-reviews.component.scss']
})
export class UserReviewsComponent {
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;

  // State management
  isLoading = signal(false);
  selectedReview = signal<Review | null>(null);
  showNewReviewModal = signal(false);
  showEditModal = signal(false);
  showDeleteConfirm = signal(false);

  // Filter and search
  searchQuery = signal('');
  filters = signal<FilterOptions>({
    status: 'all',
    rating: 'all',
    timeRange: 'all',
    cuisine: '',
    sortBy: 'newest'
  });

  // Mock data - in real app, this would come from a service
  reviews = signal<Review[]>([
    {
      id: '1',
      restaurantId: 'rest1',
      restaurantName: 'The Golden Spoon',
      restaurantImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=300&h=200&fit=crop',
      rating: 5,
      title: 'Exceptional dining experience!',
      content: 'Had an absolutely wonderful evening at The Golden Spoon. The service was impeccable, and every dish was a masterpiece. The chef\'s tasting menu exceeded all expectations. The ambiance was perfect for a special occasion.',
      photos: [
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop'
      ],
      visitDate: new Date('2024-01-15'),
      createdAt: new Date('2024-01-16'),
      updatedAt: new Date('2024-01-16'),
      isPublic: true,
      helpfulVotes: 23,
      totalVotes: 25,
      tags: ['fine_dining', 'romantic', 'special_occasion', 'excellent_service'],
      dishesOrdered: ['Chef\'s Tasting Menu', 'Wine Pairing'],
      priceRange: 'fine_dining',
      serviceRating: 5,
      foodRating: 5,
      ambianceRating: 5,
      valueRating: 4,
      wouldRecommend: true,
      status: 'published'
    },
    {
      id: '2',
      restaurantId: 'rest2',
      restaurantName: 'Mama\'s Kitchen',
      restaurantImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&h=200&fit=crop',
      rating: 4,
      title: 'Comfort food at its finest',
      content: 'Great homestyle cooking with generous portions. The lasagna was incredible and the tiramisu was the perfect ending. Service was friendly though a bit slow during peak hours.',
      photos: [
        'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=400&h=300&fit=crop'
      ],
      visitDate: new Date('2024-01-10'),
      createdAt: new Date('2024-01-11'),
      updatedAt: new Date('2024-01-11'),
      isPublic: true,
      helpfulVotes: 15,
      totalVotes: 18,
      tags: ['italian', 'comfort_food', 'family_friendly', 'good_value'],
      dishesOrdered: ['Lasagna', 'Caesar Salad', 'Tiramisu'],
      priceRange: 'moderate',
      serviceRating: 3,
      foodRating: 5,
      ambianceRating: 4,
      valueRating: 5,
      wouldRecommend: true,
      status: 'published'
    },
    {
      id: '3',
      restaurantId: 'rest3',
      restaurantName: 'Sakura Sushi',
      restaurantImage: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=300&h=200&fit=crop',
      rating: 4,
      title: 'Fresh sushi, great atmosphere',
      content: 'The fish was incredibly fresh and the presentation was beautiful. The omakase was worth every penny. Only downside was the wait time, but the quality made up for it.',
      photos: [],
      visitDate: new Date('2024-01-05'),
      createdAt: new Date('2024-01-06'),
      updatedAt: new Date('2024-01-06'),
      isPublic: false,
      helpfulVotes: 8,
      totalVotes: 10,
      tags: ['japanese', 'sushi', 'fresh', 'omakase'],
      dishesOrdered: ['Omakase', 'Miso Soup', 'Green Tea Ice Cream'],
      priceRange: 'expensive',
      serviceRating: 4,
      foodRating: 5,
      ambianceRating: 4,
      valueRating: 3,
      wouldRecommend: true,
      status: 'published'
    },
    {
      id: '4',
      restaurantId: 'rest4',
      restaurantName: 'Street Tacos Express',
      rating: 3,
      title: 'Quick bite, decent food',
      content: 'Good for a quick lunch. The carnitas tacos were flavorful but the al pastor was a bit dry. Prices are reasonable and service is fast.',
      photos: [],
      visitDate: new Date('2023-12-28'),
      createdAt: new Date('2023-12-29'),
      updatedAt: new Date('2023-12-29'),
      isPublic: true,
      helpfulVotes: 5,
      totalVotes: 7,
      tags: ['mexican', 'quick_bite', 'casual', 'affordable'],
      dishesOrdered: ['Carnitas Tacos', 'Al Pastor Tacos', 'Horchata'],
      priceRange: 'budget',
      serviceRating: 4,
      foodRating: 3,
      ambianceRating: 2,
      valueRating: 4,
      wouldRecommend: true,
      status: 'draft'
    }
  ]);

  reviewStats = signal<ReviewStats>({
    totalReviews: 4,
    averageRating: 4.0,
    helpfulVotes: 51,
    totalVotes: 60,
    reviewsThisMonth: 3,
    reviewsThisYear: 4,
    topCuisines: [
      { name: 'Italian', count: 2 },
      { name: 'Japanese', count: 1 },
      { name: 'Mexican', count: 1 }
    ],
    reviewStreak: 3
  });

  // Computed properties
  filteredReviews = computed(() => {
    let filtered = this.reviews();
    const query = this.searchQuery().toLowerCase();
    const currentFilters = this.filters();

    // Search filter
    if (query) {
      filtered = filtered.filter(review => 
        review.restaurantName.toLowerCase().includes(query) ||
        review.title.toLowerCase().includes(query) ||
        review.content.toLowerCase().includes(query) ||
        review.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (currentFilters.status !== 'all') {
      filtered = filtered.filter(review => review.status === currentFilters.status);
    }

    // Rating filter
    if (currentFilters.rating !== 'all') {
      const targetRating = parseInt(currentFilters.rating);
      filtered = filtered.filter(review => review.rating === targetRating);
    }

    // Time range filter
    if (currentFilters.timeRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (currentFilters.timeRange) {
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case '3months':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(review => review.createdAt >= cutoffDate);
    }

    // Sort
    switch (currentFilters.sortBy) {
      case 'newest':
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'rating_high':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'rating_low':
        filtered.sort((a, b) => a.rating - b.rating);
        break;
      case 'helpful':
        filtered.sort((a, b) => b.helpfulVotes - a.helpfulVotes);
        break;
    }

    return filtered;
  });

  helpfulnessPercentage = computed(() => {
    const stats = this.reviewStats();
    return stats.totalVotes > 0 ? Math.round((stats.helpfulVotes / stats.totalVotes) * 100) : 0;
  });

  // Action methods
  openNewReviewModal(): void {
    this.showNewReviewModal.set(true);
  }

  closeNewReviewModal(): void {
    this.showNewReviewModal.set(false);
  }

  editReview(review: Review): void {
    this.selectedReview.set(review);
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.selectedReview.set(null);
    this.showEditModal.set(false);
  }

  deleteReview(reviewId: string): void {
    this.selectedReview.set(this.reviews().find(r => r.id === reviewId) || null);
    this.showDeleteConfirm.set(true);
  }

  confirmDelete(): void {
    const reviewToDelete = this.selectedReview();
    if (reviewToDelete) {
      const updatedReviews = this.reviews().filter(r => r.id !== reviewToDelete.id);
      this.reviews.set(updatedReviews);
      
      // Update stats
      const stats = this.reviewStats();
      this.reviewStats.set({
        ...stats,
        totalReviews: stats.totalReviews - 1,
        helpfulVotes: stats.helpfulVotes - reviewToDelete.helpfulVotes,
        totalVotes: stats.totalVotes - reviewToDelete.totalVotes
      });
    }
    this.showDeleteConfirm.set(false);
    this.selectedReview.set(null);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.selectedReview.set(null);
  }

  toggleReviewVisibility(reviewId: string): void {
    const reviews = this.reviews();
    const updatedReviews = reviews.map(review => 
      review.id === reviewId 
        ? { ...review, isPublic: !review.isPublic }
        : review
    );
    this.reviews.set(updatedReviews);
  }

  updateFilters(newFilters: Partial<FilterOptions>): void {
    this.filters.update(current => ({ ...current, ...newFilters }));
  }

  clearFilters(): void {
    this.filters.set({
      status: 'all',
      rating: 'all',
      timeRange: 'all',
      cuisine: '',
      sortBy: 'newest'
    });
    this.searchQuery.set('');
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

  getStatusColor(status: string): string {
    const colors = {
      published: 'status-published',
      draft: 'status-draft',
      flagged: 'status-flagged',
      archived: 'status-archived'
    };
    return colors[status as keyof typeof colors] || 'status-default';
  }

  getStatusIcon(status: string): string {
    const icons = {
      published: '🌟',
      draft: '📝',
      flagged: '⚠️',
      archived: '📦'
    };
    return icons[status as keyof typeof icons] || '📋';
  }

  getPriceRangeDisplay(priceRange: string): string {
    const ranges = {
      budget: '$',
      moderate: '$$',
      expensive: '$$$',
      fine_dining: '$$$$'
    };
    return ranges[priceRange as keyof typeof ranges] || '$$';
  }
}
