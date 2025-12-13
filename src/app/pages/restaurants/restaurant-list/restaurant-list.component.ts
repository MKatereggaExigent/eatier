import { Component, OnInit, inject, signal } from '@angular/core';
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

  cuisineTypes = [
    'All Cuisines',
    'Italian',
    'Japanese',
    'American',
    'Mediterranean',
    'Mexican',
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

  ngOnInit(): void {
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

        // Update cuisines from real data
        const uniqueCuisines = new Set(restaurants.map(r => r.cuisine));
        this.cuisineTypes = ['All Cuisines', ...Array.from(uniqueCuisines).sort()];
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

    return {
      id: business.id,
      name: business.businessName,
      cuisine: business.businessType,
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
}
