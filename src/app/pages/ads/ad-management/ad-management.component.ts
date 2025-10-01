import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AdManagementService } from '../../../core/services/ad-management.service';
import {
  AdCampaign,
  AdAnalytics,
  AdBudget,
  PaymentMethod,
  AdTransaction,
  CampaignStatus,
  AdType
} from '../../../core/models/ad-management.models';

interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  averageCTR: number;
  totalConversions: number;
  averageROAS: number;
}

@Component({
  selector: 'app-ad-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './ad-management.component.html',
  styleUrls: ['./ad-management.component.scss']
})
export class AdManagementComponent implements OnInit {
  private authService = inject(AuthService);
  private adService = inject(AdManagementService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Signals
  currentUser = this.authService.currentUser;
  campaigns = signal<AdCampaign[]>([]);
  dashboardStats = signal<DashboardStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalSpend: 0,
    totalImpressions: 0,
    totalClicks: 0,
    averageCTR: 0,
    totalConversions: 0,
    averageROAS: 0
  });
  paymentMethods = signal<PaymentMethod[]>([]);
  recentTransactions = signal<AdTransaction[]>([]);
  isLoading = signal(false);
  selectedTab = signal<'overview' | 'campaigns' | 'analytics' | 'payments'>('overview');
  showCreateCampaignModal = signal(false);

  // Computed properties
  activeCampaigns = computed(() =>
    this.campaigns().filter(campaign => campaign.status === 'active')
  );

  pausedCampaigns = computed(() =>
    this.campaigns().filter(campaign => campaign.status === 'paused')
  );

  completedCampaigns = computed(() =>
    this.campaigns().filter(campaign => campaign.status === 'completed')
  );

  totalBudgetRemaining = computed(() => {
    return this.campaigns().reduce((total, campaign) => {
      return total + campaign.budget.remainingAmount;
    }, 0);
  });

  topPerformingCampaign = computed(() => {
    const campaigns = this.campaigns();
    if (campaigns.length === 0) return null;

    return campaigns.reduce((best, current) => {
      const bestROAS = best.analytics.returnOnAdSpend;
      const currentROAS = current.analytics.returnOnAdSpend;
      return currentROAS > bestROAS ? current : best;
    });
  });

  ngOnInit(): void {
    this.loadDashboardData();
  }

  async loadDashboardData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const userId = this.currentUser()?.id;
      if (!userId) return;

      // Load campaigns
      const campaignsData = await this.adService.getUserCampaigns(userId);
      this.campaigns.set(campaignsData.campaigns);

      // Calculate dashboard stats
      this.calculateDashboardStats();

      // Load payment methods
      const paymentMethods = await this.adService.getPaymentMethods(userId);
      this.paymentMethods.set(paymentMethods);

      // Load recent transactions
      const transactions = await this.adService.getRecentTransactions(userId);
      this.recentTransactions.set(transactions);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private calculateDashboardStats(): void {
    const campaigns = this.campaigns();
    const stats: DashboardStats = {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      totalSpend: campaigns.reduce((sum, c) => sum + c.budget.spentAmount, 0),
      totalImpressions: campaigns.reduce((sum, c) => sum + c.analytics.impressions, 0),
      totalClicks: campaigns.reduce((sum, c) => sum + c.analytics.clicks, 0),
      averageCTR: 0,
      totalConversions: campaigns.reduce((sum, c) => sum + c.analytics.conversions, 0),
      averageROAS: 0
    };

    // Calculate averages
    if (stats.totalImpressions > 0) {
      stats.averageCTR = (stats.totalClicks / stats.totalImpressions) * 100;
    }

    if (campaigns.length > 0) {
      stats.averageROAS = campaigns.reduce((sum, c) => sum + c.analytics.returnOnAdSpend, 0) / campaigns.length;
    }

    this.dashboardStats.set(stats);
  }

  // Tab management
  selectTab(tab: 'overview' | 'campaigns' | 'analytics' | 'payments'): void {
    this.selectedTab.set(tab);
  }

  // Campaign management
  openCreateCampaignModal(): void {
    this.router.navigate(['ads/create'], { relativeTo: this.route });
  }

  closeCreateCampaignModal(): void {
    this.showCreateCampaignModal.set(false);
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    try {
      await this.adService.pauseCampaign(campaignId);
      await this.loadDashboardData();
    } catch (error) {
      console.error('Error pausing campaign:', error);
    }
  }

  async resumeCampaign(campaignId: string): Promise<void> {
    try {
      await this.adService.resumeCampaign(campaignId);
      await this.loadDashboardData();
    } catch (error) {
      console.error('Error resuming campaign:', error);
    }
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      await this.adService.deleteCampaign(campaignId);
      await this.loadDashboardData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  }

  // Payment management
  async addPaymentMethod(): Promise<void> {
    // This would open a payment method modal
    console.log('Add payment method');
  }

  async removePaymentMethod(paymentMethodId: string): Promise<void> {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      await this.adService.removePaymentMethod(paymentMethodId);
      await this.loadDashboardData();
    } catch (error) {
      console.error('Error removing payment method:', error);
    }
  }

  // Utility methods
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }

  formatPercentage(num: number): string {
    return `${num.toFixed(2)}%`;
  }

  getCampaignStatusClass(status: CampaignStatus): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'paused': return 'status-paused';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-draft';
    }
  }

  getAdTypeLabel(type: AdType): string {
    switch (type) {
      case 'promoted': return 'Promoted';
      case 'sponsored': return 'Sponsored';
      case 'partnership': return 'In Partnership with';
      default: return type;
    }
  }

  getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  }
}
