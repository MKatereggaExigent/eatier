import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, Star, PenLine, Heart, TrendingUp, Search, Sliders, Calendar, UtensilsCrossed, DollarSign, PartyPopper, X, Check, ThumbsUp, ThumbsDown } from 'lucide-angular';
import { ReviewsService, Review, Restaurant, ReviewRequest, ReviewStats, ReviewFilters } from '../../../services/reviews.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-food-enthusiast-reviews',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './food-enthusiast-reviews.component.html',
  styleUrls: ['./food-enthusiast-reviews.component.scss']
})
export class FoodEnthusiastReviewsComponent implements OnInit {
  private reviewsService = inject(ReviewsService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  readonly Star = Star;
  readonly PenLine = PenLine;
  readonly Heart = Heart;
  readonly TrendingUp = TrendingUp;
  readonly Search = Search;
  readonly Sliders = Sliders;
  readonly Calendar = Calendar;
  readonly UtensilsCrossed = UtensilsCrossed;
  readonly DollarSign = DollarSign;
  readonly PartyPopper = PartyPopper;
  readonly X = X;
  readonly Check = Check;
  readonly ThumbsUp = ThumbsUp;
  readonly ThumbsDown = ThumbsDown;

  currentUser = this.authService.currentUser;

  // State management
  isLoading = signal(false);
  reviews = signal<Review[]>([]);
  restaurants = signal<Restaurant[]>([]);
  stats = signal<ReviewStats | null>(null);
  selectedReview = signal<Review | null>(null);

  // UI state
  searchQuery = signal('');
  showFilters = signal(false);
  showNewReviewModal = signal(false);
  showReviewDetailsModal = signal(false);
  showEditReviewModal = signal(false);
  showDeleteConfirmModal = signal(false);

  // Filter and sort options
  filters = signal<ReviewFilters>({
    status: 'all',
    rating: 'all',
    timeRange: 'all',
    cuisine: 'all',
    sortBy: 'newest'
  });

  // Form for new/edit review
  reviewForm: FormGroup;
  selectedRestaurant = signal<Restaurant | null>(null);

  // Available options
  statusOptions = [
    { value: 'all', label: 'All Reviews' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Archived' }
  ];

  ratingOptions = [
    { value: 'all', label: 'All Ratings' },
    { value: '5', label: '5 Stars' },
    { value: '4', label: '4 Stars' },
    { value: '3', label: '3 Stars' },
    { value: '2', label: '2 Stars' },
    { value: '1', label: '1 Star' }
  ];

  timeRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: '3months', label: 'Last 3 Months' },
    { value: 'year', label: 'This Year' }
  ];

  sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'rating_high', label: 'Highest Rating' },
    { value: 'rating_low', label: 'Lowest Rating' },
    { value: 'helpful', label: 'Most Helpful' }
  ];

  ratingStars = [1, 2, 3, 4, 5];
  partySizeOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  constructor() {
    this.reviewForm = this.fb.group({
      restaurantId: ['', Validators.required],
      overallRating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      foodRating: [5, [Validators.min(1), Validators.max(5)]],
      serviceRating: [5, [Validators.min(1), Validators.max(5)]],
      ambianceRating: [5, [Validators.min(1), Validators.max(5)]],
      valueRating: [5, [Validators.min(1), Validators.max(5)]],
      title: [''],
      content: ['', [Validators.required, Validators.minLength(50)]],
      visitDate: [''],
      dishesOrdered: [''],
      pricePaid: ['', [Validators.min(0)]],
      partySize: [2, [Validators.min(1), Validators.max(12)]],
      occasion: [''],
      wouldRecommend: [true]
    });
  }

  // Computed properties
  filteredReviews = computed(() => {
    let filtered = this.reviews();
    const query = this.searchQuery().toLowerCase();
    const currentFilters = this.filters();

    // Search filter
    if (query) {
      filtered = filtered.filter(review =>
        review.restaurant.name.toLowerCase().includes(query) ||
        review.title?.toLowerCase().includes(query) ||
        review.content.toLowerCase().includes(query) ||
        review.restaurant.cuisineTypes.some(cuisine => cuisine.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (currentFilters.status !== 'all') {
      filtered = filtered.filter(review => review.status === currentFilters.status);
    }

    // Rating filter
    if (currentFilters.rating !== 'all') {
      const rating = parseInt(currentFilters.rating);
      filtered = filtered.filter(review => review.overallRating === rating);
    }

    // Time range filter
    if (currentFilters.timeRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter(review => {
        const reviewDate = new Date(review.createdAt);
        switch (currentFilters.timeRange) {
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return reviewDate >= weekAgo;
          case 'month':
            return reviewDate.getMonth() === now.getMonth() && reviewDate.getFullYear() === now.getFullYear();
          case '3months':
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            return reviewDate >= threeMonthsAgo;
          case 'year':
            return reviewDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    // Cuisine filter
    if (currentFilters.cuisine !== 'all') {
      filtered = filtered.filter(review =>
        review.restaurant.cuisineTypes.includes(currentFilters.cuisine)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (currentFilters.sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'rating_high':
          return b.overallRating - a.overallRating;
        case 'rating_low':
          return a.overallRating - b.overallRating;
        case 'helpful':
          return (b.helpfulVotes / Math.max(b.totalVotes, 1)) - (a.helpfulVotes / Math.max(a.totalVotes, 1));
        default:
          return 0;
      }
    });

    return filtered;
  });

  hasActiveFilters = computed(() => {
    const currentFilters = this.filters();
    return currentFilters.status !== 'all' ||
           currentFilters.rating !== 'all' ||
           currentFilters.timeRange !== 'all' ||
           currentFilters.cuisine !== 'all' ||
           this.searchQuery().length > 0;
  });

  availableCuisines = computed(() => {
    const cuisines = new Set<string>();
    this.reviews().forEach(review => {
      review.restaurant.cuisineTypes.forEach(cuisine => cuisines.add(cuisine));
    });
    return Array.from(cuisines).sort();
  });

  ngOnInit() {
    this.loadReviews();
    this.loadRestaurants();
    this.loadStats();
  }

  // Data loading methods
  loadReviews(): void {
    this.isLoading.set(true);
    this.reviewsService.getReviews().subscribe({
      next: (reviews) => {
        this.reviews.set(reviews);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading reviews:', error);
        this.isLoading.set(false);
      }
    });
  }

  loadRestaurants(): void {
    this.reviewsService.getRestaurants().subscribe({
      next: (restaurants) => {
        this.restaurants.set(restaurants);
      },
      error: (error) => {
        console.error('Error loading restaurants:', error);
      }
    });
  }

  loadStats(): void {
    this.reviewsService.getReviewStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
      },
      error: (error) => {
        console.error('Error loading stats:', error);
      }
    });
  }

  // UI interaction methods
  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  clearFilters(): void {
    this.filters.set({
      status: 'all',
      rating: 'all',
      timeRange: 'all',
      cuisine: 'all',
      sortBy: 'newest'
    });
    this.searchQuery.set('');
  }

  updateFilter(key: keyof ReviewFilters, value: string): void {
    this.filters.update(current => ({ ...current, [key]: value }));
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  onFilterChange(key: keyof ReviewFilters, event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.updateFilter(key, target.value);
  }

  // Review actions
  openNewReviewModal(): void {
    this.showNewReviewModal.set(true);
    this.resetReviewForm();
  }

  closeNewReviewModal(): void {
    this.showNewReviewModal.set(false);
    this.selectedRestaurant.set(null);
  }

  openReviewDetails(review: Review): void {
    this.selectedReview.set(review);
    this.showReviewDetailsModal.set(true);
  }

  closeReviewDetails(): void {
    this.selectedReview.set(null);
    this.showReviewDetailsModal.set(false);
  }

  openEditReview(review: Review): void {
    this.selectedReview.set(review);
    this.populateReviewForm(review);
    this.showEditReviewModal.set(true);
  }

  closeEditReview(): void {
    this.selectedReview.set(null);
    this.showEditReviewModal.set(false);
  }

  openDeleteConfirm(review: Review): void {
    this.selectedReview.set(review);
    this.showDeleteConfirmModal.set(true);
  }

  closeDeleteConfirm(): void {
    this.selectedReview.set(null);
    this.showDeleteConfirmModal.set(false);
  }

  // Form methods
  resetReviewForm(): void {
    this.reviewForm.reset({
      overallRating: 5,
      foodRating: 5,
      serviceRating: 5,
      ambianceRating: 5,
      valueRating: 5,
      partySize: 2,
      wouldRecommend: true
    });
  }

  populateReviewForm(review: Review): void {
    this.reviewForm.patchValue({
      restaurantId: review.restaurantId,
      overallRating: review.overallRating,
      foodRating: review.foodRating,
      serviceRating: review.serviceRating,
      ambianceRating: review.ambianceRating,
      valueRating: review.valueRating,
      title: review.title,
      content: review.content,
      visitDate: review.visitDate ? review.visitDate.toISOString().split('T')[0] : '',
      dishesOrdered: review.dishesOrdered.join(', '),
      pricePaid: review.pricePaid,
      partySize: review.partySize,
      occasion: review.occasion,
      wouldRecommend: review.wouldRecommend
    });
  }

  onRestaurantChange(): void {
    const restaurantId = this.reviewForm.get('restaurantId')?.value;
    if (restaurantId) {
      const restaurant = this.restaurants().find(r => r.id === restaurantId);
      this.selectedRestaurant.set(restaurant || null);
    }
  }

  markFormTouched(): void {
    Object.keys(this.reviewForm.controls).forEach(key => {
      this.reviewForm.get(key)?.markAsTouched();
    });
  }

  createReview(): void {
    if (this.reviewForm.valid) {
      const formValue = this.reviewForm.value;
      const reviewRequest: ReviewRequest = {
        restaurantId: formValue.restaurantId,
        overallRating: formValue.overallRating,
        foodRating: formValue.foodRating,
        serviceRating: formValue.serviceRating,
        ambianceRating: formValue.ambianceRating,
        valueRating: formValue.valueRating,
        title: formValue.title,
        content: formValue.content,
        visitDate: formValue.visitDate,
        dishesOrdered: formValue.dishesOrdered ? formValue.dishesOrdered.split(',').map((d: string) => d.trim()) : [],
        pricePaid: formValue.pricePaid,
        partySize: formValue.partySize,
        occasion: formValue.occasion,
        wouldRecommend: formValue.wouldRecommend
      };

      this.isLoading.set(true);
      this.reviewsService.createReview(reviewRequest).subscribe({
        next: (review) => {
          console.log('Review created successfully:', review);
          this.loadReviews();
          this.loadStats();
          this.closeNewReviewModal();
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error creating review:', error);
          this.isLoading.set(false);
        }
      });
    }
  }

  updateReview(): void {
    const review = this.selectedReview();
    if (this.reviewForm.valid && review) {
      const formValue = this.reviewForm.value;
      const updates: Partial<ReviewRequest> = {
        overallRating: formValue.overallRating,
        foodRating: formValue.foodRating,
        serviceRating: formValue.serviceRating,
        ambianceRating: formValue.ambianceRating,
        valueRating: formValue.valueRating,
        title: formValue.title,
        content: formValue.content,
        visitDate: formValue.visitDate,
        dishesOrdered: formValue.dishesOrdered ? formValue.dishesOrdered.split(',').map((d: string) => d.trim()) : [],
        pricePaid: formValue.pricePaid,
        partySize: formValue.partySize,
        occasion: formValue.occasion,
        wouldRecommend: formValue.wouldRecommend
      };

      this.isLoading.set(true);
      const { photos, ...updateData } = updates;
      this.reviewsService.updateReview(review.id, {
        ...updateData,
        visitDate: updateData.visitDate ? new Date(updateData.visitDate) : undefined
      }).subscribe({
        next: (success) => {
          if (success) {
            console.log('Review updated successfully');
            this.loadReviews();
            this.loadStats();
          }
          this.closeEditReview();
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error updating review:', error);
          this.isLoading.set(false);
        }
      });
    }
  }

  deleteReview(): void {
    const review = this.selectedReview();
    if (review) {
      this.isLoading.set(true);
      this.reviewsService.deleteReview(review.id).subscribe({
        next: (success) => {
          if (success) {
            console.log('Review deleted successfully');
            this.loadReviews();
            this.loadStats();
          }
          this.closeDeleteConfirm();
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error deleting review:', error);
          this.isLoading.set(false);
        }
      });
    }
  }

  voteOnReview(reviewId: string, isHelpful: boolean): void {
    this.reviewsService.voteOnReview(reviewId, isHelpful).subscribe({
      next: (success) => {
        if (success) {
          this.loadReviews();
        }
      },
      error: (error) => {
        console.error('Error voting on review:', error);
      }
    });
  }

  // Utility methods
  getStarArray(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < rating);
  }

  getRatingColor(rating: number): string {
    if (rating >= 4.5) return 'excellent';
    if (rating >= 4) return 'good';
    if (rating >= 3) return 'average';
    if (rating >= 2) return 'poor';
    return 'terrible';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  canEdit(review: Review): boolean {
    return review.status === 'draft' || review.status === 'published';
  }

  canDelete(review: Review): boolean {
    return true;
  }
}
