import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, DollarSign, Package, Users, TrendingUp, TrendingDown, ArrowRight, CheckCircle, Clock, XCircle, AlertTriangle, Download, BarChart3 } from 'lucide-angular';
import { Subject, takeUntil, catchError, of, finalize } from 'rxjs';
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
export class BusinessAnalyticsComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private businessOwnerService = inject(BusinessOwnerService);
  private currencyService = inject(CurrencyService);
  private destroy$ = new Subject<void>();

  // Lucide Icons
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

  // State
  loading = signal(true);
  error = signal<string | null>(null);
  analyticsData = signal<AnalyticsData | null>(null);
  selectedPeriod = signal<string>('7days');
  businessId = signal<string | null>(null);

  // Available periods
  periods: AnalyticsPeriod[] = [
    { label: 'Last 7 Days', value: '7days', days: 7 },
    { label: 'Last 30 Days', value: '30days', days: 30 },
    { label: 'Last 90 Days', value: '90days', days: 90 },
    { label: 'Last 12 Months', value: '12months', days: 365 }
  ];

  // Computed
  currentPeriod = computed(() => {
    return this.periods.find(p => p.value === this.selectedPeriod()) || this.periods[0];
  });

  ngOnInit(): void {
    this.loadBusinessAndAnalytics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBusinessAndAnalytics(): void {
    this.loading.set(true);
    this.error.set(null);

    this.businessOwnerService.getMyBusiness()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading business:', error);
          this.error.set('Failed to load business information');
          return of(null);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(response => {
        if (response && response.business) {
          this.businessId.set(response.business.id);
          this.loadAnalytics();
        }
      });
  }

  loadAnalytics(): void {
    const businessId = this.businessId();
    if (!businessId) return;

    this.loading.set(true);
    this.error.set(null);

    // Call analytics API
    this.businessOwnerService.getBusinessAnalytics(businessId, this.selectedPeriod())
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading analytics:', error);
          const errorMessage = error?.error?.error || error?.message || 'Failed to load analytics data';
          console.error('Detailed error:', errorMessage);
          this.error.set(errorMessage);
          // Generate mock data for development
          this.generateMockData();
          return of(null);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(data => {
        if (data) {
          this.analyticsData.set(data);
        }
      });
  }

  generateMockData(): void {
    const days = this.currentPeriod().days;
    const revenue: RevenueData[] = [];
    const today = new Date();

    // Generate revenue data
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      revenue.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 50000) + 10000,
        orders: Math.floor(Math.random() * 50) + 10
      });
    }

    const mockData: AnalyticsData = {
      revenue,
      topMenuItems: [
        { id: '1', name: 'Grilled Chicken Salad', orders: 145, revenue: 36250, image: '' },
        { id: '2', name: 'Beef Burger Deluxe', orders: 132, revenue: 39600, image: '' },
        { id: '3', name: 'Vegetarian Pizza', orders: 98, revenue: 24500, image: '' },
        { id: '4', name: 'Fish & Chips', orders: 87, revenue: 21750, image: '' },
        { id: '5', name: 'Pasta Carbonara', orders: 76, revenue: 19000, image: '' }
      ],
      customerMetrics: {
        totalCustomers: 1247,
        newCustomers: 342,
        returningCustomers: 905,
        averageOrderValue: 28500,
        customerRetentionRate: 72.6
      },
      orderMetrics: {
        totalOrders: 1856,
        completedOrders: 1723,
        cancelledOrders: 89,
        pendingOrders: 44,
        averageOrderValue: 28500,
        totalRevenue: 52896000
      },
      peakHours: [
        { hour: 12, orders: 234 },
        { hour: 13, orders: 198 },
        { hour: 18, orders: 287 },
        { hour: 19, orders: 312 },
        { hour: 20, orders: 245 }
      ],
      ordersByType: [
        { type: 'Delivery', count: 1112, percentage: 59.9 },
        { type: 'Pickup', count: 556, percentage: 30.0 },
        { type: 'Dine-in', count: 188, percentage: 10.1 }
      ],
      revenueGrowth: 15.3,
      orderGrowth: 12.7,
      customerGrowth: 18.2
    };

    this.analyticsData.set(mockData);
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

  // Expose Math for template
  Math = Math;
}
