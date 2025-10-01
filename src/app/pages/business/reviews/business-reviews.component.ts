import { Component, OnInit, computed, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Interfaces
interface ReviewPhoto {
  id: string;
  url: string;
  alt?: string;
}

interface BusinessResponse {
  content: string;
  date: Date;
  authorName: string;
}

interface Review {
  id: string;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  comment: string;
  date: Date;
  status: 'responded' | 'pending';
  businessResponse?: BusinessResponse;
  helpfulCount: number;
  isMarkedHelpful: boolean;
  photos?: ReviewPhoto[];
  source: 'google' | 'yelp' | 'facebook' | 'direct';
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  monthlyReviews: number;
  responseRate: number;
  averageResponseTime: number;
  ratingChange: number;
  responseRateChange: number;
}

@Component({
  selector: 'app-business-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './business-reviews.component.html',
  styleUrl: './business-reviews.component.scss'
})
export class BusinessReviewsComponent implements OnInit {
  // State management
  loading = signal(true);
  reviews = signal<Review[]>([]);
  selectedReviews = signal<string[]>([]);
  showMoreActions = signal<string | null>(null);

  // Filters
  selectedRating = '';
  selectedStatus = '';
  selectedDateRange = 'all';
  searchQuery = '';

  // Pagination
  currentPage = signal(1);
  itemsPerPage = 10;

  // Statistics
  reviewStats = signal<ReviewStats>({
    totalReviews: 0,
    averageRating: 0,
    monthlyReviews: 0,
    responseRate: 0,
    averageResponseTime: 0,
    ratingChange: 0,
    responseRateChange: 0
  });

  // Computed properties
  filteredReviews = computed(() => {
    let filtered = this.reviews();

    // Rating filter
    if (this.selectedRating) {
      filtered = filtered.filter(review => review.rating === parseInt(this.selectedRating));
    }

    // Status filter
    if (this.selectedStatus) {
      filtered = filtered.filter(review => review.status === this.selectedStatus);
    }

    // Date range filter
    if (this.selectedDateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (this.selectedDateRange) {
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(review => review.date >= filterDate);
    }

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(review =>
        review.customerName.toLowerCase().includes(query) ||
        review.comment.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  });

  totalPages = computed(() => Math.ceil(this.filteredReviews().length / this.itemsPerPage));

  paginatedReviews = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredReviews().slice(start, end);
  });

  ngOnInit(): void {
    this.loadReviews();
    this.loadReviewStats();
  }

  private async loadReviews(): Promise<void> {
    this.loading.set(true);

    try {
      // Simulate API call - replace with actual service
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockReviews: Review[] = [
        {
          id: '1',
          customerName: 'Sarah Johnson',
          customerAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=60&h=60&fit=crop&crop=face',
          rating: 5,
          comment: 'Amazing food and excellent service! The pasta was perfectly cooked and the atmosphere was wonderful. Will definitely come back with friends and family.',
          date: new Date('2024-01-15'),
          status: 'pending',
          helpfulCount: 12,
          isMarkedHelpful: false,
          source: 'google',
          photos: [
            { id: '1', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=200&h=150&fit=crop' },
            { id: '2', url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200&h=150&fit=crop' }
          ]
        },
        {
          id: '2',
          customerName: 'Mike Chen',
          customerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face',
          rating: 4,
          comment: 'Great atmosphere and delicious food. The service was a bit slow during peak hours, but overall a good experience.',
          date: new Date('2024-01-14'),
          status: 'responded',
          helpfulCount: 8,
          isMarkedHelpful: true,
          source: 'yelp',
          businessResponse: {
            content: 'Thank you for your feedback, Mike! We\'re glad you enjoyed the food and atmosphere. We\'re working on improving our service speed during busy times.',
            date: new Date('2024-01-15'),
            authorName: 'Restaurant Manager'
          }
        },
        {
          id: '3',
          customerName: 'Emily Davis',
          customerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face',
          rating: 5,
          comment: 'Best Italian restaurant in town! The tiramisu is to die for. Highly recommend for date nights.',
          date: new Date('2024-01-13'),
          status: 'responded',
          helpfulCount: 15,
          isMarkedHelpful: false,
          source: 'facebook',
          businessResponse: {
            content: 'Thank you so much, Emily! We\'re thrilled you enjoyed our tiramisu. We look forward to welcoming you back soon!',
            date: new Date('2024-01-14'),
            authorName: 'Chef Marco'
          }
        },
        {
          id: '4',
          customerName: 'David Wilson',
          rating: 2,
          comment: 'Food was okay but service was disappointing. Had to wait 45 minutes for our order and the staff seemed overwhelmed.',
          date: new Date('2024-01-12'),
          status: 'pending',
          helpfulCount: 3,
          isMarkedHelpful: false,
          source: 'google'
        },
        {
          id: '5',
          customerName: 'Lisa Rodriguez',
          customerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&h=60&fit=crop&crop=face',
          rating: 5,
          comment: 'Absolutely fantastic! Every dish was perfect and the wine selection is excellent. The staff was knowledgeable and friendly.',
          date: new Date('2024-01-11'),
          status: 'responded',
          helpfulCount: 20,
          isMarkedHelpful: true,
          source: 'direct',
          businessResponse: {
            content: 'Lisa, thank you for such a wonderful review! We\'re so happy you enjoyed both the food and wine. Our team works hard to provide excellent service.',
            date: new Date('2024-01-12'),
            authorName: 'Restaurant Manager'
          }
        }
      ];

      this.reviews.set(mockReviews);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadReviewStats(): Promise<void> {
    try {
      // Simulate API call - replace with actual service
      await new Promise(resolve => setTimeout(resolve, 500));

      const stats: ReviewStats = {
        totalReviews: 247,
        averageRating: 4.6,
        monthlyReviews: 23,
        responseRate: 85,
        averageResponseTime: 6,
        ratingChange: 0.2,
        responseRateChange: 5
      };

      this.reviewStats.set(stats);
    } catch (error) {
      console.error('Failed to load review stats:', error);
    }
  }

  // Filter and search methods
  onFilterChange(): void {
    this.currentPage.set(1);
  }

  onSearch(): void {
    this.currentPage.set(1);
  }

  clearAllFilters(): void {
    this.selectedRating = '';
    this.selectedStatus = '';
    this.selectedDateRange = 'all';
    this.searchQuery = '';
    this.currentPage.set(1);
  }

  hasActiveFilters(): boolean {
    return !!(this.selectedRating || this.selectedStatus || this.selectedDateRange !== 'all' || this.searchQuery.trim());
  }

  getNoReviewsMessage(): string {
    if (this.hasActiveFilters()) {
      return 'No reviews match your current filters. Try adjusting your search criteria.';
    }
    return 'No reviews yet. Encourage your customers to leave reviews!';
  }

  // Selection methods
  toggleReviewSelection(reviewId: string): void {
    const selected = this.selectedReviews();
    if (selected.includes(reviewId)) {
      this.selectedReviews.set(selected.filter(id => id !== reviewId));
    } else {
      this.selectedReviews.set([...selected, reviewId]);
    }
  }

  isReviewSelected(reviewId: string): boolean {
    return this.selectedReviews().includes(reviewId);
  }

  // Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
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

  getAriaLabel(rating: number): string {
    return `${rating} out of 5 stars`;
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'responded': return 'Responded';
      case 'pending': return 'Pending Response';
      default: return status;
    }
  }

  // Statistics helper methods
  getRatingChangeClass(): string {
    return this.reviewStats().ratingChange >= 0 ? 'positive' : 'negative';
  }

  getRatingChangeText(): string {
    const change = this.reviewStats().ratingChange;
    const prefix = change >= 0 ? '+' : '';
    return `${prefix}${change.toFixed(1)} from last month`;
  }

  getResponseRateClass(): string {
    return this.reviewStats().responseRateChange >= 0 ? 'positive' : 'negative';
  }

  getResponseRateText(): string {
    const change = this.reviewStats().responseRateChange;
    const prefix = change >= 0 ? '+' : '';
    return `${prefix}${change}% from last month`;
  }

  // Action methods
  openResponseModal(review: Review): void {
    console.log('Opening response modal for review:', review.id);
    // TODO: Implement response modal
  }

  editResponse(reviewId: string): void {
    console.log('Editing response for review:', reviewId);
    // TODO: Implement edit response functionality
  }

  markAsHelpful(reviewId: string): void {
    const reviews = this.reviews();
    const updatedReviews = reviews.map(review => {
      if (review.id === reviewId) {
        return {
          ...review,
          isMarkedHelpful: !review.isMarkedHelpful,
          helpfulCount: review.isMarkedHelpful ? review.helpfulCount - 1 : review.helpfulCount + 1
        };
      }
      return review;
    });
    this.reviews.set(updatedReviews);
  }

  shareReview(review: Review): void {
    console.log('Sharing review:', review.id);
    // TODO: Implement share functionality
  }

  toggleMoreActions(reviewId: string): void {
    const current = this.showMoreActions();
    this.showMoreActions.set(current === reviewId ? null : reviewId);
  }

  reportReview(reviewId: string): void {
    console.log('Reporting review:', reviewId);
    this.showMoreActions.set(null);
    // TODO: Implement report functionality
  }

  hideReview(reviewId: string): void {
    console.log('Hiding review:', reviewId);
    this.showMoreActions.set(null);
    // TODO: Implement hide functionality
  }

  downloadReview(reviewId: string): void {
    console.log('Downloading review:', reviewId);
    this.showMoreActions.set(null);
    // TODO: Implement download functionality
  }

  openPhotoModal(photo: ReviewPhoto): void {
    console.log('Opening photo modal:', photo.id);
    // TODO: Implement photo modal
  }

  exportReviews(): void {
    console.log('Exporting reviews');
    // TODO: Implement export functionality
  }

  openBulkResponseModal(): void {
    console.log('Opening bulk response modal for:', this.selectedReviews());
    // TODO: Implement bulk response functionality
  }
}
