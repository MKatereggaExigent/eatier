import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { AdCampaign } from '../../../core/models/ad-management.models';
import { AdManagementService } from '../../../core/services/ad-management.service';
import { AuthService } from '../../../core/services/auth.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Campaign {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  totalBudget: number;
  dailyBudget: number;
  spentAmount: number;
  remainingAmount: number;
  currency: string;
  impressions: number;
  clicks: number;
  conversions: number;
  clickThroughRate: number;
  startDate: string;
  endDate?: string;
  createdAt: string;
}

interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  draftCampaigns: number;
  pausedCampaigns: number;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  averageCTR: number;
}

@Component({
  selector: 'app-ad-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './ad-management.component.html',
  styleUrls: ['./ad-management.component.scss']
})
export class AdManagementComponent implements OnInit {
  private authService = inject(AuthService);
  private adService = inject(AdManagementService);
  private currencyService = inject(CurrencyService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // State
  currentUser = this.authService.currentUser;
  campaigns = signal<Campaign[]>([]);
  selectedCampaign = signal<Campaign | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  showDetailsModal = signal<boolean>(false);
  showDeleteDialog = signal<boolean>(false);

  // Filters
  statusFilter = signal<string>('all');
  searchQuery = signal<string>('');

  // Pagination
  currentPage = signal<number>(1);
  totalCampaigns = signal<number>(0);
  pageSize = signal<number>(20);
  hasMore = signal<boolean>(false);

  // Computed
  filteredCampaigns = computed(() => {
    let filtered = this.campaigns();
    const query = this.searchQuery().toLowerCase();

    if (query) {
      filtered = filtered.filter(campaign =>
        campaign.title?.toLowerCase().includes(query) ||
        campaign.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  statistics = computed(() => {
    const all = this.campaigns();

    return {
      total: all.length,
      active: all.filter(c => c.status === 'active').length,
      draft: all.filter(c => c.status === 'draft').length,
      paused: all.filter(c => c.status === 'paused').length,
      totalSpend: all.reduce((sum, c) => sum + c.spentAmount, 0),
      totalImpressions: all.reduce((sum, c) => sum + c.impressions, 0),
      totalClicks: all.reduce((sum, c) => sum + c.clicks, 0)
    };
  });

  ngOnInit(): void {
    this.loadCampaigns();
  }

  loadCampaigns(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const userId = this.currentUser()?.id;
    if (!userId) {
      this.errorMessage.set('User not authenticated');
      this.isLoading.set(false);
      return;
    }

    this.adService.getUserCampaigns(userId).then(response => {
      const campaigns = response.campaigns.map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        type: c.type,
        status: c.status,
        totalBudget: parseFloat(c.total_budget) || 0,
        dailyBudget: parseFloat(c.daily_budget) || 0,
        spentAmount: parseFloat(c.spent) || 0,  // Fixed: database column is 'spent', not 'spent_amount'
        remainingAmount: parseFloat(c.remaining_amount) || 0,
        currency: 'ZAR',  // South African Rand (R)
        impressions: c.impressions || 0,
        clicks: c.clicks || 0,
        conversions: c.conversions || 0,
        clickThroughRate: c.clicks > 0 && c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,  // Calculate CTR from actual data
        startDate: c.start_date,
        endDate: c.end_date,
        createdAt: c.created_at
      }));

      this.campaigns.set(campaigns);
      this.totalCampaigns.set(response.totalCount || campaigns.length);
      this.hasMore.set(campaigns.length >= this.pageSize());
      this.isLoading.set(false);
    }).catch(error => {
      console.error('Error loading campaigns:', error);
      this.errorMessage.set('Failed to load campaigns. Please try again.');
      this.isLoading.set(false);
    });
  }

  onStatusFilterChange(): void {
    this.currentPage.set(1);
    this.loadCampaigns();
  }

  onSearchChange(): void {
    // Search is done client-side via computed signal
  }

  clearFilters(): void {
    this.statusFilter.set('all');
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadCampaigns();
  }

  viewCampaignDetails(campaign: Campaign): void {
    this.selectedCampaign.set(campaign);
    this.showDetailsModal.set(true);
  }

  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.selectedCampaign.set(null);
  }

  openCreateCampaign(): void {
    // Navigate relative to parent (e.g., /business) since ads/create is a sibling of ads
    this.router.navigate(['ads', 'create'], { relativeTo: this.route.parent });
  }

  editCampaign(campaign: Campaign): void {
    // Navigate relative to parent (e.g., /business) since ads/:adId/edit is a sibling of ads
    this.router.navigate(['ads', campaign.id, 'edit'], { relativeTo: this.route.parent });
  }

  startCampaign(campaignId: string): void {
    this.adService.startCampaign(campaignId).then(() => {
      this.successMessage.set('Campaign started successfully');
      this.loadCampaigns();
      setTimeout(() => this.successMessage.set(null), 3000);
    }).catch(error => {
      console.error('Error starting campaign:', error);
      this.errorMessage.set('Failed to start campaign');
      setTimeout(() => this.errorMessage.set(null), 3000);
    });
  }

  pauseCampaign(campaignId: string): void {
    this.adService.pauseCampaign(campaignId).then(() => {
      this.successMessage.set('Campaign paused successfully');
      this.loadCampaigns();
      setTimeout(() => this.successMessage.set(null), 3000);
    }).catch(error => {
      console.error('Error pausing campaign:', error);
      this.errorMessage.set('Failed to pause campaign');
      setTimeout(() => this.errorMessage.set(null), 3000);
    });
  }

  resumeCampaign(campaignId: string): void {
    this.adService.resumeCampaign(campaignId).then(() => {
      this.successMessage.set('Campaign resumed successfully');
      this.loadCampaigns();
      setTimeout(() => this.successMessage.set(null), 3000);
    }).catch(error => {
      console.error('Error resuming campaign:', error);
      this.errorMessage.set('Failed to resume campaign');
      setTimeout(() => this.errorMessage.set(null), 3000);
    });
  }

  confirmDeleteCampaign(campaign: Campaign): void {
    this.selectedCampaign.set(campaign);
    this.showDeleteDialog.set(true);
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog.set(false);
    this.selectedCampaign.set(null);
  }

  deleteCampaign(): void {
    const campaign = this.selectedCampaign();
    if (!campaign) return;

    this.adService.deleteCampaign(campaign.id).then(() => {
      this.successMessage.set(`Campaign "${campaign.title}" deleted successfully`);
      this.closeDeleteDialog();
      this.loadCampaigns();
      setTimeout(() => this.successMessage.set(null), 3000);
    }).catch(error => {
      console.error('Error deleting campaign:', error);
      this.errorMessage.set('Failed to delete campaign');
      setTimeout(() => this.errorMessage.set(null), 3000);
    });
  }

  nextPage(): void {
    if (this.hasMore()) {
      this.currentPage.update(page => page + 1);
      this.loadCampaigns();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.loadCampaigns();
    }
  }

  getStatusBadgeClass(status: string): string {
    const classes: { [key: string]: string } = {
      'draft': 'status-draft',
      'active': 'status-active',
      'paused': 'status-paused',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return classes[status] || 'status-draft';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'draft': '📝',
      'active': '🟢',
      'paused': '⏸️',
      'completed': '✅',
      'cancelled': '❌'
    };
    return icons[status] || '📝';
  }

  formatCurrency(amount: number, currency: string = 'USD'): string {
    return this.currencyService.formatAmount(amount, currency);
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatPercentage(num: number): string {
    return num.toFixed(2) + '%';
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
