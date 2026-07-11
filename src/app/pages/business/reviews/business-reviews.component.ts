import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BusinessOwnerService, Review } from '../../../core/services/business-owner.service';

interface ReviewDisplay {
  id: string;
  customerName: string;
  customerAvatar?: string;
  customerEmail?: string;
  rating: number;
  comment: string;
  date: Date;
  status: 'responded' | 'pending';
  helpfulCount: number;
  businessResponse?: {
    content: string;
    date: Date;
    authorName: string;
  };
}

@Component({
  selector: 'app-business-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './business-reviews.component.html',
  styleUrls: ['./business-reviews.component.scss']
})
export class BusinessReviewsComponent implements OnInit {
  private businessOwnerService = inject(BusinessOwnerService);

  // State
  reviews = signal<ReviewDisplay[]>([]);
  selectedReview = signal<ReviewDisplay | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  showResponseModal = signal<boolean>(false);
  respondContent = signal<string>('');
  isSubmitting = signal<boolean>(false);

  // Filters
  ratingFilter = signal<string>('all');
  searchQuery = signal<string>('');

  // Pagination
  currentPage = signal<number>(1);
  totalReviews = signal<number>(0);
  pageSize = signal<number>(20);
  hasMore = signal<boolean>(false);

  // Computed
  filteredReviews = computed(() => {
    let filtered = this.reviews();
    const query = this.searchQuery().toLowerCase().trim();

    if (query) {
      filtered = filtered.filter(r =>
        r.customerName.toLowerCase().includes(query) ||
        r.comment.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  statistics = computed(() => {
    const all = this.reviews();
    const total = all.length;
    const avgRating = total > 0
      ? (all.reduce((sum, r) => sum + r.rating, 0) / total)
      : 0;
    const responded = all.filter(r => r.status === 'responded').length;
    const pending = all.filter(r => r.status === 'pending').length;
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthlyReviews = all.filter(r => r.date >= monthAgo).length;
    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

    return { total, avgRating, responded, pending, monthlyReviews, responseRate };
  });

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const params: any = {
      page: this.currentPage(),
      limit: this.pageSize()
    };

    if (this.ratingFilter() !== 'all') {
      params.rating = parseInt(this.ratingFilter());
    }

    this.businessOwnerService.getReviews(params).subscribe({
      next: (response) => {
        const mappedReviews: ReviewDisplay[] = response.reviews.map(apiReview => ({
          id: apiReview.id,
          customerName: apiReview.customer_name || 'Anonymous',
          customerAvatar: (apiReview as any).customer_avatar,
          customerEmail: apiReview.customer_email,
          rating: apiReview.rating,
          comment: apiReview.comment || '',
          date: new Date(apiReview.created_at),
          status: apiReview.response_from_owner ? 'responded' : 'pending',
          helpfulCount: apiReview.helpful_count || 0,
          businessResponse: apiReview.response_from_owner ? {
            content: apiReview.response_from_owner,
            date: new Date(apiReview.response_date || apiReview.updated_at),
            authorName: 'Business Owner'
          } : undefined
        }));

        this.reviews.set(mappedReviews);
        this.totalReviews.set(response.total);
        this.hasMore.set(response.pagination.hasMore);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading reviews:', error);
        this.errorMessage.set('Failed to load reviews. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  onRatingFilterChange(rating: string): void {
    this.ratingFilter.set(rating);
    this.currentPage.set(1);
    this.loadReviews();
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  clearFilters(): void {
    this.ratingFilter.set('all');
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadReviews();
  }

  openResponseModal(review: ReviewDisplay): void {
    this.selectedReview.set(review);
    this.respondContent.set(review.businessResponse?.content || '');
    this.showResponseModal.set(true);
  }

  closeResponseModal(): void {
    this.showResponseModal.set(false);
    this.selectedReview.set(null);
    this.respondContent.set('');
  }

  submitResponse(): void {
    const review = this.selectedReview();
    if (!review || !this.respondContent().trim()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.businessOwnerService.respondToReview(review.id, this.respondContent()).subscribe({
      next: (response) => {
        this.successMessage.set(response.message || 'Response submitted successfully');
        this.loadReviews();
        this.closeResponseModal();
        this.isSubmitting.set(false);
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (error) => {
        console.error('Error responding to review:', error);
        this.errorMessage.set('Failed to submit response. Please try again.');
        this.isSubmitting.set(false);
      }
    });
  }



  nextPage(): void {
    if (this.hasMore()) {
      this.currentPage.update(page => page + 1);
      this.loadReviews();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.loadReviews();
    }
  }

  getStatusBadgeClass(status: string): string {
    return status === 'responded' ? 'status-responded' : 'status-pending';
  }

  getStatusIcon(status: string): string {
    return status === 'responded' ? '✓' : '⏳';
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

  formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }
}
