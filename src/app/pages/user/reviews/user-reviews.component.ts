import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, of, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

interface Review {
  id: string;
  businessId: string;
  businessName: string;
  businessType?: string;
  rating: number;
  foodRating?: number;
  serviceRating?: number;
  ambianceRating?: number;
  valueRating?: number;
  title: string;
  comment: string;
  images: string[];
  visitDate: string;
  createdAt: string;
  updatedAt: string;
  helpfulCount: number;
  notHelpfulCount: number;
  wouldRecommend: boolean;
  status: 'draft' | 'published' | 'flagged' | 'archived';
}

interface Business {
  id: string;
  businessName: string;
  businessType: string;
  profilePhotos?: string[];
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  helpfulVotes: number;
}

interface FilterOptions {
  status: 'all' | 'published' | 'draft' | 'archived';
  rating: 'all' | '5' | '4' | '3' | '2' | '1';
  timeRange: 'all' | 'week' | 'month' | '3months' | 'year';
  cuisine: string;
  sortBy: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful';
}

interface NewReviewForm {
  businessId: string;
  overallRating: number;
  foodRating: number;
  serviceRating: number;
  ambianceRating: number;
  valueRating: number;
  title: string;
  comment: string;
  visitDate: string;
  wouldRecommend: boolean;
}

@Component({
  selector: 'app-user-reviews',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './user-reviews.component.html',
  styleUrls: ['./user-reviews.component.scss']
})
export class UserReviewsComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();
  private businessSearch$ = new Subject<string>();

  currentUser = this.authService.currentUser;

  // State management
  isLoading = signal(false);
  error = signal<string | null>(null);
  selectedReview = signal<Review | null>(null);
  showNewReviewModal = signal(false);
  showEditModal = signal(false);
  showDeleteConfirm = signal(false);
  deleting = signal(false);
  submittingReview = signal(false);

  // Business search for new review
  businessSearchQuery = signal('');
  businessSearchResults = signal<Business[]>([]);
  searchingBusinesses = signal(false);
  selectedBusiness = signal<Business | null>(null);

  // New review form
  newReviewForm = signal<NewReviewForm>({
    businessId: '',
    overallRating: 0,
    foodRating: 0,
    serviceRating: 0,
    ambianceRating: 0,
    valueRating: 0,
    title: '',
    comment: '',
    visitDate: '',
    wouldRecommend: true
  });

  // Edit review form
  editReviewForm = signal<NewReviewForm>({
    businessId: '',
    overallRating: 0,
    foodRating: 0,
    serviceRating: 0,
    ambianceRating: 0,
    valueRating: 0,
    title: '',
    comment: '',
    visitDate: '',
    wouldRecommend: true
  });

  // Star rating helper
  ratingStars = [1, 2, 3, 4, 5];
  today = new Date().toISOString().split('T')[0];

  // Filter and search
  searchQuery = signal('');
  filters = signal<FilterOptions>({
    status: 'all',
    rating: 'all',
    timeRange: 'all',
    cuisine: '',
    sortBy: 'newest'
  });

  // Data from API
  reviews = signal<Review[]>([]);
  reviewStats = signal<ReviewStats>({
    totalReviews: 0,
    averageRating: 0,
    helpfulVotes: 0
  });

  ngOnInit(): void {
    this.loadReviews();
    this.setupBusinessSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupBusinessSearch(): void {
    this.businessSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
      switchMap(query => {
        if (!query || query.length < 2) {
          return of({ businesses: [] });
        }
        this.searchingBusinesses.set(true);
        return this.http.get<any>(`${environment.apiUrl}/businesses`, {
          params: { limit: '10' }
        }).pipe(
          catchError(() => of({ businesses: [] }))
        );
      })
    ).subscribe(response => {
      const query = this.businessSearchQuery().toLowerCase();
      const filtered = (response.businesses || []).filter((b: Business) =>
        b.businessName.toLowerCase().includes(query)
      );
      this.businessSearchResults.set(filtered);
      this.searchingBusinesses.set(false);
    });
  }

  onBusinessSearch(query: string): void {
    this.businessSearchQuery.set(query);
    this.businessSearch$.next(query);
  }

  selectBusiness(business: Business): void {
    this.selectedBusiness.set(business);
    this.newReviewForm.update(form => ({ ...form, businessId: business.id }));
    this.businessSearchResults.set([]);
    this.businessSearchQuery.set(business.businessName);
  }

  loadReviews(): void {
    const userId = this.currentUser()?.id || localStorage.getItem('user_id') || 'temp-user';
    this.isLoading.set(true);
    this.error.set(null);

    const status = this.filters().status !== 'all' ? this.filters().status : undefined;

    this.http.get<any>(`${environment.apiUrl}/reviews/user/${userId}`, {
      params: status ? { status } : {}
    })
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Error loading reviews:', err);
          this.error.set('Failed to load reviews');
          return of({ reviews: [], stats: { totalReviews: 0, averageRating: 0, helpfulVotes: 0 } });
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe(response => {
        // Map snake_case from backend to camelCase for frontend
        const mappedReviews = (response.reviews || []).map((r: any) => ({
          id: r.id,
          businessId: r.business_id,
          businessName: r.business_name,
          businessType: r.business_type,
          rating: r.overall_rating || r.rating,
          foodRating: r.food_rating,
          serviceRating: r.service_rating,
          ambianceRating: r.ambiance_rating,
          valueRating: r.value_rating,
          title: r.title || '',
          comment: r.content || r.comment || '',
          images: r.images || r.photos || [],
          visitDate: r.visit_date,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          helpfulCount: r.helpful_votes || 0,
          notHelpfulCount: 0,
          wouldRecommend: r.would_recommend !== false,
          status: r.status || 'published'
        }));
        this.reviews.set(mappedReviews);
        this.reviewStats.set(response.stats || { totalReviews: 0, averageRating: 0, helpfulVotes: 0 });
      });
  }

  // Computed properties
  filteredReviews = computed(() => {
    let filtered = [...this.reviews()];
    const query = this.searchQuery().toLowerCase();
    const currentFilters = this.filters();

    // Search filter
    if (query) {
      filtered = filtered.filter(review =>
        review.businessName.toLowerCase().includes(query) ||
        review.title.toLowerCase().includes(query) ||
        review.comment.toLowerCase().includes(query)
      );
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

      filtered = filtered.filter(review => new Date(review.createdAt) >= cutoffDate);
    }

    // Sort
    switch (currentFilters.sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'rating_high':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'rating_low':
        filtered.sort((a, b) => a.rating - b.rating);
        break;
      case 'helpful':
        filtered.sort((a, b) => b.helpfulCount - a.helpfulCount);
        break;
    }

    return filtered;
  });

  // Action methods
  openNewReviewModal(): void {
    this.resetNewReviewForm();
    this.showNewReviewModal.set(true);
  }

  closeNewReviewModal(): void {
    this.showNewReviewModal.set(false);
    this.resetNewReviewForm();
  }

  resetNewReviewForm(): void {
    this.newReviewForm.set({
      businessId: '',
      overallRating: 0,
      foodRating: 0,
      serviceRating: 0,
      ambianceRating: 0,
      valueRating: 0,
      title: '',
      comment: '',
      visitDate: '',
      wouldRecommend: true
    });
    this.selectedBusiness.set(null);
    this.businessSearchQuery.set('');
    this.businessSearchResults.set([]);
  }

  updateNewReviewField(field: keyof NewReviewForm, value: any): void {
    this.newReviewForm.update(form => ({ ...form, [field]: value }));
  }

  setNewReviewRating(field: 'overallRating' | 'foodRating' | 'serviceRating' | 'ambianceRating' | 'valueRating', rating: number): void {
    this.newReviewForm.update(form => ({ ...form, [field]: rating }));
  }

  submitNewReview(): void {
    const form = this.newReviewForm();
    const userId = this.currentUser()?.id || localStorage.getItem('user_id');

    if (!form.businessId || !form.overallRating || !form.comment || !userId) {
      this.error.set('Please fill in all required fields');
      return;
    }

    this.submittingReview.set(true);
    this.error.set(null);

    this.http.post(`${environment.apiUrl}/reviews`, {
      userId,
      businessId: form.businessId,
      overallRating: form.overallRating,
      foodRating: form.foodRating || null,
      serviceRating: form.serviceRating || null,
      ambianceRating: form.ambianceRating || null,
      valueRating: form.valueRating || null,
      title: form.title,
      comment: form.comment,
      visitDate: form.visitDate || null,
      wouldRecommend: form.wouldRecommend,
      status: 'published'
    }).pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('Error submitting review:', err);
        this.error.set(err.error?.error || 'Failed to submit review');
        return of(null);
      }),
      finalize(() => this.submittingReview.set(false))
    ).subscribe(response => {
      if (response) {
        this.loadReviews();
        this.closeNewReviewModal();
      }
    });
  }

  editReview(review: Review): void {
    this.selectedReview.set(review);
    this.editReviewForm.set({
      businessId: review.businessId,
      overallRating: review.rating,
      foodRating: review.foodRating || 0,
      serviceRating: review.serviceRating || 0,
      ambianceRating: review.ambianceRating || 0,
      valueRating: review.valueRating || 0,
      title: review.title,
      comment: review.comment,
      visitDate: review.visitDate ? review.visitDate.split('T')[0] : '',
      wouldRecommend: review.wouldRecommend
    });
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.selectedReview.set(null);
    this.showEditModal.set(false);
  }

  updateEditReviewField(field: keyof NewReviewForm, value: any): void {
    this.editReviewForm.update(form => ({ ...form, [field]: value }));
  }

  setEditReviewRating(field: 'overallRating' | 'foodRating' | 'serviceRating' | 'ambianceRating' | 'valueRating', rating: number): void {
    this.editReviewForm.update(form => ({ ...form, [field]: rating }));
  }

  submitEditReview(): void {
    const review = this.selectedReview();
    const form = this.editReviewForm();
    const userId = this.currentUser()?.id || localStorage.getItem('user_id');

    if (!review || !form.overallRating || !form.comment || !userId) {
      this.error.set('Please fill in all required fields');
      return;
    }

    this.submittingReview.set(true);
    this.error.set(null);

    this.http.put(`${environment.apiUrl}/reviews/${review.id}`, {
      userId,
      overallRating: form.overallRating,
      foodRating: form.foodRating || null,
      serviceRating: form.serviceRating || null,
      ambianceRating: form.ambianceRating || null,
      valueRating: form.valueRating || null,
      title: form.title,
      comment: form.comment,
      visitDate: form.visitDate || null,
      wouldRecommend: form.wouldRecommend
    }).pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('Error updating review:', err);
        this.error.set(err.error?.error || 'Failed to update review');
        return of(null);
      }),
      finalize(() => this.submittingReview.set(false))
    ).subscribe(response => {
      if (response) {
        this.loadReviews();
        this.closeEditModal();
      }
    });
  }

  deleteReview(reviewId: string): void {
    this.selectedReview.set(this.reviews().find(r => r.id === reviewId) || null);
    this.showDeleteConfirm.set(true);
  }

  confirmDelete(): void {
    const reviewToDelete = this.selectedReview();
    if (!reviewToDelete) return;

    const userId = this.currentUser()?.id || localStorage.getItem('user_id');
    this.deleting.set(true);

    this.http.delete(`${environment.apiUrl}/reviews/${reviewToDelete.id}`, {
      params: { userId: userId || '' }
    })
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Error deleting review:', err);
          this.error.set('Failed to delete review');
          return of(null);
        }),
        finalize(() => this.deleting.set(false))
      )
      .subscribe(response => {
        if (response !== null) {
          this.loadReviews();
          this.showDeleteConfirm.set(false);
          this.selectedReview.set(null);
        }
      });
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.selectedReview.set(null);
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

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
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
