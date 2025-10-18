import { Component, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-restaurant-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './restaurant-list.component.html',
  styleUrls: ['./restaurant-list.component.scss']
})
export class RestaurantListComponent {
  searchQuery = signal<string>('');
  selectedCuisine = signal<string>('');
  selectedPriceRange = signal<string>('');

  // Mock data - replace with actual service calls
  restaurants = [
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

  filteredRestaurants = signal(this.restaurants);

  constructor() {
    // Watch for filter changes
    this.updateFilters();
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
    let filtered = this.restaurants;

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
