import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { PublicBusiness, PublicBusinessService } from '../../../core/services/public-business.service';

import { BannerAdComponent } from '../../../shared/components/ads/banner-ad/banner-ad.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicStatsService } from '../../../core/services/public-stats.service';
import { RouterModule } from '@angular/router';

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  priceRange: string;
  rating: number;
  reviewCount: number;
  image: string;
  address: string;
  distance: string;
  isOpen: boolean;
  features: string[];
}

@Component({
  selector: 'app-restaurant-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    BannerAdComponent
  ],
  templateUrl: './restaurant-list.component.html',
  styleUrls: ['./restaurant-list.component.scss']
})
export class RestaurantListComponent implements OnInit {
  private publicBusinessService = inject(PublicBusinessService);
  private publicStatsService = inject(PublicStatsService);

  searchQuery = signal<string>('');
  selectedCuisine = signal<string>('');
  selectedPriceRange = signal<string>('');

  restaurants = signal<Restaurant[]>([]);
  stats = signal({
    restaurants: 0,
    cuisines: 0,
    reviews: 0,
    avgRating: 0
  });

  // Error state for when API fails
  loadError = signal<string | null>(null);

  // Standard cuisine types - same as specialists page
  cuisineTypes = [
    'All Cuisines',
    'Italian',
    'French',
    'Japanese',
    'Chinese',
    'Indian',
    'Mexican',
    'Thai',
    'Mediterranean',
    'African',
    'American',
    'Fusion',
    'Vegan',
    'Vegetarian',
    'Seafood',
    'Steakhouse',
    'BBQ',
    'Sushi',
    'Pizza',
    'Burgers',
    'Fine Dining',
    'Casual Dining',
    'Fast Food',
    'Cafe',
    'Bakery',
    'Desserts',
    'Chinese',
    'Indian',
    'Thai',
    'French'
  ];

  priceRanges = [
    { label: 'All Prices', value: '' },
    { label: 'Budget ($)', value: '$' },
    { label: 'Moderate ($$)', value: '$$' },
    { label: 'Expensive ($$$)', value: '$$$' },
    { label: 'Fine Dining ($$$$)', value: '$$$$' }
  ];

  filteredRestaurants = signal<Restaurant[]>([]);

  // Pagination signals
  currentPage = signal<number>(1);
  pageSize = signal<number>(6);
  pageSizeOptions = [6, 12, 24, 48];

  // Computed: paginated restaurants
  paginatedRestaurants = computed(() => {
    const items = this.filteredRestaurants();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    const end = start + size;
    return items.slice(start, end);
  });

  // Computed: total pages
  totalPages = computed(() => {
    return Math.ceil(this.filteredRestaurants().length / this.pageSize());
  });

  // Track favorite restaurants (stored in localStorage)
  favorites = signal<Set<string>>(new Set());

  ngOnInit(): void {
    // Load favorites from localStorage
    this.loadFavorites();
    this.loadRestaurants();
    this.loadStatistics();
  }

  loadRestaurants(): void {
    this.loadError.set(null);
    this.publicBusinessService.getBusinesses({ limit: 100 }).subscribe({
      next: (response) => {
        const restaurants = response.businesses.map(business => this.mapBusinessToRestaurant(business));
        this.restaurants.set(restaurants);
        this.updateFilters();
        // Keep standard cuisine types - don't override with business types
      },
      error: (error) => {
        console.error('Error loading restaurants:', error);
        this.loadError.set('Unable to load restaurants. Please try again later.');
        this.restaurants.set([]);
        this.updateFilters();
      }
    });
  }

  loadStatistics(): void {
    this.publicStatsService.getStatistics().subscribe({
      next: (data) => {
        this.stats.set({
          restaurants: data.restaurants,
          cuisines: 0, // Will be calculated from loaded restaurants
          reviews: data.reviews,
          avgRating: 0 // Will be calculated when reviews exist
        });
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  private mapBusinessToRestaurant(business: PublicBusiness): Restaurant {
    // Get primary photo or use placeholder
    const image = business.profilePhotos && business.profilePhotos.length > 0
      ? business.profilePhotos[0]
      : 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop';

    // Determine if open based on current time and business hours
    const isOpen = this.isBusinessOpen(business.opensAt, business.closesAt);

    // Map facilities to features
    const features = business.facilities || [];

    // Get primary cuisine from cuisineTypes array, or fallback to businessType display
    const cuisine = business.cuisineTypes && business.cuisineTypes.length > 0
      ? business.cuisineTypes[0] // Use first cuisine type
      : this.formatBusinessType(business.businessType); // Fallback to formatted business type

    return {
      id: business.id,
      name: business.businessName,
      cuisine,
      priceRange: this.convertPriceRangeToSymbol(business.priceRange), // Auto-calculated from menu prices
      rating: 0, // Will be populated when reviews are available
      reviewCount: 0, // Will be populated when reviews are available
      image,
      address: business.address || 'Address not provided',
      distance: 'N/A', // Would need geolocation to calculate
      isOpen,
      features
    };
  }

  /**
   * Format business type for display (e.g., 'food_truck' -> 'Food Truck')
   */
  private formatBusinessType(businessType?: string): string {
    if (!businessType) return 'Restaurant';
    return businessType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Convert price range tier to display symbols
   * Based on industry standards (Yelp, Google, OpenTable)
   */
  private convertPriceRangeToSymbol(priceRange?: string): string {
    const priceMap: { [key: string]: string } = {
      'budget': '$',      // $0-15 average
      'moderate': '$$',   // $16-30 average
      'expensive': '$$$', // $31-60 average
      'luxury': '$$$$'    // $61+ average
    };
    return priceMap[priceRange || 'moderate'] || '$$';
  }

  private isBusinessOpen(opensAt?: string, closesAt?: string): boolean {
    if (!opensAt || !closesAt) return true; // Assume open if hours not set

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [openHour, openMin] = opensAt.split(':').map(Number);
    const [closeHour, closeMin] = closesAt.split(':').map(Number);

    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;

    return currentTime >= openTime && currentTime <= closeTime;
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.updateFilters();
  }

  onCuisineChange(cuisine: string): void {
    this.selectedCuisine.set(cuisine);
    this.updateFilters();
  }

  onPriceRangeChange(priceRange: string): void {
    this.selectedPriceRange.set(priceRange);
    this.updateFilters();
  }

  private updateFilters(): void {
    let filtered = this.restaurants();

    // Filter by search query
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(restaurant =>
        restaurant.name.toLowerCase().includes(query) ||
        restaurant.cuisine.toLowerCase().includes(query) ||
        restaurant.address.toLowerCase().includes(query)
      );
    }

    // Filter by cuisine
    const cuisine = this.selectedCuisine();
    if (cuisine && cuisine !== 'All Cuisines') {
      filtered = filtered.filter(restaurant =>
        restaurant.cuisine === cuisine
      );
    }

    // Filter by price range
    const priceRange = this.selectedPriceRange();
    if (priceRange) {
      filtered = filtered.filter(restaurant =>
        restaurant.priceRange === priceRange
      );
    }

    this.filteredRestaurants.set(filtered);
    // Reset to first page when filters change
    this.currentPage.set(1);
  }

  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < Math.floor(rating));
  }

  getStatusText(isOpen: boolean): string {
    return isOpen ? 'Open now' : 'Closed';
  }

  getStatusClass(isOpen: boolean): string {
    return isOpen ? 'open' : 'closed';
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.selectedCuisine.set('');
    this.selectedPriceRange.set('');
    this.updateFilters();
  }

  // ==================== PAGINATION FUNCTIONALITY ====================

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      // Scroll to top of restaurant grid
      this.scrollToGrid();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.scrollToGrid();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.scrollToGrid();
    }
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1); // Reset to first page
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    // Show max 5 pages at a time
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);
    start = Math.max(1, end - 4);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  private scrollToGrid(): void {
    const grid = document.querySelector('.restaurant-grid');
    if (grid) {
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ==================== FAVORITES FUNCTIONALITY ====================

  private loadFavorites(): void {
    try {
      const stored = localStorage.getItem('itiyum_favorites');
      if (stored) {
        this.favorites.set(new Set(JSON.parse(stored)));
      }
    } catch {
      this.favorites.set(new Set());
    }
  }

  private saveFavorites(): void {
    try {
      localStorage.setItem('itiyum_favorites', JSON.stringify([...this.favorites()]));
    } catch {
      console.error('Failed to save favorites to localStorage');
    }
  }

  isFavorite(restaurantId: string): boolean {
    return this.favorites().has(restaurantId);
  }

  toggleFavorite(event: Event, restaurant: Restaurant): void {
    event.preventDefault();
    event.stopPropagation();

    const current = this.favorites();
    const newFavorites = new Set(current);

    if (newFavorites.has(restaurant.id)) {
      newFavorites.delete(restaurant.id);
    } else {
      newFavorites.add(restaurant.id);
    }

    this.favorites.set(newFavorites);
    this.saveFavorites();
  }

  // ==================== SHARE FUNCTIONALITY ====================

  shareRestaurant(event: Event, restaurant: Restaurant): void {
    event.preventDefault();
    event.stopPropagation();

    const url = `${window.location.origin}/restaurants/${restaurant.id}`;
    const text = `Check out ${restaurant.name} on iTiYum!`;

    // Use native share if available
    if (navigator.share) {
      navigator.share({
        title: restaurant.name,
        text: text,
        url: url
      }).catch(err => {
        // User cancelled or share failed, fallback to clipboard
        this.copyToClipboard(url);
      });
    } else {
      // Fallback: copy link to clipboard
      this.copyToClipboard(url);
    }
  }

  private copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Show a brief notification (could be replaced with a toast)
      alert('Link copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Link copied to clipboard!');
    });
  }

  // ==================== DIRECTIONS FUNCTIONALITY ====================

  getDirections(event: Event, restaurant: Restaurant): void {
    event.preventDefault();
    event.stopPropagation();

    const address = encodeURIComponent(restaurant.address);
    window.open(`https://maps.google.com?q=${address}`, '_blank');
  }
}
