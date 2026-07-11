import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, DollarSign, Package, Users, TrendingUp, TrendingDown, ArrowRight, CheckCircle, Clock, XCircle, AlertTriangle, Download, BarChart3, Trophy, UserCircle, Truck, Store, UtensilsCrossed, Target, Megaphone, Star, LucideIconData } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessOwnerService } from '../../../core/services/business-owner.service';
import { CurrencyService } from '../../../core/services/currency.service';

export interface AnalyticsPeriod {
  label: string;
  value: string;
  days: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopMenuItem {
  id: string;
  name: string;
  orders: number;
  revenue: number;
  image?: string;
}

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  averageOrderValue: number;
  customerRetentionRate: number;
}

export interface OrderMetrics {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  averageOrderValue: number;
  totalRevenue: number;
}

export interface AnalyticsData {
  revenue: RevenueData[];
  topMenuItems: TopMenuItem[];
  customerMetrics: CustomerMetrics;
  orderMetrics: OrderMetrics;
  peakHours: { hour: number; orders: number }[];
  ordersByType: { type: string; count: number; percentage: number }[];
  revenueGrowth: number;
  orderGrowth: number;
  customerGrowth: number;
}

@Component({
  selector: 'app-business-analytics',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './business-analytics.component.html',
  styleUrl: './business-analytics.component.scss'
})
export class BusinessAnalyticsComponent implements OnInit {
  private authService = inject(AuthService);
  private businessOwnerService = inject(BusinessOwnerService);
  private currencyService = inject(CurrencyService);

  readonly DollarSign = DollarSign;
  readonly Package = Package;
  readonly Users = Users;
  readonly TrendingUp = TrendingUp;
  readonly TrendingDown = TrendingDown;
  readonly ArrowRight = ArrowRight;
  readonly CheckCircle = CheckCircle;
  readonly Clock = Clock;
  readonly XCircle = XCircle;
  readonly AlertTriangle = AlertTriangle;
  readonly Download = Download;
  readonly BarChart3 = BarChart3;
  readonly Trophy = Trophy;
  readonly UserCircle = UserCircle;
  readonly Truck = Truck;
  readonly Store = Store;
  readonly UtensilsCrossed = UtensilsCrossed;
  readonly Target = Target;
  readonly Megaphone = Megaphone;
  readonly Star = Star;

  loading = signal(true);
  error = signal<string | null>(null);
  analyticsData = signal<AnalyticsData | null>(null);
  selectedPeriod = signal<string>('7days');
  businessId = signal<string | null>(null);

  periods: AnalyticsPeriod[] = [
    { label: 'Last 7 Days', value: '7days', days: 7 },
    { label: 'Last 30 Days', value: '30days', days: 30 },
    { label: 'Last 90 Days', value: '90days', days: 90 },
    { label: 'Last 12 Months', value: '12months', days: 365 }
  ];

  currentPeriod = computed(() => {
    return this.periods.find(p => p.value === this.selectedPeriod()) || this.periods[0];
  });

  ngOnInit(): void {
    this.loadBusinessAndAnalytics();
  }

  loadBusinessAndAnalytics(): void {
    this.loading.set(true);
    this.error.set(null);

    this.businessOwnerService.getMyBusiness().subscribe({
      next: response => {
        if (response && response.business) {
          this.businessId.set(response.business.id);
          this.loadAnalytics();
        }
      },
      error: error => {
        console.error('Error loading business:', error);
        this.error.set('Failed to load business information');
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  loadAnalytics(): void {
    const businessId = this.businessId();
    if (!businessId) return;

    this.loading.set(true);
    this.error.set(null);

    this.businessOwnerService.getBusinessAnalytics(businessId, this.selectedPeriod()).subscribe({
      next: data => {
        if (data) {
          this.analyticsData.set(data);
        }
        this.loading.set(false);
      },
      error: error => {
        console.error('Error loading analytics:', error);
        const errorMessage = error?.error?.error || error?.message || 'Failed to load analytics data';
        console.error('Detailed error:', errorMessage);
        this.error.set(errorMessage);
        this.loading.set(false);
      }
    });
  }

  onPeriodChange(period: string): void {
    this.selectedPeriod.set(period);
    this.loadAnalytics();
  }

  formatCurrency(amount: number): string {
    return this.currencyService.formatAmount(amount);
  }

  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  formatPercentage(num: number): string {
    return `${num.toFixed(1)}%`;
  }

  getGrowthClass(growth: number): string {
    return growth >= 0 ? 'positive' : 'negative';
  }

  getGrowthIcon(growth: number): any {
    return growth >= 0 ? this.TrendingUp : this.TrendingDown;
  }

  exportData(): void {
    const data = this.analyticsData();
    if (!data) return;

    const csvContent = this.convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${this.selectedPeriod()}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private convertToCSV(data: AnalyticsData): string {
    let csv = 'Analytics Report\n\n';
    csv += 'Period,' + this.currentPeriod().label + '\n\n';

    csv += 'Revenue Data\n';
    csv += 'Date,Revenue,Orders\n';
    data.revenue.forEach(r => {
      csv += `${r.date},${r.revenue},${r.orders}\n`;
    });

    csv += '\nTop Menu Items\n';
    csv += 'Name,Orders,Revenue\n';
    data.topMenuItems.forEach(item => {
      csv += `${item.name},${item.orders},${item.revenue}\n`;
    });

    return csv;
  }

  getMaxRevenue(): number {
    const data = this.analyticsData();
    if (!data || !data.revenue.length) return 1;
    return Math.max(...data.revenue.map(r => r.revenue));
  }

  getMaxPeakOrders(): number {
    const data = this.analyticsData();
    if (!data || !data.peakHours.length) return 1;
    return Math.max(...data.peakHours.map(h => h.orders));
  }

  getOrderTypeIcon(type: string): LucideIconData {
    const iconMap: Record<string, LucideIconData> = {
      'Delivery': Truck,
      'Pickup': Store,
      'Dine-in': UtensilsCrossed
    };
    return iconMap[type] || Package;
  }

  Math = Math;
}
