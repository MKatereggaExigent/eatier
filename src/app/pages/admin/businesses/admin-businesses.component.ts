import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';

export interface AdminBusiness {
  id: string;
  name: string;
  email: string;
  ownerName: string;
  ownerEmail: string;
  businessType: string;
  status: 'active' | 'frozen' | 'pending_deletion' | 'deleted';
  createdAt: Date;
  lastLoginAt?: Date;
  verified: boolean;
  address?: string;
  country: string;
  phone?: string;
  bio?: string;
  sustainabilityEthos?: string;
  opensAt?: string;
  closesAt?: string;
  facilities?: string[];
  averageRating: number;
  totalReviews: number;
  totalBookings: number;
}

export interface BusinessFilters {
  businessType: string;
  status: string;
  verification: string;
  sortBy: 'newest' | 'oldest' | 'name' | 'rating' | 'bookings';
}

@Component({
  selector: 'app-admin-businesses',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-businesses.component.html',
  styleUrls: ['./admin-businesses.component.scss']
})
export class AdminBusinessesComponent implements OnInit {
  private authService = inject(AuthService);
  private adminService = inject(AdminService);

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
    { value: 'catering', label: 'Catering' },
    { value: 'bakery', label: 'Bakery' },
    { value: 'other', label: 'Other' }
  ];

  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'frozen', label: 'Frozen/Suspended' },
    { value: 'pending_deletion', label: 'Pending Deletion' },
    { value: 'deleted', label: 'Deleted' }
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
        business.country.toLowerCase().includes(query)
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

    const currentFilters = this.filters();
    const searchTerm = this.searchQuery();

    this.adminService.getBusinesses(
      1,
      100,
      searchTerm || undefined,
      currentFilters.status,
      currentFilters.businessType,
      currentFilters.verification
    ).subscribe({
      next: (response: any) => {
        const mappedBusinesses: AdminBusiness[] = response.businesses.map((business: any) => ({
          id: business.id,
          name: business.business_name,
          email: business.email,
          ownerName: business.owner_name || 'Unknown',
          ownerEmail: business.owner_email || '',
          businessType: business.business_type || 'other',
          status: business.account_status || 'active',
          createdAt: new Date(business.created_at),
          lastLoginAt: business.last_login_at ? new Date(business.last_login_at) : undefined,
          verified: business.email_verified || false,
          address: business.address,
          country: business.country || '',
          phone: business.phone,
          bio: business.bio,
          sustainabilityEthos: business.sustainability_ethos,
          opensAt: business.opens_at,
          closesAt: business.closes_at,
          facilities: business.facilities || [],
          averageRating: parseFloat(business.average_rating) || 0,
          totalReviews: parseInt(business.total_reviews) || 0,
          totalBookings: parseInt(business.total_bookings) || 0
        }));

        this.businesses.set(mappedBusinesses);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading businesses:', error);
        this.isLoading.set(false);
        alert('Failed to load businesses. Please try again.');
      }
    });
  }

  // UI interaction methods
  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  clearFilters(): void {
    this.filters.set({
      businessType: 'all',
      status: 'all',
      verification: 'all',
      sortBy: 'newest'
    });
    this.searchQuery.set('');
    this.loadBusinesses();
  }

  private searchTimeout: any;

  updateFilter(key: keyof BusinessFilters, value: string): void {
    this.filters.update(current => ({ ...current, [key]: value }));
    this.loadBusinesses(); // Reload data when filter changes
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);

    // Debounce search input
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.loadBusinesses();
    }, 500); // Wait 500ms after user stops typing
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
    if (confirm(`Are you sure you want to verify ${business.name}?`)) {
      this.adminService.verifyBusiness(business.id).subscribe({
        next: () => {
          // Update the business in the list
          const businesses = this.businesses();
          const updatedBusinesses = businesses.map(b =>
            b.id === business.id ? { ...b, verified: true } : b
          );
          this.businesses.set(updatedBusinesses);
          alert(`${business.name} has been verified successfully.`);
        },
        error: (error) => {
          console.error('Error verifying business:', error);
          alert('Failed to verify business. Please try again.');
        }
      });
    }
  }

  suspendBusiness(business: AdminBusiness): void {
    const reason = prompt(`Enter reason for suspending ${business.name}:`);
    if (reason !== null) {
      this.adminService.suspendBusiness(business.id, reason).subscribe({
        next: () => {
          // Update the business in the list
          const businesses = this.businesses();
          const updatedBusinesses = businesses.map(b =>
            b.id === business.id ? { ...b, status: 'frozen' as const } : b
          );
          this.businesses.set(updatedBusinesses);
          alert(`${business.name} has been suspended.`);
        },
        error: (error) => {
          console.error('Error suspending business:', error);
          alert('Failed to suspend business. Please try again.');
        }
      });
    }
  }

  activateBusiness(business: AdminBusiness): void {
    if (confirm(`Are you sure you want to activate ${business.name}?`)) {
      this.adminService.activateBusiness(business.id).subscribe({
        next: () => {
          // Update the business in the list
          const businesses = this.businesses();
          const updatedBusinesses = businesses.map(b =>
            b.id === business.id ? { ...b, status: 'active' as const } : b
          );
          this.businesses.set(updatedBusinesses);
          alert(`${business.name} has been activated.`);
        },
        error: (error) => {
          console.error('Error activating business:', error);
          alert('Failed to activate business. Please try again.');
        }
      });
    }
  }

  deleteBusiness(business: AdminBusiness): void {
    this.selectedBusiness.set(business);
    this.showDeleteConfirm.set(true);
  }

  confirmDelete(): void {
    const business = this.selectedBusiness();
    if (business) {
      this.adminService.deleteBusiness(business.id).subscribe({
        next: () => {
          // Remove the business from the list
          const businesses = this.businesses();
          const updatedBusinesses = businesses.filter(b => b.id !== business.id);
          this.businesses.set(updatedBusinesses);
          this.showDeleteConfirm.set(false);
          this.selectedBusiness.set(null);
          alert(`${business.name} has been deleted successfully.`);
        },
        error: (error) => {
          console.error('Error deleting business:', error);
          alert('Failed to delete business. Please try again.');
          this.showDeleteConfirm.set(false);
          this.selectedBusiness.set(null);
        }
      });
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
}
