import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { PublicSpecialistService, SpecialistListItem } from '../../../core/services/public-specialist.service';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, User } from 'lucide-angular';
import { BannerAdComponent } from '../../../shared/components/ads/banner-ad/banner-ad.component';

export type ViewMode = 'grid' | 'list' | 'gallery';

@Component({
  selector: 'app-specialist-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule, BannerAdComponent],
  templateUrl: './specialist-list.component.html',
  styleUrls: ['./specialist-list.component.scss']
})
export class SpecialistListComponent implements OnInit {
  private publicSpecialistService = inject(PublicSpecialistService);

  specialists = signal<SpecialistListItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // View mode
  viewMode = signal<ViewMode>('grid');

  // Pagination
  currentPage = signal(1);
  pageSize = signal(12);
  totalItems = signal(0);

  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));
  paginatedSpecialists = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.specialists().slice(start, end);
  });
  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }
      if (current < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  });

  searchQuery = signal('');
  selectedSpecialty = signal('');
  selectedRating = signal('');
  selectedCountry = signal('');
  selectedCuisine = signal('');
  selectedPriceRange = signal('');

  readonly User = User;
  imageErrors = signal<Set<string>>(new Set());

  onImageError(id: string): void {
    this.imageErrors.update(s => new Set(s).add(id));
  }

  stats = signal({
    totalSpecialists: 0,
    totalReviews: 0,
    avgRating: 0
  });

  pageSizeOptions = [6, 12, 24, 48];

  // These must match the service types in services-management.component.ts
  // and backend/routes/specialist.js GET /api/specialist/service-types
  specialtyTypes = [
    { value: '', label: 'All Specialties' },
    { value: 'private_chef', label: 'Private Chef' },
    { value: 'catering', label: 'Catering' },
    { value: 'cooking_class', label: 'Cooking Class' },
    { value: 'event_catering', label: 'Event Catering' },
    { value: 'meal_prep', label: 'Meal Prep' },
    { value: 'consultation', label: 'Consultation' },
    { value: 'wine_pairing', label: 'Wine Pairing' },
    { value: 'baking', label: 'Baking' },
    { value: 'bbq', label: 'BBQ/Grilling' },
    { value: 'dietary', label: 'Dietary Specialist' }
  ];

  ratingFilters = [
    { value: '', label: 'Any Rating' },
    { value: '4.5', label: '4.5+ Stars' },
    { value: '4', label: '4+ Stars' },
    { value: '3', label: '3+ Stars' }
  ];

  cuisineTypes = [
    { value: '', label: 'All Cuisines' },
    { value: 'italian', label: 'Italian' },
    { value: 'french', label: 'French' },
    { value: 'japanese', label: 'Japanese' },
    { value: 'chinese', label: 'Chinese' },
    { value: 'indian', label: 'Indian' },
    { value: 'mexican', label: 'Mexican' },
    { value: 'thai', label: 'Thai' },
    { value: 'mediterranean', label: 'Mediterranean' },
    { value: 'african', label: 'African' },
    { value: 'american', label: 'American' },
    { value: 'fusion', label: 'Fusion' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'vegetarian', label: 'Vegetarian' }
  ];

  priceRanges = [
    { value: '', label: 'Any Price', min: 0, max: 0 },
    { value: 'budget', label: 'R Budget (Under R1,000)', min: 0, max: 1000 },
    { value: 'moderate', label: 'R Moderate (R1,000-R3,000)', min: 1000, max: 3000 },
    { value: 'premium', label: 'R Premium (R3,000-R5,000)', min: 3000, max: 5000 },
    { value: 'luxury', label: 'R Luxury (R5,000+)', min: 5000, max: 0 }
  ];

  ngOnInit(): void {
    this.loadSpecialists();
  }

  loadSpecialists(): void {
    this.loading.set(true);
    this.error.set(null);

    const params: any = { limit: 50 };
    if (this.selectedSpecialty()) {
      params.specialty = this.selectedSpecialty();
    }
    if (this.selectedRating()) {
      params.minRating = parseFloat(this.selectedRating());
    }
    if (this.selectedCountry()) {
      params.country = this.selectedCountry();
    }
    if (this.selectedCuisine()) {
      params.cuisine = this.selectedCuisine();
    }
    if (this.selectedPriceRange()) {
      const range = this.priceRanges.find(r => r.value === this.selectedPriceRange());
      if (range) {
        if (range.min > 0) params.minPrice = range.min;
        if (range.max > 0) params.maxPrice = range.max;
      }
    }

    this.publicSpecialistService.getSpecialists(params).subscribe({
      next: (response) => {
        let filtered = response.specialists;

        // Client-side search filtering
        if (this.searchQuery()) {
          const query = this.searchQuery().toLowerCase();
          filtered = filtered.filter(s =>
            s.fullName.toLowerCase().includes(query) ||
            s.specialties.some(sp => sp.toLowerCase().includes(query)) ||
            s.services.some(sv => sv.toLowerCase().includes(query)) ||
            s.cuisines?.some(c => c.toLowerCase().includes(query)) ||
            s.location?.country?.toLowerCase().includes(query)
          );
        }

        this.specialists.set(filtered);
        this.totalItems.set(filtered.length);
        this.stats.set({
          totalSpecialists: response.total,
          totalReviews: filtered.reduce((sum, s) => sum + s.reviewCount, 0),
          avgRating: filtered.length > 0
            ? filtered.reduce((sum, s) => sum + s.averageRating, 0) / filtered.length
            : 0
        });
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading specialists:', err);
        this.error.set('Failed to load specialists. Please try again.');
        this.loading.set(false);
      }
    });
  }

  // View mode methods
  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  // Pagination methods
  goToPage(page: number | string): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
    this.loadSpecialists();
  }

  onSpecialtyChange(value: string): void {
    this.selectedSpecialty.set(value);
    this.currentPage.set(1);
    this.loadSpecialists();
  }

  onRatingChange(value: string): void {
    this.selectedRating.set(value);
    this.currentPage.set(1);
    this.loadSpecialists();
  }

  onCountryChange(value: string): void {
    this.selectedCountry.set(value);
    this.currentPage.set(1);
    this.loadSpecialists();
  }

  onCuisineChange(value: string): void {
    this.selectedCuisine.set(value);
    this.currentPage.set(1);
    this.loadSpecialists();
  }

  onPriceRangeChange(value: string): void {
    this.selectedPriceRange.set(value);
    this.currentPage.set(1);
    this.loadSpecialists();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedSpecialty.set('');
    this.selectedRating.set('');
    this.selectedCountry.set('');
    this.selectedCuisine.set('');
    this.selectedPriceRange.set('');
    this.currentPage.set(1);
    this.loadSpecialists();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchQuery() ||
      this.selectedSpecialty() ||
      this.selectedRating() ||
      this.selectedCountry() ||
      this.selectedCuisine() ||
      this.selectedPriceRange()
    );
  }

  getStarRating(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    let stars = '★'.repeat(fullStars);
    if (hasHalf) stars += '½';
    return stars;
  }

  getDefaultAvatar(name: string): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const index = name.charCodeAt(0) % colors.length;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${colors[index].slice(1)}&color=fff&size=200`;
  }

  // Helper for template - Math.min
  minValue(a: number, b: number): number {
    return Math.min(a, b);
  }
}

