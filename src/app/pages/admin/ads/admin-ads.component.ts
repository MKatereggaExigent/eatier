import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Ad {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  placement: string;
  category?: string;
  status: 'active' | 'paused' | 'scheduled' | 'expired' | 'draft';
  impressions: number;
  clicks: number;
  ctr: number;
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  businessName?: string;
  advertiserName?: string;
  advertiserId?: string;
}

interface AdStats {
  totalAds: number;
  activeAds: number;
  totalImpressions: number;
  totalClicks: number;
  averageCTR: number;
  totalSpent: number;
}

@Component({
  selector: 'app-admin-ads',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-ads.component.html',
  styleUrls: ['./admin-ads.component.scss']
})
export class AdminAdsComponent implements OnInit {
  private authService = inject(AuthService);
  private adminService = inject(AdminService);
  private currencyService = inject(CurrencyService);
  private router = inject(Router);
  currentUser = this.authService.currentUser;

  // State signals
  isLoading = signal<boolean>(false);
  ads = signal<Ad[]>([]);
  stats = signal<AdStats>({
    totalAds: 0,
    activeAds: 0,
    totalImpressions: 0,
    totalClicks: 0,
    averageCTR: 0,
    totalSpent: 0
  });

  // Error states
  loadError = signal<string | null>(null);
  statsError = signal<string | null>(null);
  actionError = signal<string | null>(null);

  // Action loading states
  isPausing = signal<string | null>(null); // stores ad ID being paused
  isResuming = signal<string | null>(null); // stores ad ID being resumed
  isDeleting = signal<string | null>(null); // stores ad ID being deleted

  // Toast notification
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error' | 'info'>('info');

  // Filter signals
  searchQuery = signal<string>('');
  statusFilter = signal<string>('all');
  placementFilter = signal<string>('all');
  businessFilter = signal<string>('all');

  // Businesses list for filter
  businesses = signal<Array<{id: string, name: string, ownerName: string}>>([]);

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalAds = signal<number>(0);

  // Modal state
  showCreateModal = signal<boolean>(false);
  isCreating = signal<boolean>(false);
  showDetailsModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);
  showPauseDialog = signal<boolean>(false);
  showDeleteDialog = signal<boolean>(false);
  selectedAd = signal<Ad | null>(null);
  isUpdating = signal<boolean>(false);

  // Image upload state
  imageUploadMethod = signal<'url' | 'upload'>('url');
  selectedFileName = signal<string>('');
  selectedFileUrl = signal<string>('');

  // New ad form data
  newAd = {
    title: '',
    description: '',
    imageUrl: '',
    targetUrl: '',
    placement: '',
    status: 'draft',
    budget: 0,
    spent: 0,
    startDate: '',
    endDate: '',
    advertiserId: ''
  };

  // Edit ad form data
  editAdForm = {
    title: '',
    description: '',
    imageUrl: '',
    targetUrl: '',
    placement: '',
    status: 'draft',
    budget: 0,
    spent: 0,
    startDate: '',
    endDate: '',
    advertiserId: ''
  };

  ngOnInit(): void {
    this.loadAds();
    this.loadStats();
    this.loadBusinesses();
  }

  loadBusinesses(): void {
    // Load advertisers for the filter dropdown
    this.adminService.getAdvertisers().subscribe({
      next: (response) => {
        const advertiserList = response.advertisers.map((advertiser: any) => ({
          id: advertiser.id,
          name: advertiser.name,
          email: advertiser.email,
          businessName: advertiser.business_name,
          adCount: advertiser.ad_count
        }));
        this.businesses.set(advertiserList);
      },
      error: (error) => {
        console.error('Error loading advertisers:', error);
      }
    });
  }

  loadAds(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    const params = {
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchQuery() || undefined,
      status: this.statusFilter() !== 'all' ? this.statusFilter() : undefined,
      placement: this.placementFilter() !== 'all' ? this.placementFilter() : undefined,
      advertiser_id: this.businessFilter() !== 'all' ? this.businessFilter() : undefined
    };

    this.adminService.getAds(params).subscribe({
      next: (response) => {
        const adsData = response.ads.map((ad: any) => ({
          id: ad.id,
          title: ad.title,
          description: ad.description,
          imageUrl: ad.image_url,
          targetUrl: ad.target_url,
          placement: ad.placement,
          category: ad.category,
          status: ad.status,
          impressions: parseInt(ad.impressions) || 0,
          clicks: parseInt(ad.clicks) || 0,
          ctr: parseFloat(ad.ctr) || 0,
          budget: parseFloat(ad.total_budget) || 0,
          spent: parseFloat(ad.spent_amount) || 0,
          startDate: ad.start_date,
          endDate: ad.end_date,
          createdAt: ad.created_at,
          businessName: ad.business_name,
          advertiserName: ad.advertiser_name,
          advertiserId: ad.advertiser_id
        }));

        this.ads.set(adsData);
        this.totalAds.set(response.pagination.totalAds);
        this.isLoading.set(false);
        this.loadError.set(null);
      },
      error: (error) => {
        console.error('Error loading ads:', error);
        this.loadError.set('Failed to load ads. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  retryLoadAds(): void {
    this.loadAds();
  }

  loadStats(): void {
    this.adminService.getAdStats().subscribe({
      next: (stats) => {
        this.stats.set({
          totalAds: stats.totalAds || 0,
          activeAds: stats.activeAds || 0,
          totalImpressions: stats.totalImpressions || 0,
          totalClicks: stats.totalClicks || 0,
          averageCTR: stats.averageCTR || 0,
          totalSpent: stats.totalSpent || 0
        });
      },
      error: (error) => {
        console.error('Error loading ad stats:', error);
      }
    });
  }

  // Filter methods
  applyFilters(): void {
    this.currentPage.set(1);
    this.loadAds();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('all');
    this.placementFilter.set('all');
    this.businessFilter.set('all');
    this.applyFilters();
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

  // Navigation methods
  viewAdDetails(ad: Ad): void {
    this.router.navigate(['/admin/ads', ad.id]);
  }

  createNewAd(): void {
    this.router.navigate(['/admin/ads/create']);
  }

  editAdNavigate(ad: Ad): void {
    this.router.navigate(['/admin/ads', ad.id, 'edit']);
  }

  // Ad actions
  viewAd(ad: Ad): void {
    this.selectedAd.set(ad);
    this.showDetailsModal.set(true);
  }

  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.selectedAd.set(null);
  }

  editAd(ad: Ad): void {
    this.selectedAd.set(ad);
    // Populate edit form with current ad data
    this.editAdForm = {
      title: ad.title,
      description: ad.description,
      imageUrl: ad.imageUrl,
      targetUrl: ad.targetUrl,
      placement: ad.placement,
      status: ad.status,
      budget: ad.budget,
      spent: ad.spent,
      startDate: ad.startDate,
      endDate: ad.endDate,
      advertiserId: ad.advertiserId || ''
    };
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedAd.set(null);
    this.imageUploadMethod.set('url');
    this.selectedFileName.set('');
    this.selectedFileUrl.set('');
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        alert('File size must be less than 10MB');
        return;
      }

      // Store filename
      this.selectedFileName.set(file.name);

      // Create temporary URL for preview
      const tempUrl = URL.createObjectURL(file);
      this.selectedFileUrl.set(tempUrl);
      this.editAdForm.imageUrl = tempUrl;

      // In production, you would upload the file to cloud storage here
      // and get back a permanent URL to store in editAdForm.imageUrl
      console.log('File selected:', file.name, 'Size:', (file.size / 1024).toFixed(2), 'KB');
    }
  }

  removeSelectedFile(): void {
    this.selectedFileName.set('');
    this.selectedFileUrl.set('');
    this.editAdForm.imageUrl = '';

    // Reset file input
    const fileInput = document.getElementById('edit-imageFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  saveEditedAd(): void {
    const ad = this.selectedAd();
    if (!ad) return;

    this.isUpdating.set(true);
    this.adminService.updateAd(ad.id, this.editAdForm).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeEditModal();
        this.loadAds();
        this.loadStats();
        this.showToast(`Ad "${ad.title}" has been updated successfully.`, 'success');
      },
      error: (error) => {
        console.error('Error updating ad:', error);
        this.isUpdating.set(false);
        this.showToast('Failed to update ad. Please try again.', 'error');
      }
    });
  }

  pauseAd(ad: Ad): void {
    this.selectedAd.set(ad);
    this.showPauseDialog.set(true);
  }

  closePauseDialog(): void {
    this.showPauseDialog.set(false);
    this.selectedAd.set(null);
  }

  confirmPauseAd(): void {
    const ad = this.selectedAd();
    if (!ad) return;

    this.isUpdating.set(true);
    this.adminService.updateAd(ad.id, { status: 'paused' }).subscribe({
      next: () => {
        this.loadAds();
        this.loadStats();
        this.showToast(`Ad "${ad.title}" has been paused.`, 'success');
        this.isUpdating.set(false);
        this.closePauseDialog();
      },
      error: (error) => {
        console.error('Error pausing ad:', error);
        this.showToast('Failed to pause ad. Please try again.', 'error');
        this.isUpdating.set(false);
      }
    });
  }

  resumeAd(ad: Ad): void {
    if (confirm(`Are you sure you want to resume the ad "${ad.title}"?`)) {
      this.isResuming.set(ad.id);
      this.adminService.updateAd(ad.id, { status: 'active' }).subscribe({
        next: () => {
          this.loadAds();
          this.loadStats();
          this.showToast(`Ad "${ad.title}" has been resumed.`, 'success');
          this.isResuming.set(null);
        },
        error: (error) => {
          console.error('Error resuming ad:', error);
          this.showToast('Failed to resume ad. Please try again.', 'error');
          this.isResuming.set(null);
        }
      });
    }
  }

  deleteAd(ad: Ad): void {
    this.selectedAd.set(ad);
    this.showDeleteDialog.set(true);
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog.set(false);
    this.selectedAd.set(null);
  }

  confirmDeleteAd(): void {
    const ad = this.selectedAd();
    if (!ad) return;

    this.isUpdating.set(true);
    this.adminService.deleteAd(ad.id).subscribe({
      next: () => {
        this.loadAds();
        this.loadStats();
        this.showToast(`Ad "${ad.title}" has been deleted.`, 'success');
        this.isUpdating.set(false);
        this.closeDeleteDialog();
      },
      error: (error) => {
        console.error('Error deleting ad:', error);
        this.showToast('Failed to delete ad. Please try again.', 'error');
        this.isUpdating.set(false);
      }
    });
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.resetNewAdForm();
  }

  resetNewAdForm(): void {
    this.newAd = {
      title: '',
      description: '',
      imageUrl: '',
      targetUrl: '',
      placement: '',
      status: 'draft',
      budget: 0,
      spent: 0,
      startDate: '',
      endDate: '',
      advertiserId: ''
    };
  }

  submitNewAd(): void {
    // Validate required fields
    if (!this.newAd.title || !this.newAd.description || !this.newAd.imageUrl ||
        !this.newAd.targetUrl || !this.newAd.placement || !this.newAd.startDate ||
        !this.newAd.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate dates
    const startDate = new Date(this.newAd.startDate);
    const endDate = new Date(this.newAd.endDate);

    if (endDate <= startDate) {
      alert('End date must be after start date');
      return;
    }

    this.isCreating.set(true);

    const adData = {
      title: this.newAd.title,
      description: this.newAd.description,
      imageUrl: this.newAd.imageUrl,
      targetUrl: this.newAd.targetUrl,
      placement: this.newAd.placement,
      status: this.newAd.status,
      budget: this.newAd.budget,
      spent: this.newAd.spent || 0,
      startDate: this.newAd.startDate,
      endDate: this.newAd.endDate
    };

    this.adminService.createAd(adData).subscribe({
      next: (response) => {
        this.isCreating.set(false);
        this.closeCreateModal();
        alert(`Ad campaign "${this.newAd.title}" created successfully!`);
        this.loadAds();
        this.loadStats();
      },
      error: (error) => {
        console.error('Error creating ad:', error);
        this.isCreating.set(false);
        alert('Failed to create ad. Please try again.');
      }
    });
  }

  // Utility methods
  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'active': 'status-active',
      'paused': 'status-paused',
      'scheduled': 'status-scheduled',
      'expired': 'status-expired'
    };
    return classes[status] || '';
  }

  getPlacementLabel(placement: string): string {
    const labels: { [key: string]: string } = {
      'homepage_banner': 'Homepage Banner',
      'sidebar': 'Sidebar',
      'search_results': 'Search Results',
      'footer': 'Footer'
    };
    return labels[placement] || placement;
  }

  formatCurrency(amount: number): string {
    return this.currencyService.formatAmount(amount);
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Pagination
  get totalPages(): number {
    return Math.ceil(this.totalAds() / this.pageSize());
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage.set(page);
      this.loadAds();
    }
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }
}

