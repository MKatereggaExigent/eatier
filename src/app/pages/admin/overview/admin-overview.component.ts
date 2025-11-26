import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

// Comprehensive platform statistics for hospitality subscription business
interface PlatformStats {
  // User metrics
  totalUsers: number;
  newUsers30d: number;
  newUsers7d: number;
  businessOwners: number;
  foodEnthusiasts: number;
  normalUsers: number;
  specialists: number;

  // Business metrics
  totalBusinesses: number;
  activeBusinesses: number;
  pendingBusinesses: number;
  suspendedBusinesses: number;
  newBusinesses30d: number;
  featuredBusinesses: number;
  avgBusinessRating: number;

  // Subscription metrics (CORE REVENUE STREAM #1)
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  freePlanCount: number;
  starterPlanCount: number;
  professionalPlanCount: number;
  enterprisePlanCount: number;
  monthlySubscriptionRevenue: number;
  totalPotentialRevenue: number;

  // Booking metrics (CORE REVENUE STREAM #2 - Commissions)
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  bookings30d: number;
  bookings7d: number;
  avgPartySize: number;

  // Ad metrics (CORE REVENUE STREAM #3)
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  pausedCampaigns: number;
  totalAdBudget: number;
  totalAdSpent: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  avgCTR: number;

  // Revenue breakdown (THE MONEY)
  subscriptionRevenue: number;
  adRevenue: number;
  commissionRevenue: number;
  totalRevenue: number;

  // Legacy fields for backward compatibility
  monthlyActiveUsers: number;
  monthlyRevenue: number;
  monthlyBookings: number;
}

interface RecentActivity {
  id: string;
  type: 'user_registration' | 'business_registration' | 'booking' | 'review' | 'payment';
  description: string;
  user: string;
  timestamp: Date;
  amount?: number;
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

interface TopPerformer {
  id: string;
  name: string;
  type: 'business' | 'specialist';
  avatar?: string;
  rating: number;
  totalBookings: number;
  monthlyRevenue: number;
  location: string;
}

interface GeoLocation {
  id: string;
  name: string;
  x: number;
  y: number;
  businesses: number;
  users: number;
  bookings: number;
  value: number; // Current metric value based on selected filter
}

interface RegionalStats {
  id: string;
  name: string;
  businesses: number;
  users: number;
  bookings: number;
  value: number; // Current metric value based on selected filter
}

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-overview.component.html',
  styleUrls: ['./admin-overview.component.scss']
})
export class AdminOverviewComponent implements OnInit {
  private authService = inject(AuthService);
  private adminService = inject(AdminService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  isLoading = signal(true);
  isLoadingActivity = signal(true);
  isLoadingAlerts = signal(true);
  isLoadingPerformers = signal(true);

  // Error states
  statsError = signal<string | null>(null);
  activityError = signal<string | null>(null);
  alertsError = signal<string | null>(null);
  performersError = signal<string | null>(null);

  // Time range filter
  timeRange = signal<'7d' | '30d' | '90d' | 'all'>('30d');

  // Date range filter
  startDate = signal<string>(this.getDefaultStartDate());
  endDate = signal<string>(this.getDefaultEndDate());

  // Geographical data
  geoMetric = signal<'businesses' | 'users' | 'bookings'>('businesses');
  isLoadingGeoData = signal<boolean>(false);
  geoError = signal<string | null>(null);
  geoLocations = signal<GeoLocation[]>([]);
  topRegions = signal<RegionalStats[]>([]);
  activeLocationTooltip = signal<GeoLocation | null>(null);
  tooltipX = signal<number>(0);
  tooltipY = signal<number>(0);

  // Platform statistics - initialized with zeros, will be populated from API
  platformStats = signal<PlatformStats>({
    // User metrics
    totalUsers: 0,
    newUsers30d: 0,
    newUsers7d: 0,
    businessOwners: 0,
    foodEnthusiasts: 0,
    normalUsers: 0,
    specialists: 0,

    // Business metrics
    totalBusinesses: 0,
    activeBusinesses: 0,
    pendingBusinesses: 0,
    suspendedBusinesses: 0,
    newBusinesses30d: 0,
    featuredBusinesses: 0,
    avgBusinessRating: 0,

    // Subscription metrics
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    cancelledSubscriptions: 0,
    expiredSubscriptions: 0,
    freePlanCount: 0,
    starterPlanCount: 0,
    professionalPlanCount: 0,
    enterprisePlanCount: 0,
    monthlySubscriptionRevenue: 0,
    totalPotentialRevenue: 0,

    // Booking metrics
    totalBookings: 0,
    confirmedBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    bookings30d: 0,
    bookings7d: 0,
    avgPartySize: 0,

    // Ad metrics
    totalCampaigns: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    pausedCampaigns: 0,
    totalAdBudget: 0,
    totalAdSpent: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
    avgCTR: 0,

    // Revenue breakdown
    subscriptionRevenue: 0,
    adRevenue: 0,
    commissionRevenue: 0,
    totalRevenue: 0,

    // Legacy fields
    monthlyActiveUsers: 0,
    monthlyRevenue: 0,
    monthlyBookings: 0
  });

  ngOnInit() {
    this.loadDashboardData();
    this.loadGeoData();
  }

  private loadDashboardData() {
    this.isLoading.set(true);
    this.statsError.set(null);

    // Load comprehensive statistics
    this.adminService.getStatistics().subscribe({
      next: (stats) => {
        this.platformStats.set({
          // User metrics
          totalUsers: stats.totalUsers || 0,
          newUsers30d: stats.newUsers30d || 0,
          newUsers7d: stats.newUsers7d || 0,
          businessOwners: stats.businessOwners || 0,
          foodEnthusiasts: stats.foodEnthusiasts || 0,
          normalUsers: stats.normalUsers || 0,
          specialists: stats.specialists || 0,

          // Business metrics
          totalBusinesses: stats.totalBusinesses || 0,
          activeBusinesses: stats.activeBusinesses || 0,
          pendingBusinesses: stats.pendingBusinesses || 0,
          suspendedBusinesses: stats.suspendedBusinesses || 0,
          newBusinesses30d: stats.newBusinesses30d || 0,
          featuredBusinesses: stats.featuredBusinesses || 0,
          avgBusinessRating: stats.avgBusinessRating || 0,

          // Subscription metrics
          totalSubscriptions: stats.totalSubscriptions || 0,
          activeSubscriptions: stats.activeSubscriptions || 0,
          cancelledSubscriptions: stats.cancelledSubscriptions || 0,
          expiredSubscriptions: stats.expiredSubscriptions || 0,
          freePlanCount: stats.freePlanCount || 0,
          starterPlanCount: stats.starterPlanCount || 0,
          professionalPlanCount: stats.professionalPlanCount || 0,
          enterprisePlanCount: stats.enterprisePlanCount || 0,
          monthlySubscriptionRevenue: stats.monthlySubscriptionRevenue || 0,
          totalPotentialRevenue: stats.totalPotentialRevenue || 0,

          // Booking metrics
          totalBookings: stats.totalBookings || 0,
          confirmedBookings: stats.confirmedBookings || 0,
          completedBookings: stats.completedBookings || 0,
          cancelledBookings: stats.cancelledBookings || 0,
          bookings30d: stats.bookings30d || 0,
          bookings7d: stats.bookings7d || 0,
          avgPartySize: stats.avgPartySize || 0,

          // Ad metrics
          totalCampaigns: stats.totalCampaigns || 0,
          activeCampaigns: stats.activeCampaigns || 0,
          completedCampaigns: stats.completedCampaigns || 0,
          pausedCampaigns: stats.pausedCampaigns || 0,
          totalAdBudget: stats.totalAdBudget || 0,
          totalAdSpent: stats.totalAdSpent || 0,
          totalImpressions: stats.totalImpressions || 0,
          totalClicks: stats.totalClicks || 0,
          totalConversions: stats.totalConversions || 0,
          avgCTR: stats.avgCTR || 0,

          // Revenue breakdown
          subscriptionRevenue: stats.subscriptionRevenue || 0,
          adRevenue: stats.adRevenue || 0,
          commissionRevenue: stats.commissionRevenue || 0,
          totalRevenue: stats.totalRevenue || 0,

          // Legacy fields
          monthlyActiveUsers: stats.newUsers30d || 0,
          monthlyRevenue: stats.totalRevenue || 0,
          monthlyBookings: stats.bookings30d || 0
        });
        this.isLoading.set(false);
        this.statsError.set(null);
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
        this.statsError.set('Failed to load statistics. Please try again.');
        this.isLoading.set(false);
      }
    });

    // Load activity
    this.isLoadingActivity.set(true);
    this.activityError.set(null);
    this.adminService.getActivity(10).subscribe({
      next: (activities) => {
        const mappedActivities: RecentActivity[] = activities.map(act => ({
          id: act.id,
          type: this.mapActivityType(act.action_type),
          description: act.description,
          user: act.metadata?.user || 'System',
          timestamp: new Date(act.created_at),
          amount: act.metadata?.amount
        }));
        this.recentActivity.set(mappedActivities);
        this.isLoadingActivity.set(false);
        this.activityError.set(null);
      },
      error: (error) => {
        console.error('Error loading activity:', error);
        this.activityError.set('Failed to load recent activity.');
        this.isLoadingActivity.set(false);
      }
    });

    // Load top performers
    this.isLoadingPerformers.set(true);
    this.performersError.set(null);
    this.adminService.getTopPerformers(5).subscribe({
      next: (performers) => {
        const mappedPerformers: TopPerformer[] = performers.map(p => ({
          id: p.id,
          name: p.name,
          type: 'business',
          rating: p.rating,
          totalBookings: p.total_bookings,
          monthlyRevenue: p.total_revenue,
          location: p.location
        }));
        this.topPerformers.set(mappedPerformers);
        this.isLoadingPerformers.set(false);
        this.performersError.set(null);
      },
      error: (error) => {
        console.error('Error loading top performers:', error);
        this.performersError.set('Failed to load top performers.');
        this.isLoadingPerformers.set(false);
      }
    });

    // Load alerts
    this.isLoadingAlerts.set(true);
    this.alertsError.set(null);
    this.adminService.getAlerts().subscribe({
      next: (alerts) => {
        const mappedAlerts: SystemAlert[] = alerts.map(a => ({
          id: a.id,
          type: a.type,
          title: a.title,
          message: a.message,
          timestamp: new Date(a.createdAt),
          isRead: a.isRead
        }));
        this.systemAlerts.set(mappedAlerts);
        this.isLoadingAlerts.set(false);
        this.alertsError.set(null);
      },
      error: (error) => {
        console.error('Error loading alerts:', error);
        this.alertsError.set('Failed to load system alerts.');
        this.isLoadingAlerts.set(false);
      }
    });
  }

  private mapActivityType(actionType: string): RecentActivity['type'] {
    const typeMap: Record<string, RecentActivity['type']> = {
      'user_registration': 'user_registration',
      'business_registration': 'business_registration',
      'booking': 'booking',
      'review': 'review',
      'payment': 'payment'
    };
    return typeMap[actionType] || 'user_registration';
  }

  // Recent platform activity - will be populated from API
  recentActivity = signal<RecentActivity[]>([]);

  // System alerts - will be populated from API
  systemAlerts = signal<SystemAlert[]>([]);

  // Top performing businesses and specialists - will be populated from API
  topPerformers = signal<TopPerformer[]>([]);

  // Computed properties
  unreadAlerts = computed(() =>
    this.systemAlerts().filter(alert => !alert.isRead)
  );

  revenueGrowth = computed(() => {
    const stats = this.platformStats();
    if (stats.totalRevenue === 0) return 0;
    const monthlyPercentage = (stats.monthlyRevenue / stats.totalRevenue) * 100;
    return parseFloat(monthlyPercentage.toFixed(1));
  });

  userGrowth = computed(() => {
    const stats = this.platformStats();
    if (stats.totalUsers === 0) return 0;
    const activePercentage = (stats.monthlyActiveUsers / stats.totalUsers) * 100;
    return parseFloat(activePercentage.toFixed(1));
  });

  bookingsGrowth = computed(() => {
    const stats = this.platformStats();
    if (stats.totalBookings === 0) return 0;
    const monthlyPercentage = (stats.monthlyBookings / stats.totalBookings) * 100;
    return parseFloat(monthlyPercentage.toFixed(1));
  });

  // Business-focused computed properties

  // Subscription health: % of businesses with active subscriptions
  subscriptionRate = computed(() => {
    const stats = this.platformStats();
    if (stats.totalBusinesses === 0) return 0;
    return parseFloat(((stats.activeSubscriptions / stats.totalBusinesses) * 100).toFixed(1));
  });

  // Churn rate: % of cancelled subscriptions
  churnRate = computed(() => {
    const stats = this.platformStats();
    if (stats.totalSubscriptions === 0) return 0;
    return parseFloat(((stats.cancelledSubscriptions / stats.totalSubscriptions) * 100).toFixed(1));
  });

  // Average revenue per business (ARPU)
  avgRevenuePerBusiness = computed(() => {
    const stats = this.platformStats();
    if (stats.activeBusinesses === 0) return 0;
    return parseFloat((stats.totalRevenue / stats.activeBusinesses).toFixed(2));
  });

  // Booking conversion rate: % of confirmed bookings
  bookingConversionRate = computed(() => {
    const stats = this.platformStats();
    if (stats.totalBookings === 0) return 0;
    return parseFloat(((stats.confirmedBookings / stats.totalBookings) * 100).toFixed(1));
  });

  // Revenue mix percentages
  subscriptionRevenuePercent = computed(() => {
    const stats = this.platformStats();
    if (stats.totalRevenue === 0) return 0;
    return parseFloat(((stats.subscriptionRevenue / stats.totalRevenue) * 100).toFixed(1));
  });

  commissionRevenuePercent = computed(() => {
    const stats = this.platformStats();
    if (stats.totalRevenue === 0) return 0;
    return parseFloat(((stats.commissionRevenue / stats.totalRevenue) * 100).toFixed(1));
  });

  adRevenuePercent = computed(() => {
    const stats = this.platformStats();
    if (stats.totalRevenue === 0) return 0;
    return parseFloat(((stats.adRevenue / stats.totalRevenue) * 100).toFixed(1));
  });

  // Platform health score (0-100)
  platformHealthScore = computed(() => {
    const stats = this.platformStats();
    let score = 0;

    // Active businesses (30 points)
    if (stats.totalBusinesses > 0) {
      score += (stats.activeBusinesses / stats.totalBusinesses) * 30;
    }

    // Subscription rate (25 points)
    if (stats.totalBusinesses > 0) {
      score += (stats.activeSubscriptions / stats.totalBusinesses) * 25;
    }

    // Booking conversion (25 points)
    if (stats.totalBookings > 0) {
      score += (stats.confirmedBookings / stats.totalBookings) * 25;
    }

    // Revenue growth (20 points)
    if (stats.totalRevenue > 0) {
      score += Math.min((stats.monthlyRevenue / stats.totalRevenue) * 100, 20);
    }

    return Math.round(score);
  });

  // Helper methods for charts and percentages

  getPlanPercentage(plan: 'free' | 'starter' | 'professional' | 'enterprise'): number {
    const stats = this.platformStats();
    const total = stats.totalSubscriptions;
    if (total === 0) return 0;

    let count = 0;
    switch (plan) {
      case 'free':
        count = stats.freePlanCount;
        break;
      case 'starter':
        count = stats.starterPlanCount;
        break;
      case 'professional':
        count = stats.professionalPlanCount;
        break;
      case 'enterprise':
        count = stats.enterprisePlanCount;
        break;
    }

    return parseFloat(((count / total) * 100).toFixed(1));
  }

  getBusinessActivePercent(): number {
    const stats = this.platformStats();
    if (stats.totalBusinesses === 0) return 0;
    return parseFloat(((stats.activeBusinesses / stats.totalBusinesses) * 100).toFixed(1));
  }

  // Action methods
  markAlertAsRead(alertId: string): void {
    const alerts = this.systemAlerts();
    const updatedAlerts = alerts.map(alert =>
      alert.id === alertId ? { ...alert, isRead: true } : alert
    );
    this.systemAlerts.set(updatedAlerts);
    // TODO: Call backend API to mark alert as read
  }

  viewUserDetails(userId: string): void {
    this.router.navigate(['/admin/users', userId]);
  }

  viewBusinessDetails(businessId: string): void {
    this.router.navigate(['/admin/businesses', businessId]);
  }

  viewAllUsers(): void {
    this.router.navigate(['/admin/users']);
  }

  viewAllBusinesses(): void {
    this.router.navigate(['/admin/businesses']);
  }

  viewAllBookings(): void {
    this.router.navigate(['/admin/bookings']);
  }

  viewAllReports(): void {
    this.router.navigate(['/admin/analytics']);
  }

  onTimeRangeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value as '7d' | '30d' | '90d' | 'all';
    this.timeRange.set(value);

    // TODO: In production, this would filter the data based on time range
    // For now, we'll just reload the dashboard
    this.loadDashboardData();
  }

  refreshDashboard(): void {
    this.loadDashboardData();
  }

  exportDashboard(): void {
    const stats = this.platformStats();

    // Create CSV content
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Revenue', `$${stats.totalRevenue.toFixed(2)}`],
      ['Subscription Revenue', `$${stats.subscriptionRevenue.toFixed(2)}`],
      ['Commission Revenue', `$${stats.commissionRevenue.toFixed(2)}`],
      ['Ad Revenue', `$${stats.adRevenue.toFixed(2)}`],
      ['Monthly Recurring Revenue', `$${stats.monthlySubscriptionRevenue.toFixed(2)}`],
      [''],
      ['Total Users', stats.totalUsers.toString()],
      ['Business Owners', stats.businessOwners.toString()],
      ['Food Enthusiasts', stats.foodEnthusiasts.toString()],
      [''],
      ['Total Businesses', stats.totalBusinesses.toString()],
      ['Active Businesses', stats.activeBusinesses.toString()],
      ['Pending Businesses', stats.pendingBusinesses.toString()],
      [''],
      ['Total Subscriptions', stats.totalSubscriptions.toString()],
      ['Active Subscriptions', stats.activeSubscriptions.toString()],
      ['Churn Rate', `${this.churnRate()}%`],
      [''],
      ['Total Bookings', stats.totalBookings.toString()],
      ['Confirmed Bookings', stats.confirmedBookings.toString()],
      ['Completed Bookings', stats.completedBookings.toString()],
      ['Booking Conversion Rate', `${this.bookingConversionRate()}%`],
      [''],
      ['Platform Health Score', this.platformHealthScore().toString()],
    ].map(row => row.join(',')).join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `itiyum-dashboard-${date}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  retryLoadStats(): void {
    this.loadDashboardData();
  }

  retryLoadActivity(): void {
    this.isLoadingActivity.set(true);
    this.activityError.set(null);
    this.adminService.getActivity(10).subscribe({
      next: (activities) => {
        const mappedActivities: RecentActivity[] = activities.map(act => ({
          id: act.id,
          type: this.mapActivityType(act.action_type),
          description: act.description,
          user: act.metadata?.user || 'System',
          timestamp: new Date(act.created_at),
          amount: act.metadata?.amount
        }));
        this.recentActivity.set(mappedActivities);
        this.isLoadingActivity.set(false);
      },
      error: (error) => {
        console.error('Error loading activity:', error);
        this.activityError.set('Failed to load recent activity.');
        this.isLoadingActivity.set(false);
      }
    });
  }

  retryLoadAlerts(): void {
    this.isLoadingAlerts.set(true);
    this.alertsError.set(null);
    this.adminService.getAlerts().subscribe({
      next: (alerts) => {
        const mappedAlerts: SystemAlert[] = alerts.map(a => ({
          id: a.id,
          type: a.type,
          title: a.title,
          message: a.message,
          timestamp: new Date(a.createdAt),
          isRead: a.isRead
        }));
        this.systemAlerts.set(mappedAlerts);
        this.isLoadingAlerts.set(false);
      },
      error: (error) => {
        console.error('Error loading alerts:', error);
        this.alertsError.set('Failed to load system alerts.');
        this.isLoadingAlerts.set(false);
      }
    });
  }

  retryLoadPerformers(): void {
    this.isLoadingPerformers.set(true);
    this.performersError.set(null);
    this.adminService.getTopPerformers(5).subscribe({
      next: (performers) => {
        const mappedPerformers: TopPerformer[] = performers.map(p => ({
          id: p.id,
          name: p.name,
          type: 'business',
          rating: p.rating,
          totalBookings: p.total_bookings,
          monthlyRevenue: p.total_revenue,
          location: p.location
        }));
        this.topPerformers.set(mappedPerformers);
        this.isLoadingPerformers.set(false);
      },
      error: (error) => {
        console.error('Error loading top performers:', error);
        this.performersError.set('Failed to load top performers.');
        this.isLoadingPerformers.set(false);
      }
    });
  }

  // Utility methods
  getCurrentDate(): string {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date());
  }

  formatCurrency(amount: number): string {
    // For large amounts, show no decimals. For small amounts, show 2 decimals
    const decimals = amount >= 1000 ? 0 : 2;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount).replace('$', '');
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getActivityIcon(type: string): string {
    const icons = {
      user_registration: '👤',
      business_registration: '🏪',
      booking: '📅',
      review: '⭐',
      payment: '💰'
    };
    return icons[type as keyof typeof icons] || '📋';
  }

  getActivityColor(type: string): string {
    const colors = {
      user_registration: 'activity-user',
      business_registration: 'activity-business',
      booking: 'activity-booking',
      review: 'activity-review',
      payment: 'activity-payment'
    };
    return colors[type as keyof typeof colors] || 'activity-default';
  }

  getAlertIcon(type: string): string {
    const icons = {
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️',
      success: '✅'
    };
    return icons[type as keyof typeof icons] || '📋';
  }

  getAlertClass(type: string): string {
    return `alert-${type}`;
  }

  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < Math.floor(rating));
  }

  // Date range methods
  getDefaultStartDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  }

  getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  onStartDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.startDate.set(input.value);
    // TODO: Reload data with new date range
    this.loadDashboardData();
  }

  onEndDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.endDate.set(input.value);
    // TODO: Reload data with new date range
    this.loadDashboardData();
  }

  // Geographical methods
  setGeoMetric(metric: 'businesses' | 'users' | 'bookings'): void {
    this.geoMetric.set(metric);
    this.updateGeoLocations();
  }

  updateGeoLocations(): void {
    const metric = this.geoMetric();
    const locations = this.geoLocations();

    // Update the value property based on selected metric
    const updatedLocations = locations.map(loc => ({
      ...loc,
      value: metric === 'businesses' ? loc.businesses :
             metric === 'users' ? loc.users :
             loc.bookings
    }));

    this.geoLocations.set(updatedLocations);

    // Update top regions
    const regions = this.topRegions();
    const updatedRegions = regions.map(reg => ({
      ...reg,
      value: metric === 'businesses' ? reg.businesses :
             metric === 'users' ? reg.users :
             reg.bookings
    }));

    this.topRegions.set(updatedRegions);
  }

  loadGeoData(): void {
    this.isLoadingGeoData.set(true);
    this.geoError.set(null);

    this.adminService.getGeographicalDistribution().subscribe({
      next: (data) => {
        // Convert locations with lat/long to SVG coordinates
        const locationsWithCoords = data.locations.map(loc => {
          const metric = this.geoMetric();
          return {
            ...loc,
            x: this.longitudeToX(loc.longitude),
            y: this.latitudeToY(loc.latitude),
            value: metric === 'businesses' ? loc.businesses :
                   metric === 'users' ? loc.users :
                   loc.bookings
          };
        });

        // Set value for regions based on current metric
        const regionsWithValues = data.regions.map(reg => {
          const metric = this.geoMetric();
          return {
            ...reg,
            value: metric === 'businesses' ? reg.businesses :
                   metric === 'users' ? reg.users :
                   reg.bookings
          };
        });

        this.geoLocations.set(locationsWithCoords);
        this.topRegions.set(regionsWithValues);
        this.isLoadingGeoData.set(false);
      },
      error: (error) => {
        console.error('Error loading geographical data:', error);
        this.geoError.set('Failed to load geographical distribution. Please try again.');
        this.isLoadingGeoData.set(false);
      }
    });
  }

  // Convert longitude to SVG X coordinate
  // Uganda's longitude range is approximately 29.5°E to 35.0°E
  private longitudeToX(longitude: number): number {
    const minLon = 29.5;
    const maxLon = 35.0;
    const svgWidth = 1000;

    // Clamp longitude to Uganda's range
    const clampedLon = Math.max(minLon, Math.min(maxLon, longitude));

    // Convert to 0-1 range, then to SVG coordinates
    const normalized = (clampedLon - minLon) / (maxLon - minLon);
    return normalized * svgWidth;
  }

  // Convert latitude to SVG Y coordinate
  // Uganda's latitude range is approximately -1.5°S to 4.2°N
  private latitudeToY(latitude: number): number {
    const minLat = -1.5;
    const maxLat = 4.2;
    const svgHeight = 600;

    // Clamp latitude to Uganda's range
    const clampedLat = Math.max(minLat, Math.min(maxLat, latitude));

    // Convert to 0-1 range (inverted because SVG Y increases downward)
    const normalized = (maxLat - clampedLat) / (maxLat - minLat);
    return normalized * svgHeight;
  }

  retryLoadGeoData(): void {
    this.loadGeoData();
  }

  getBubbleRadius(location: GeoLocation): number {
    const value = location.value;
    const maxValue = Math.max(...this.geoLocations().map(l => l.value));
    const minRadius = 15;
    const maxRadius = 50;

    if (maxValue === 0) return minRadius;
    return minRadius + ((value / maxValue) * (maxRadius - minRadius));
  }

  getBubbleColor(location: GeoLocation): string {
    const metric = this.geoMetric();
    if (metric === 'businesses') return '#3b82f6'; // Blue
    if (metric === 'users') return '#10b981'; // Green
    return '#f59e0b'; // Orange for bookings
  }

  showLocationTooltip(location: GeoLocation, event: MouseEvent): void {
    this.activeLocationTooltip.set(location);
    const target = event.target as SVGElement;
    const svg = target.closest('svg');
    if (svg) {
      const rect = svg.getBoundingClientRect();
      this.tooltipX.set(location.x + rect.left);
      this.tooltipY.set(location.y + rect.top - 100);
    }
  }

  hideLocationTooltip(): void {
    this.activeLocationTooltip.set(null);
  }

  getRegionPercentage(region: RegionalStats): number {
    const maxValue = Math.max(...this.topRegions().map(r => r.value));
    if (maxValue === 0) return 0;
    return (region.value / maxValue) * 100;
  }
}
