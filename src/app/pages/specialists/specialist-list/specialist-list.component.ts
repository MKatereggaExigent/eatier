import { Component, OnInit, inject, signal } from '@angular/core';
import { PublicSpecialistService, SpecialistListItem } from '../../../core/services/public-specialist.service';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-specialist-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './specialist-list.component.html',
  styleUrls: ['./specialist-list.component.scss']
})
export class SpecialistListComponent implements OnInit {
  private publicSpecialistService = inject(PublicSpecialistService);

  specialists = signal<SpecialistListItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  searchQuery = signal('');
  selectedSpecialty = signal('');
  selectedRating = signal('');
  selectedCountry = signal('');
  selectedCuisine = signal('');
  selectedPriceRange = signal('');

  stats = signal({
    totalSpecialists: 0,
    totalReviews: 0,
    avgRating: 0
  });

  specialtyTypes = [
    'All Specialties',
    'Private Chef',
    'Catering',
    'Cooking Class',
    'Event Catering',
    'Meal Prep',
    'BBQ & Grilling',
    'Consultation',
    'Event Service'
  ];

  ratingFilters = [
    { value: '', label: 'Any Rating' },
    { value: '4.5', label: '4.5+ Stars' },
    { value: '4', label: '4+ Stars' },
    { value: '3', label: '3+ Stars' }
  ];

  cuisineTypes = [
    { value: '', label: 'All Cuisines' },
    { value: 'italian', label: '🍝 Italian' },
    { value: 'french', label: '🥐 French' },
    { value: 'japanese', label: '🍣 Japanese' },
    { value: 'chinese', label: '🥡 Chinese' },
    { value: 'indian', label: '🍛 Indian' },
    { value: 'mexican', label: '🌮 Mexican' },
    { value: 'thai', label: '🍜 Thai' },
    { value: 'mediterranean', label: '🫒 Mediterranean' },
    { value: 'african', label: '🍲 African' },
    { value: 'american', label: '🍔 American' },
    { value: 'fusion', label: '🍱 Fusion' },
    { value: 'vegan', label: '🥗 Vegan' },
    { value: 'vegetarian', label: '🥬 Vegetarian' }
  ];

  priceRanges = [
    { value: '', label: 'Any Price', min: 0, max: 0 },
    { value: 'budget', label: '$ Budget (Under $100)', min: 0, max: 100 },
    { value: 'moderate', label: '$$ Moderate ($100-$300)', min: 100, max: 300 },
    { value: 'premium', label: '$$$ Premium ($300-$500)', min: 300, max: 500 },
    { value: 'luxury', label: '$$$$ Luxury ($500+)', min: 500, max: 0 }
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

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.loadSpecialists();
  }

  onSpecialtyChange(value: string): void {
    this.selectedSpecialty.set(value);
    this.loadSpecialists();
  }

  onRatingChange(value: string): void {
    this.selectedRating.set(value);
    this.loadSpecialists();
  }

  onCountryChange(value: string): void {
    this.selectedCountry.set(value);
    this.loadSpecialists();
  }

  onCuisineChange(value: string): void {
    this.selectedCuisine.set(value);
    this.loadSpecialists();
  }

  onPriceRangeChange(value: string): void {
    this.selectedPriceRange.set(value);
    this.loadSpecialists();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedSpecialty.set('');
    this.selectedRating.set('');
    this.selectedCountry.set('');
    this.selectedCuisine.set('');
    this.selectedPriceRange.set('');
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
}

