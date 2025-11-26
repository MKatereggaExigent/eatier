import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

export interface AdminBusiness {
  id: string;
  name: string;
  slug: string;
  description?: string;
  cuisineTypes?: string[];
  priceRange?: string;
  email?: string;
  phone?: string;
  websiteUrl?: string;
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  ownerName: string;
  ownerEmail: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  verified: boolean;
  isFeatured: boolean;
  verificationDate?: Date;
  averageRating: number;
  totalReviews: number;
  totalBookings: number;
}

export interface BusinessFilters {
  status: string;
  verification: string;
  priceRange: string;
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
  private router = inject(Router);

  currentUser = this.authService.currentUser;

  // Expose Math for template
  Math = Math;

  // State management
  isLoading = signal(false);
  businesses = signal<AdminBusiness[]>([]);
  selectedBusiness = signal<AdminBusiness | null>(null);

  // Error states
  loadError = signal<string | null>(null);
  actionError = signal<string | null>(null);

  // Action loading states
  isActivating = signal<string | null>(null); // stores business ID being activated
  isSuspending = signal<string | null>(null); // stores business ID being suspended
  isDeleting = signal<string | null>(null); // stores business ID being deleted

  // Toast notification
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error' | 'info'>('info');

  // Pagination
  currentPage = signal(1);
  pageSize = signal(20);
  totalBusinesses = signal(0);

  // UI state
  searchQuery = signal('');
  showFilters = signal(false);
  showBusinessModal = signal(false);
  showDeleteConfirm = signal(false);
  viewMode = signal<'cards' | 'table'>('table'); // Default to table view

  // Filter options
  filters = signal<BusinessFilters>({
    status: 'all',
    verification: 'all',
    priceRange: 'all',
    sortBy: 'newest'
  });

  // Available options
  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'inactive', label: 'Inactive' }
  ];

  verificationOptions = [
    { value: 'all', label: 'All Businesses' },
    { value: 'verified', label: 'Verified' },
    { value: 'unverified', label: 'Unverified' }
  ];

  priceRangeOptions = [
    { value: 'all', label: 'All Price Ranges' },
    { value: 'budget', label: 'Budget ($)' },
    { value: 'moderate', label: 'Moderate ($$)' },
    { value: 'expensive', label: 'Expensive ($$$)' },
    { value: 'luxury', label: 'Luxury ($$$$)' }
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
        (business.email && business.email.toLowerCase().includes(query)) ||
        (business.description && business.description.toLowerCase().includes(query))
      );
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

    // Price range filter
    if (currentFilters.priceRange !== 'all') {
      filtered = filtered.filter(business => business.priceRange === currentFilters.priceRange);
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
    return currentFilters.status !== 'all' ||
           currentFilters.verification !== 'all' ||
           currentFilters.priceRange !== 'all' ||
           this.searchQuery().length > 0;
  });

  businessStats = computed(() => {
    const businesses = this.businesses();
    return {
      total: businesses.length,
      active: businesses.filter(b => b.status === 'active').length,
      verified: businesses.filter(b => b.verified).length,
      featured: businesses.filter(b => b.isFeatured).length,
      totalBookings: businesses.reduce((sum, b) => sum + b.totalBookings, 0),
      averageRating: businesses.length > 0 ?
        businesses.reduce((sum, b) => sum + b.averageRating, 0) / businesses.length : 0
    };
  });

  ngOnInit() {
    this.loadBusinesses();
  }

  // Computed values
  totalPages = computed(() => Math.ceil(this.totalBusinesses() / this.pageSize()));

  hasNextPage = computed(() => this.currentPage() < this.totalPages());

  hasPreviousPage = computed(() => this.currentPage() > 1);

  // Data loading methods
  loadBusinesses(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    const currentFilters = this.filters();
    const searchTerm = this.searchQuery();

    this.adminService.getBusinesses(
      this.currentPage(),
      this.pageSize(),
      searchTerm || undefined,
      currentFilters.status,
      undefined, // business_type removed
      currentFilters.verification
    ).subscribe({
      next: (response: any) => {
        this.totalBusinesses.set(response.total || 0);
        const mappedBusinesses: AdminBusiness[] = response.businesses.map((business: any) => ({
          id: business.id,
          name: business.business_name,
          slug: business.slug,
          description: business.description,
          cuisineTypes: Array.isArray(business.cuisine_types)
            ? business.cuisine_types
            : (typeof business.cuisine_types === 'string'
              ? business.cuisine_types.replace(/[{}]/g, '').split(',')
              : []),
          priceRange: business.price_range,
          email: business.email,
          phone: business.phone,
          websiteUrl: business.website_url,
          status: business.account_status || 'active',
          ownerName: business.owner_name || 'Unknown',
          ownerEmail: business.owner_email || '',
          ownerId: business.owner_id,
          createdAt: new Date(business.created_at),
          updatedAt: new Date(business.updated_at),
          lastLoginAt: business.last_login_at ? new Date(business.last_login_at) : undefined,
          verified: business.email_verified || false,
          isFeatured: business.is_featured || false,
          verificationDate: business.verification_date ? new Date(business.verification_date) : undefined,
          averageRating: parseFloat(business.average_rating) || 0,
          totalReviews: parseInt(business.total_reviews) || 0,
          totalBookings: parseInt(business.total_bookings) || 0
        }));

        this.businesses.set(mappedBusinesses);
        this.isLoading.set(false);
        this.loadError.set(null);
      },
      error: (error) => {
        console.error('Error loading businesses:', error);
        this.loadError.set('Failed to load businesses. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  retryLoadBusinesses(): void {
    this.loadBusinesses();
  }

  // UI interaction methods
  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === 'cards' ? 'table' : 'cards');
  }

  clearFilters(): void {
    this.filters.set({
      status: 'all',
      verification: 'all',
      priceRange: 'all',
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
    this.router.navigate(['/admin/businesses', business.id]);
  }

  editBusiness(business: AdminBusiness): void {
    this.router.navigate(['/admin/businesses', business.id, 'edit']);
  }

  closeBusinessModal(): void {
    this.selectedBusiness.set(null);
    this.showBusinessModal.set(false);
  }

  // Toast notification methods
  showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 5000); // Auto-hide after 5 seconds
  }

  hideToast(): void {
    this.toastMessage.set(null);
  }

  verifyBusiness(business: AdminBusiness): void {
    // TODO: Replace with custom confirmation modal
    if (confirm(`Are you sure you want to verify ${business.name}?`)) {
      this.adminService.verifyBusiness(business.id).subscribe({
        next: () => {
          // Update the business in the list
          const businesses = this.businesses();
          const updatedBusinesses = businesses.map(b =>
            b.id === business.id ? { ...b, verified: true } : b
          );
          this.businesses.set(updatedBusinesses);
          this.showToast(`${business.name} has been verified successfully.`, 'success');
        },
        error: (error) => {
          console.error('Error verifying business:', error);
          this.showToast('Failed to verify business. Please try again.', 'error');
        }
      });
    }
  }

  suspendBusiness(business: AdminBusiness): void {
    // TODO: Replace with custom input modal
    const reason = prompt(`Enter reason for suspending ${business.name}:`);
    if (reason !== null) {
      this.isSuspending.set(business.id);
      this.adminService.suspendBusiness(business.id, reason).subscribe({
        next: () => {
          // Update the business in the list
          const businesses = this.businesses();
          const updatedBusinesses = businesses.map(b =>
            b.id === business.id ? { ...b, status: 'suspended' as const } : b
          );
          this.businesses.set(updatedBusinesses);
          this.showToast(`${business.name} has been suspended.`, 'success');
          this.isSuspending.set(null);
        },
        error: (error) => {
          console.error('Error suspending business:', error);
          this.showToast('Failed to suspend business. Please try again.', 'error');
          this.isSuspending.set(null);
        }
      });
    }
  }

  activateBusiness(business: AdminBusiness): void {
    // TODO: Replace with custom confirmation modal
    if (confirm(`Are you sure you want to activate ${business.name}?`)) {
      this.isActivating.set(business.id);
      this.adminService.activateBusiness(business.id).subscribe({
        next: () => {
          // Update the business in the list
          const businesses = this.businesses();
          const updatedBusinesses = businesses.map(b =>
            b.id === business.id ? { ...b, status: 'active' as const } : b
          );
          this.businesses.set(updatedBusinesses);
          this.showToast(`${business.name} has been activated.`, 'success');
          this.isActivating.set(null);
        },
        error: (error) => {
          console.error('Error activating business:', error);
          this.showToast('Failed to activate business. Please try again.', 'error');
          this.isActivating.set(null);
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
      this.isDeleting.set(business.id);
      this.adminService.deleteBusiness(business.id).subscribe({
        next: () => {
          // Remove the business from the list
          const businesses = this.businesses();
          const updatedBusinesses = businesses.filter(b => b.id !== business.id);
          this.businesses.set(updatedBusinesses);
          this.totalBusinesses.update(total => total - 1);
          this.showDeleteConfirm.set(false);
          this.selectedBusiness.set(null);
          this.showToast(`${business.name} has been deleted successfully.`, 'success');
          this.isDeleting.set(null);
        },
        error: (error) => {
          console.error('Error deleting business:', error);
          this.showToast('Failed to delete business. Please try again.', 'error');
          this.showDeleteConfirm.set(false);
          this.selectedBusiness.set(null);
          this.isDeleting.set(null);
        }
      });
    }
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.selectedBusiness.set(null);
  }

  // Utility methods
  getPriceRangeLabel(range: string): string {
    const rangeMap: { [key: string]: string } = {
      'budget': '$',
      'moderate': '$$',
      'expensive': '$$$',
      'luxury': '$$$$'
    };
    return rangeMap[range] || range;
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

  getCuisineDisplay(cuisines: string[] | undefined): string {
    if (!cuisines || cuisines.length === 0) return 'N/A';
    return cuisines.slice(0, 3).join(', ') + (cuisines.length > 3 ? '...' : '');
  }

  // Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadBusinesses();
    }
  }

  nextPage(): void {
    if (this.hasNextPage()) {
      this.currentPage.update(page => page + 1);
      this.loadBusinesses();
    }
  }

  previousPage(): void {
    if (this.hasPreviousPage()) {
      this.currentPage.update(page => page - 1);
      this.loadBusinesses();
    }
  }

  changePageSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newSize = parseInt(target.value, 10);
    this.pageSize.set(newSize);
    this.currentPage.set(1); // Reset to first page
    this.loadBusinesses();
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current > 3) {
        pages.push(-1); // Ellipsis
      }

      // Show pages around current
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push(-1); // Ellipsis
      }

      // Always show last page
      pages.push(total);
    }

    return pages;
  }
}
