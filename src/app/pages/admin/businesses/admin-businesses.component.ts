import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

export interface AdminBusiness {
  id: string;
  name: string;
  email: string;
  ownerName: string;
  businessType: 'restaurant' | 'cafe' | 'bar' | 'food_truck' | 'catering';
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled';
  createdAt: Date;
  lastLoginAt?: Date;
  verified: boolean;
  address: string;
  city: string;
  state: string;
  phone?: string;
  website?: string;
  cuisineTypes: string[];
  averageRating: number;
  totalReviews: number;
  totalBookings: number;
  monthlyRevenue?: number;
}

export interface BusinessFilters {
  businessType: 'all' | 'restaurant' | 'cafe' | 'bar' | 'food_truck' | 'catering';
  status: 'all' | 'active' | 'inactive' | 'suspended' | 'pending_verification';
  subscription: 'all' | 'trial' | 'active' | 'expired' | 'cancelled';
  verification: 'all' | 'verified' | 'unverified';
  sortBy: 'newest' | 'oldest' | 'name' | 'rating' | 'bookings';
}

@Component({
  selector: 'app-admin-businesses',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="admin-businesses" role="main" aria-label="Admin Businesses Management">
      <header class="businesses-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              <span class="title-icon">🏪</span>
              Business Management
            </h1>
            <p class="page-subtitle">
              Manage all platform businesses, monitor performance, and handle business accounts
            </p>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">🏪</div>
            <div class="stat-content">
              <div class="stat-number">{{ businessStats().total }}</div>
              <div class="stat-label">Total Businesses</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <div class="stat-number">{{ businessStats().active }}</div>
              <div class="stat-label">Active</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">🔐</div>
            <div class="stat-content">
              <div class="stat-number">{{ businessStats().verified }}</div>
              <div class="stat-label">Verified</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">🍽️</div>
            <div class="stat-content">
              <div class="stat-number">{{ businessStats().restaurants }}</div>
              <div class="stat-label">Restaurants</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">📅</div>
            <div class="stat-content">
              <div class="stat-number">{{ businessStats().totalBookings }}</div>
              <div class="stat-label">Total Bookings</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">⭐</div>
            <div class="stat-content">
              <div class="stat-number">{{ businessStats().averageRating.toFixed(1) }}</div>
              <div class="stat-label">Avg Rating</div>
            </div>
          </div>
        </div>
      </header>

      <div class="coming-soon">
        <div class="coming-soon-icon">🚧</div>
        <h2>Business Management Coming Soon</h2>
        <p>Advanced business management features are under development.</p>
        <p>This will include:</p>
        <ul>
          <li>View and manage all platform businesses</li>
          <li>Business verification and approval</li>
          <li>Monitor business performance</li>
          <li>Handle business disputes</li>
          <li>Business analytics and insights</li>
        </ul>
      </div>
    </div>
  `,
  styleUrls: ['./admin-businesses.component.scss']
})
export class AdminBusinessesComponent implements OnInit {
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;

  // State management
  isLoading = signal(false);
  businesses = signal<AdminBusiness[]>([]);
  selectedBusiness = signal<AdminBusiness | null>(null);

  // UI state
  searchQuery = signal('');
  showFilters = signal(false);
  showBusinessModal = signal(false);
  showDeleteConfirm = signal(false);

  // Filter options
  filters = signal<BusinessFilters>({
    businessType: 'all',
    status: 'all',
    subscription: 'all',
    verification: 'all',
    sortBy: 'newest'
  });

  // Available options
  businessTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'cafe', label: 'Cafe' },
    { value: 'bar', label: 'Bar' },
    { value: 'food_truck', label: 'Food Truck' },
    { value: 'catering', label: 'Catering' }
  ];

  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'pending_verification', label: 'Pending Verification' }
  ];

  subscriptionOptions = [
    { value: 'all', label: 'All Subscriptions' },
    { value: 'trial', label: 'Trial' },
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  verificationOptions = [
    { value: 'all', label: 'All Businesses' },
    { value: 'verified', label: 'Verified' },
    { value: 'unverified', label: 'Unverified' }
  ];

  sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'name', label: 'Name A-Z' },
    { value: 'rating', label: 'Highest Rating' },
    { value: 'bookings', label: 'Most Bookings' }
  ];

  // Computed properties
  filteredBusinesses = computed(() => {
    let filtered = this.businesses();
    const query = this.searchQuery().toLowerCase();
    const currentFilters = this.filters();

    // Search filter
    if (query) {
      filtered = filtered.filter(business =>
        business.name.toLowerCase().includes(query) ||
        business.ownerName.toLowerCase().includes(query) ||
        business.email.toLowerCase().includes(query) ||
        business.city.toLowerCase().includes(query) ||
        business.cuisineTypes.some(cuisine => cuisine.toLowerCase().includes(query))
      );
    }

    // Business type filter
    if (currentFilters.businessType !== 'all') {
      filtered = filtered.filter(business => business.businessType === currentFilters.businessType);
    }

    // Status filter
    if (currentFilters.status !== 'all') {
      filtered = filtered.filter(business => business.status === currentFilters.status);
    }

    // Subscription filter
    if (currentFilters.subscription !== 'all') {
      filtered = filtered.filter(business => business.subscriptionStatus === currentFilters.subscription);
    }

    // Verification filter
    if (currentFilters.verification !== 'all') {
      if (currentFilters.verification === 'verified') {
        filtered = filtered.filter(business => business.verified);
      } else {
        filtered = filtered.filter(business => !business.verified);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (currentFilters.sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return b.averageRating - a.averageRating;
        case 'bookings':
          return b.totalBookings - a.totalBookings;
        default:
          return 0;
      }
    });

    return filtered;
  });

  hasActiveFilters = computed(() => {
    const currentFilters = this.filters();
    return currentFilters.businessType !== 'all' ||
           currentFilters.status !== 'all' ||
           currentFilters.subscription !== 'all' ||
           currentFilters.verification !== 'all' ||
           this.searchQuery().length > 0;
  });

  businessStats = computed(() => {
    const businesses = this.businesses();
    return {
      total: businesses.length,
      active: businesses.filter(b => b.status === 'active').length,
      verified: businesses.filter(b => b.verified).length,
      restaurants: businesses.filter(b => b.businessType === 'restaurant').length,
      totalBookings: businesses.reduce((sum, b) => sum + b.totalBookings, 0),
      averageRating: businesses.length > 0 ?
        businesses.reduce((sum, b) => sum + b.averageRating, 0) / businesses.length : 0
    };
  });

  ngOnInit() {
    this.loadBusinesses();
  }

  // Data loading methods
  loadBusinesses(): void {
    this.isLoading.set(true);
    // Mock data - in real app, this would be an API call
    setTimeout(() => {
      this.businesses.set(this.mockBusinesses);
      this.isLoading.set(false);
    }, 1000);
  }

  // UI interaction methods
  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  clearFilters(): void {
    this.filters.set({
      businessType: 'all',
      status: 'all',
      subscription: 'all',
      verification: 'all',
      sortBy: 'newest'
    });
    this.searchQuery.set('');
  }

  updateFilter(key: keyof BusinessFilters, value: string): void {
    this.filters.update(current => ({ ...current, [key]: value }));
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  onFilterChange(key: keyof BusinessFilters, event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.updateFilter(key, target.value);
  }

  // Business actions
  viewBusinessDetails(business: AdminBusiness): void {
    this.selectedBusiness.set(business);
    this.showBusinessModal.set(true);
  }

  closeBusinessModal(): void {
    this.selectedBusiness.set(null);
    this.showBusinessModal.set(false);
  }

  verifyBusiness(business: AdminBusiness): void {
    console.log('Verify business:', business.id);
    // TODO: Implement business verification
  }

  suspendBusiness(business: AdminBusiness): void {
    console.log('Suspend business:', business.id);
    // TODO: Implement business suspension
  }

  activateBusiness(business: AdminBusiness): void {
    console.log('Activate business:', business.id);
    // TODO: Implement business activation
  }

  deleteBusiness(business: AdminBusiness): void {
    this.selectedBusiness.set(business);
    this.showDeleteConfirm.set(true);
  }

  confirmDelete(): void {
    const business = this.selectedBusiness();
    if (business) {
      console.log('Delete business:', business.id);
      // TODO: Implement business deletion
      this.showDeleteConfirm.set(false);
      this.selectedBusiness.set(null);
    }
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.selectedBusiness.set(null);
  }

  // Utility methods
  getBusinessTypeLabel(type: string): string {
    const typeMap: { [key: string]: string } = {
      'restaurant': 'Restaurant',
      'cafe': 'Cafe',
      'bar': 'Bar',
      'food_truck': 'Food Truck',
      'catering': 'Catering'
    };
    return typeMap[type] || type;
  }

  getBusinessTypeIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'restaurant': '🍽️',
      'cafe': '☕',
      'bar': '🍺',
      'food_truck': '🚚',
      'catering': '🎉'
    };
    return iconMap[type] || '🏪';
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'active': 'success',
      'inactive': 'warning',
      'suspended': 'danger',
      'pending_verification': 'info'
    };
    return colorMap[status] || 'secondary';
  }

  getSubscriptionColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'active': 'success',
      'trial': 'info',
      'expired': 'warning',
      'cancelled': 'danger'
    };
    return colorMap[status] || 'secondary';
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

  getStarRating(rating: number): string {
    return '⭐'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '⭐' : '');
  }

  // Mock data
  private mockBusinesses: AdminBusiness[] = [
    {
      id: '1',
      name: 'The Golden Spoon',
      email: 'contact@goldenspoon.com',
      ownerName: 'Maria Garcia',
      businessType: 'restaurant',
      status: 'active',
      subscriptionStatus: 'active',
      createdAt: new Date('2024-01-10'),
      lastLoginAt: new Date('2024-01-30'),
      verified: true,
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      phone: '+1234567890',
      website: 'https://goldenspoon.com',
      cuisineTypes: ['American', 'Contemporary'],
      averageRating: 4.8,
      totalReviews: 342,
      totalBookings: 1245,
      monthlyRevenue: 45000
    },
    {
      id: '2',
      name: 'Sakura Sushi Bar',
      email: 'info@sakurasushi.com',
      ownerName: 'Hiroshi Tanaka',
      businessType: 'restaurant',
      status: 'active',
      subscriptionStatus: 'trial',
      createdAt: new Date('2024-01-15'),
      lastLoginAt: new Date('2024-01-29'),
      verified: true,
      address: '456 Sushi Lane',
      city: 'New York',
      state: 'NY',
      phone: '+1987654321',
      cuisineTypes: ['Japanese', 'Sushi'],
      averageRating: 4.9,
      totalReviews: 198,
      totalBookings: 876,
      monthlyRevenue: 32000
    },
    {
      id: '3',
      name: 'Coffee Corner',
      email: 'hello@coffeecorner.com',
      ownerName: 'Sarah Johnson',
      businessType: 'cafe',
      status: 'pending_verification',
      subscriptionStatus: 'trial',
      createdAt: new Date('2024-01-20'),
      verified: false,
      address: '789 Coffee Street',
      city: 'Brooklyn',
      state: 'NY',
      phone: '+1555666777',
      cuisineTypes: ['Coffee', 'Pastries'],
      averageRating: 4.3,
      totalReviews: 67,
      totalBookings: 234,
      monthlyRevenue: 8500
    }
  ];
}
