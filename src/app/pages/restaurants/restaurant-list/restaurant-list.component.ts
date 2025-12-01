import { Component, signal, inject, OnInit } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PublicBusinessService, PublicBusiness } from '../../../core/services/public-business.service';
import { PublicStatsService } from '../../../core/services/public-stats.service';

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
  imports: [CommonModule, RouterModule, FormsModule],
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

  // Mock data - will be removed after loading real data
  mockRestaurants: Restaurant[] = [
    {
      id: '1',
      name: 'Bella Italia',
      cuisine: 'Italian',
      priceRange: '$$',
      rating: 4.5,
      reviewCount: 127,
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
      address: '123 Main St, Downtown',
      distance: '0.5 miles',
      isOpen: true,
      features: ['Delivery', 'Takeout', 'Dine-in']
    },
    {
      id: '2',
      name: 'Sushi Zen',
      cuisine: 'Japanese',
      priceRange: '$$$',
      rating: 4.7,
      reviewCount: 89,
      image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop',
      address: '456 Oak Ave, Midtown',
      distance: '1.2 miles',
      isOpen: true,
      features: ['Takeout', 'Dine-in']
    },
    {
      id: '3',
      name: 'The Burger Joint',
      cuisine: 'American',
      priceRange: '$',
      rating: 4.2,
      reviewCount: 203,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
      address: '789 Pine St, Uptown',
      distance: '2.1 miles',
      isOpen: false,
      features: ['Delivery', 'Takeout']
    },
    {
      id: '4',
      name: 'Mediterranean Delight',
      cuisine: 'Mediterranean',
      priceRange: '$$',
      rating: 4.4,
      reviewCount: 156,
      image: 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=400&h=300&fit=crop',
      address: '321 Elm St, Downtown',
      distance: '0.8 miles',
      isOpen: true,
      features: ['Delivery', 'Takeout', 'Dine-in', 'Outdoor Seating']
    },
    {
      id: '5',
      name: 'Taco Fiesta',
      cuisine: 'Mexican',
      priceRange: '$',
      rating: 4.3,
      reviewCount: 178,
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
      address: '654 Maple Ave, Southside',
      distance: '1.8 miles',
      isOpen: true,
      features: ['Delivery', 'Takeout', 'Dine-in']
    }
  ];

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
        // Fall back to mock data on error
        this.restaurants.set(this.mockRestaurants);
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
      priceRange: '$$', // Default, could be enhanced with actual pricing data
      rating: 0, // Will be populated when reviews are available
      reviewCount: 0, // Will be populated when reviews are available
      image,
      address: business.address || 'Address not provided',
      distance: 'N/A', // Would need geolocation to calculate
      isOpen,
      features
    };
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
