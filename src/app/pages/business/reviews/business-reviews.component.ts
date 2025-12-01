import { Component, OnInit, OnDestroy, computed, signal, inject } from '@angular/core';
import { Subject, catchError, finalize, of, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BusinessOwnerService, Review as APIReview } from '../../../core/services/business-owner.service';

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
export class BusinessReviewsComponent implements OnInit, OnDestroy {
  private businessOwnerService = inject(BusinessOwnerService);
  private destroy$ = new Subject<void>();

  // State management
  loading = signal(true);
  reviews = signal<Review[]>([]);
  selectedReviews = signal<string[]>([]);
  showMoreActions = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadReviews(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.businessOwnerService.getReviews()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading reviews:', error);
          this.errorMessage.set('Failed to load reviews. Please try again.');
          return of({ reviews: [] });
        }),
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe(response => {
        if (response && response.reviews) {
          // Map API reviews to component format
          const mappedReviews: Review[] = response.reviews.map((apiReview: any) => ({
            id: apiReview.id,
            customerName: apiReview.customer_name || 'Anonymous',
            customerAvatar: undefined,
            rating: apiReview.rating,
            comment: apiReview.comment || '',
            date: new Date(apiReview.created_at),
            status: apiReview.response_from_owner ? 'responded' : 'pending',
            helpfulCount: apiReview.helpful_count || 0,
            isMarkedHelpful: false,
            source: 'direct' as 'google' | 'yelp' | 'facebook' | 'direct',
            businessResponse: apiReview.response_from_owner ? {
              content: apiReview.response_from_owner,
              date: new Date(apiReview.response_date || apiReview.updated_at),
              authorName: 'Business Owner'
            } : undefined
          }));

          this.reviews.set(mappedReviews);
          // Recalculate stats after loading reviews
          this.loadReviewStats();
        }
      });
  }

  private loadReviewStats(): void {
    // Calculate stats from loaded reviews
    const reviews = this.reviews();

    if (reviews.length === 0) {
      return;
    }

    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    // Count reviews from last month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const monthlyReviews = reviews.filter(r => r.date >= oneMonthAgo).length;

    // Calculate response rate
    const respondedCount = reviews.filter(r => r.status === 'responded').length;
    const responseRate = totalReviews > 0 ? (respondedCount / totalReviews) * 100 : 0;

    const stats: ReviewStats = {
      totalReviews,
      averageRating,
      monthlyReviews,
      responseRate,
      averageResponseTime: 6, // TODO: Calculate from actual response times
      ratingChange: 0, // TODO: Calculate from historical data
      responseRateChange: 0 // TODO: Calculate from historical data
    };

    this.reviewStats.set(stats);
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
