import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';

export interface BusinessDetail {
  id: string;
  businessName: string;
  businessType: string;
  description?: string;
  cuisineTypes?: string[];
  priceRange?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  address?: string;
  formattedAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  logoUrl?: string;
  coverImageUrl?: string;
  averageRating: number;
  totalReviews: number;
  totalBookings: number;
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  accountStatus: string;
  isFeatured: boolean;
  isVerified: boolean;
  sustainabilityEthos?: string;
  opensAt?: string;
  closesAt?: string;
  facilities?: any[];
  createdAt: Date;
  updatedAt: Date;
  ownerName: string;
  ownerEmail: string;
  ownerId: string;
  ownerPhone?: string;
}

@Component({
  selector: 'app-business-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './business-detail.component.html',
  styleUrls: ['./business-detail.component.scss']
})
export class BusinessDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private adminService = inject(AdminService);

  business = signal<BusinessDetail | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  
  // Action states
  isVerifying = signal(false);
  isSuspending = signal(false);
  isActivating = signal(false);
  isDeleting = signal(false);
  showDeleteConfirm = signal(false);

  // Toast notification
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error' | 'info'>('info');

  ngOnInit() {
    const businessId = this.route.snapshot.paramMap.get('id');
    if (businessId) {
      this.loadBusiness(businessId);
    } else {
      this.error.set('Business ID not provided');
      this.isLoading.set(false);
    }
  }

  loadBusiness(businessId: string) {
    this.isLoading.set(true);
    this.error.set(null);

    this.adminService.getBusiness(businessId).subscribe({
      next: (response: any) => {
        const b = response.business;
        this.business.set({
          id: b.id,
          businessName: b.business_name,
          businessType: b.business_type,
          description: b.description,
          cuisineTypes: b.cuisine_types,
          priceRange: b.price_range,
          phone: b.phone,
          email: b.email,
          websiteUrl: b.website_url,
          address: b.address,
          formattedAddress: b.formatted_address,
          city: b.city,
          state: b.state,
          country: b.country,
          postalCode: b.postal_code,
          latitude: b.latitude,
          longitude: b.longitude,
          logoUrl: b.logo_url,
          coverImageUrl: b.cover_image_url,
          averageRating: parseFloat(b.average_rating) || 0,
          totalReviews: b.total_reviews || 0,
          totalBookings: b.total_bookings || 0,
          status: b.status,
          accountStatus: b.account_status,
          isFeatured: b.is_featured,
          isVerified: b.is_verified,
          sustainabilityEthos: b.sustainability_ethos,
          opensAt: b.opens_at,
          closesAt: b.closes_at,
          facilities: b.facilities || [],
          createdAt: new Date(b.created_at),
          updatedAt: new Date(b.updated_at),
          ownerName: b.owner_name,
          ownerEmail: b.owner_email,
          ownerId: b.owner_id,
          ownerPhone: b.owner_phone
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading business:', err);
        this.error.set('Failed to load business details');
        this.isLoading.set(false);
      }
    });
  }

  goBack() {
    this.router.navigate(['/admin/businesses']);
  }

  verifyBusiness() {
    const b = this.business();
    if (!b) return;

    this.isVerifying.set(true);
    this.adminService.verifyBusiness(b.id).subscribe({
      next: () => {
        this.business.set({ ...b, isVerified: true });
        this.showToast('Business verified successfully', 'success');
        this.isVerifying.set(false);
      },
      error: (err) => {
        console.error('Error verifying business:', err);
        this.showToast('Failed to verify business', 'error');
        this.isVerifying.set(false);
      }
    });
  }

  suspendBusiness() {
    const b = this.business();
    if (!b) return;

    const reason = prompt('Enter reason for suspension:');
    if (reason === null) return;

    this.isSuspending.set(true);
    this.adminService.suspendBusiness(b.id, reason).subscribe({
      next: () => {
        this.business.set({ ...b, status: 'suspended' });
        this.showToast('Business suspended successfully', 'success');
        this.isSuspending.set(false);
      },
      error: (err) => {
        console.error('Error suspending business:', err);
        this.showToast('Failed to suspend business', 'error');
        this.isSuspending.set(false);
      }
    });
  }

  activateBusiness() {
    const b = this.business();
    if (!b) return;

    this.isActivating.set(true);
    this.adminService.activateBusiness(b.id).subscribe({
      next: () => {
        this.business.set({ ...b, status: 'active' });
        this.showToast('Business activated successfully', 'success');
        this.isActivating.set(false);
      },
      error: (err) => {
        console.error('Error activating business:', err);
        this.showToast('Failed to activate business', 'error');
        this.isActivating.set(false);
      }
    });
  }

  confirmDelete() {
    this.showDeleteConfirm.set(true);
  }

  cancelDelete() {
    this.showDeleteConfirm.set(false);
  }

  deleteBusiness() {
    const b = this.business();
    if (!b) return;

    this.isDeleting.set(true);
    this.adminService.deleteBusiness(b.id).subscribe({
      next: () => {
        this.showToast('Business deleted successfully', 'success');
        this.isDeleting.set(false);
        this.showDeleteConfirm.set(false);
        setTimeout(() => this.router.navigate(['/admin/businesses']), 1500);
      },
      error: (err) => {
        console.error('Error deleting business:', err);
        this.showToast('Failed to delete business', 'error');
        this.isDeleting.set(false);
        this.showDeleteConfirm.set(false);
      }
    });
  }

  viewOwner() {
    const b = this.business();
    if (b?.ownerId) {
      this.router.navigate(['/admin/users', b.ownerId]);
    }
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => this.toastMessage.set(null), 5000);
  }

  hideToast() {
    this.toastMessage.set(null);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'suspended': return 'status-suspended';
      case 'pending': return 'status-pending';
      default: return 'status-inactive';
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

