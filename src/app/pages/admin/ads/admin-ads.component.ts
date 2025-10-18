import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';

interface Ad {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  placement: string;
  status: 'active' | 'paused' | 'scheduled' | 'expired';
  impressions: number;
  clicks: number;
  ctr: number;
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  createdAt: string;
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

  // Filter signals
  searchQuery = signal<string>('');
  statusFilter = signal<string>('all');
  placementFilter = signal<string>('all');

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalAds = signal<number>(0);

  // Modal state
  showCreateModal = signal<boolean>(false);
  isCreating = signal<boolean>(false);

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
    endDate: ''
  };

  ngOnInit(): void {
    this.loadAds();
    this.loadStats();
  }

  loadAds(): void {
    this.isLoading.set(true);

    const params = {
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchQuery() || undefined,
      status: this.statusFilter() !== 'all' ? this.statusFilter() : undefined,
      placement: this.placementFilter() !== 'all' ? this.placementFilter() : undefined
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
          status: ad.status,
          impressions: parseInt(ad.impressions) || 0,
          clicks: parseInt(ad.clicks) || 0,
          ctr: parseFloat(ad.ctr) || 0,
          budget: parseFloat(ad.budget) || 0,
          spent: parseFloat(ad.spent) || 0,
          startDate: ad.start_date,
          endDate: ad.end_date,
          createdAt: ad.created_at
        }));

        this.ads.set(adsData);
        this.totalAds.set(response.pagination.totalAds);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading ads:', error);
        this.isLoading.set(false);
        alert('Failed to load ads. Please try again.');
      }
    });
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
    this.applyFilters();
  }

  // Ad actions
  viewAd(ad: Ad): void {
    // TODO: Navigate to ad details page or open modal
    console.log('View ad:', ad);
    alert(`Viewing ad: ${ad.title}\n\nThis would open a detailed view of the ad.`);
  }

  editAd(ad: Ad): void {
    // TODO: Navigate to ad edit page or open modal
    console.log('Edit ad:', ad);
    alert(`Editing ad: ${ad.title}\n\nThis would open an edit form for the ad.`);
  }

  pauseAd(ad: Ad): void {
    if (confirm(`Are you sure you want to pause the ad "${ad.title}"?`)) {
      this.adminService.updateAd(ad.id, { status: 'paused' }).subscribe({
        next: () => {
          alert('Ad paused successfully');
          this.loadAds();
          this.loadStats();
        },
        error: (error) => {
          console.error('Error pausing ad:', error);
          alert('Failed to pause ad. Please try again.');
        }
      });
    }
  }

  resumeAd(ad: Ad): void {
    if (confirm(`Are you sure you want to resume the ad "${ad.title}"?`)) {
      this.adminService.updateAd(ad.id, { status: 'active' }).subscribe({
        next: () => {
          alert('Ad resumed successfully');
          this.loadAds();
          this.loadStats();
        },
        error: (error) => {
          console.error('Error resuming ad:', error);
          alert('Failed to resume ad. Please try again.');
        }
      });
    }
  }

  deleteAd(ad: Ad): void {
    if (confirm(`Are you sure you want to delete the ad "${ad.title}"?\n\nThis action cannot be undone.`)) {
      this.adminService.deleteAd(ad.id).subscribe({
        next: () => {
          alert('Ad deleted successfully');
          this.loadAds();
          this.loadStats();
        },
        error: (error) => {
          console.error('Error deleting ad:', error);
          alert('Failed to delete ad. Please try again.');
        }
      });
    }
  }

  createNewAd(): void {
    this.resetNewAdForm();
    this.showCreateModal.set(true);
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
      endDate: ''
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
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

