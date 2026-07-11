import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

interface Statistics {
  totalUsers: number;
  totalBusinesses: number;
  totalBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
  newUsers30d: number;
  newBusinesses30d: number;
  newBookings30d: number;
  revenue30d: number;
}

interface UserGrowth {
  month: string;
  users: number;
}

interface RevenueData {
  month: string;
  revenue: number;
}

interface BookingTrend {
  month: string;
  bookings: number;
}

interface TopCountry {
  country: string;
  user_count: number;
}

interface BusinessType {
  business_type: string;
  count: number;
}

interface BookingStatus {
  status: string;
  count: number;
}

interface AIInsight {
  title: string;
  description: string;
  type: 'positive' | 'warning' | 'critical' | 'neutral';
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
}

interface RevenueForecast {
  month: string;
  predicted_total: number;
  predicted_subscription: number;
  predicted_commission: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface Anomaly {
  metric: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  impact: string;
  suggested_action: string;
}

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-analytics.component.html',
  styleUrls: ['./admin-analytics.component.scss']
})
export class AdminAnalyticsComponent implements OnInit {
  private authService = inject(AuthService);
  private adminService = inject(AdminService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;

  // State management
  isLoading = signal(false);

  // Error states
  loadError = signal<string | null>(null);
  statsError = signal<string | null>(null);

  // Toast notification
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error' | 'info'>('info');

  // Statistics
  statistics = signal<Statistics>({
    totalUsers: 0,
    totalBusinesses: 0,
    totalBookings: 0,
    confirmedBookings: 0,
    totalRevenue: 0,
    newUsers30d: 0,
    newBusinesses30d: 0,
    newBookings30d: 0,
    revenue30d: 0
  });

  // Analytics data
  userGrowth = signal<UserGrowth[]>([]);
  revenueData = signal<RevenueData[]>([]);
  bookingTrends = signal<BookingTrend[]>([]);
  topCountries = signal<TopCountry[]>([]);
  businessTypes = signal<BusinessType[]>([]);
  bookingStatus = signal<BookingStatus[]>([]);

  // AI-powered analytics
  aiInsights = signal<AIInsight[]>([]);
  revenueForecast = signal<RevenueForecast[]>([]);
  forecastTrend = signal<string>('stable');
  forecastGrowthRate = signal<number>(0);
  anomalies = signal<Anomaly[]>([]);
  isLoadingAI = signal<boolean>(false);

  ngOnInit() {
    this.loadAnalytics();
    this.loadAIInsights();
  }

  loadAnalytics(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.adminService.getAnalytics().subscribe({
      next: (response: any) => {
        // Update statistics
        this.statistics.set({
          totalUsers: parseInt(response.statistics.total_users) || 0,
          totalBusinesses: parseInt(response.statistics.total_businesses) || 0,
          totalBookings: parseInt(response.statistics.total_bookings) || 0,
          confirmedBookings: parseInt(response.statistics.confirmed_bookings) || 0,
          totalRevenue: parseFloat(response.statistics.total_revenue) || 0,
          newUsers30d: parseInt(response.statistics.new_users_30d) || 0,
          newBusinesses30d: parseInt(response.statistics.new_businesses_30d) || 0,
          newBookings30d: parseInt(response.statistics.new_bookings_30d) || 0,
          revenue30d: parseFloat(response.statistics.revenue_30d) || 0
        });

        // Update user growth
        this.userGrowth.set(
          response.userGrowth.map((item: any) => ({
            month: item.month,
            users: parseInt(item.users) || 0
          }))
        );

        // Update revenue data
        this.revenueData.set(
          response.revenueData.map((item: any) => ({
            month: item.month,
            revenue: parseFloat(item.revenue) || 0
          }))
        );

        // Update booking trends
        this.bookingTrends.set(
          response.bookingTrends.map((item: any) => ({
            month: item.month,
            bookings: parseInt(item.bookings) || 0
          }))
        );

        // Update top countries
        this.topCountries.set(
          response.topCountries.map((item: any) => ({
            country: item.country,
            user_count: parseInt(item.user_count) || 0
          }))
        );

        // Update business types
        this.businessTypes.set(
          response.businessTypes.map((item: any) => ({
            business_type: item.business_type,
            count: parseInt(item.count) || 0
          }))
        );

        // Update booking status
        this.bookingStatus.set(
          response.bookingStatus.map((item: any) => ({
            status: item.status,
            count: parseInt(item.count) || 0
          }))
        );

        this.isLoading.set(false);
        this.loadError.set(null);
      },
      error: (error) => {
        console.error('Error loading analytics:', error);
        this.loadError.set('Failed to load analytics. Please try again.');
        this.isLoading.set(false);
        this.showToast('Failed to load analytics. Please try again.', 'error');
      }
    });
  }

  retryLoadAnalytics(): void {
    this.loadAnalytics();
  }

  loadAIInsights(): void {
    this.isLoadingAI.set(true);

    this.adminService.getAIInsights().subscribe({
      next: (response) => {
        this.aiInsights.set(response.insights || []);
        this.revenueForecast.set(response.forecast || []);
        this.forecastTrend.set(response.forecastTrend || 'stable');
        this.forecastGrowthRate.set(response.forecastGrowthRate || 0);
        this.anomalies.set(response.anomalies || []);
        this.isLoadingAI.set(false);
      },
      error: (error) => {
        console.error('Error loading AI insights:', error);
        this.isLoadingAI.set(false);
        this.showToast('AI insights temporarily unavailable', 'info');
      }
    });
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
  viewAllUsers(): void {
    this.router.navigate(['/admin/users']);
  }

  viewAllBusinesses(): void {
    this.router.navigate(['/admin/businesses']);
  }

  viewAllBookings(): void {
    this.router.navigate(['/admin/bookings']);
  }

  viewUsersByCountry(country: string): void {
    // Navigate to users page with country filter
    this.router.navigate(['/admin/users'], { queryParams: { country } });
  }

  viewUsersByRole(role: string): void {
    // Navigate to users page with role filter
    this.router.navigate(['/admin/users'], { queryParams: { role } });
  }

  viewBusinessesByType(businessType: string): void {
    // Navigate to businesses page with type filter
    this.router.navigate(['/admin/businesses'], { queryParams: { type: businessType } });
  }

  viewBusinessesByPriceRange(priceRange: string): void {
    // Navigate to businesses page with price range filter
    this.router.navigate(['/admin/businesses'], { queryParams: { priceRange } });
  }

  viewBookingsByStatus(status: string): void {
    // Navigate to bookings page with status filter
    this.router.navigate(['/admin/bookings'], { queryParams: { status } });
  }

  exportAnalytics(): void {
    try {
      // Prepare data for export
      const exportData = {
        generatedAt: new Date().toISOString(),
        statistics: this.statistics(),
        userGrowth: this.userGrowth(),
        revenueData: this.revenueData(),
        bookingTrends: this.bookingTrends(),
        topCountries: this.topCountries(),
        businessTypes: this.businessTypes(),
        bookingStatus: this.bookingStatus(),
        aiInsights: this.aiInsights(),
        revenueForecast: this.revenueForecast(),
        anomalies: this.anomalies()
      };

      // Convert to CSV format
      const csv = this.convertToCSV(exportData);

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `analytics-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showToast('Analytics exported successfully!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      this.showToast('Failed to export analytics', 'error');
    }
  }

  private convertToCSV(data: any): string {
    let csv = '';

    // Add header
    csv += 'Itiyum Platform Analytics Report\n';
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    // Statistics Section
    csv += 'PLATFORM STATISTICS\n';
    csv += 'Metric,Value\n';
    const stats = data.statistics;
    csv += `Total Users,${stats.total_users}\n`;
    csv += `Business Owners,${stats.business_owners}\n`;
    csv += `Food Enthusiasts,${stats.food_enthusiasts}\n`;
    csv += `Total Businesses,${stats.total_businesses}\n`;
    csv += `Active Businesses,${stats.active_businesses}\n`;
    csv += `Total Bookings,${stats.total_bookings}\n`;
    csv += `Confirmed Bookings,${stats.confirmed_bookings}\n`;
    csv += `Completed Bookings,${stats.completed_bookings}\n`;
    csv += `Total Revenue,$${stats.total_revenue}\n`;
    csv += `Subscription Revenue,$${stats.subscription_revenue}\n`;
    csv += `Commission Revenue,$${stats.commission_revenue}\n\n`;

    // User Growth Section
    csv += 'USER GROWTH (MONTHLY)\n';
    csv += 'Month,Total Users,Business Owners,Food Enthusiasts\n';
    data.userGrowth.forEach((item: any) => {
      csv += `${item.month_label},${item.users},${item.business_owners},${item.food_enthusiasts}\n`;
    });
    csv += '\n';

    // Revenue Trends Section
    csv += 'REVENUE TRENDS (MONTHLY)\n';
    csv += 'Month,Revenue\n';
    data.revenueData.forEach((item: any) => {
      csv += `${item.month},$${item.revenue}\n`;
    });
    csv += '\n';

    // Booking Trends Section
    csv += 'BOOKING TRENDS\n';
    csv += 'Month,Total Bookings,Confirmed,Completed,Cancelled\n';
    data.bookingTrends.forEach((item: any) => {
      csv += `${item.month_label},${item.total_bookings},${item.confirmed},${item.completed},${item.cancelled}\n`;
    });
    csv += '\n';

    // Top Countries Section
    csv += 'TOP COUNTRIES\n';
    csv += 'Country,User Count\n';
    data.topCountries.forEach((item: any) => {
      csv += `${item.country},${item.user_count}\n`;
    });
    csv += '\n';

    // Business Types Section
    csv += 'BUSINESS TYPES\n';
    csv += 'Type,Count\n';
    data.businessTypes.forEach((item: any) => {
      csv += `${item.business_type},${item.count}\n`;
    });
    csv += '\n';

    // AI Insights Section
    if (data.aiInsights.length > 0) {
      csv += 'AI INSIGHTS\n';
      csv += 'Priority,Type,Title,Description,Recommendation\n';
      data.aiInsights.forEach((item: any) => {
        csv += `${item.priority},${item.type},"${item.title}","${item.description}","${item.recommendation}"\n`;
      });
      csv += '\n';
    }

    // Revenue Forecast Section
    if (data.revenueForecast.length > 0) {
      csv += 'REVENUE FORECAST\n';
      csv += 'Month,Predicted Total,Predicted Subscription,Predicted Commission,Confidence,Reasoning\n';
      data.revenueForecast.forEach((item: any) => {
        csv += `${item.month},$${item.predicted_total},$${item.predicted_subscription},$${item.predicted_commission},${item.confidence},"${item.reasoning}"\n`;
      });
      csv += '\n';
    }

    // Anomalies Section
    if (data.anomalies.length > 0) {
      csv += 'ANOMALIES DETECTED\n';
      csv += 'Severity,Metric,Description,Impact,Suggested Action\n';
      data.anomalies.forEach((item: any) => {
        csv += `${item.severity},${item.metric},"${item.description}","${item.impact}","${item.suggested_action}"\n`;
      });
    }

    return csv;
  }

  refreshAnalytics(): void {
    this.loadAnalytics();
    this.showToast('Analytics refreshed successfully!', 'success');
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }

  formatRole(role: string): string {
    // Convert snake_case to Title Case
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  formatPriceRange(priceRange: string): string {
    // Convert snake_case to Title Case
    return priceRange
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getMaxValue(data: any[], key: string): number {
    if (data.length === 0) return 1;
    return Math.max(...data.map(item => Number(item[key]) || 0));
  }

  getTotalCount(data: any[]): number {
    return data.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  }

  getRotation(data: any[], index: number): number {
    let rotation = 0;
    for (let i = 0; i < index; i++) {
      rotation += (data[i].count / this.getTotalCount(data)) * 360;
    }
    return rotation;
  }

  getDonutColor(index: number): string {
    const colors = [
      '#3b82f6', // blue
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#f59e0b', // amber
      '#10b981', // emerald
      '#06b6d4', // cyan
      '#f97316', // orange
      '#6366f1'  // indigo
    ];
    return colors[index % colors.length];
  }

  // Line chart points generator
  getLineChartPoints(data: any[], key: string): string {
    if (data.length === 0) return '';
    const maxValue = this.getMaxValue(data, key);
    return data.map((item, i) => {
      const x = 50 + (i * (500 / (data.length - 1)));
      const y = 250 - ((item[key] / maxValue) * 200);
      return `${x},${y}`;
    }).join(' ');
  }

  // Pie/Donut chart path generator
  getPieSlicePath(data: any[], index: number, cx: number, cy: number, radius: number, innerRadius: number = 0): string {
    const total = this.getTotalCount(data);
    let startAngle = 0;

    // Calculate start angle
    for (let i = 0; i < index; i++) {
      startAngle += (data[i].count / total) * 360;
    }

    const sliceAngle = (data[index].count / total) * 360;
    const endAngle = startAngle + sliceAngle;

    // Convert to radians
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;

    // Calculate outer arc points
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArc = sliceAngle > 180 ? 1 : 0;

    if (innerRadius === 0) {
      // Pie chart
      return `M ${cx},${cy} L ${x1},${y1} A ${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;
    } else {
      // Donut chart
      const x3 = cx + innerRadius * Math.cos(startRad);
      const y3 = cy + innerRadius * Math.sin(startRad);
      const x4 = cx + innerRadius * Math.cos(endRad);
      const y4 = cy + innerRadius * Math.sin(endRad);

      return `M ${x1},${y1} A ${radius},${radius} 0 ${largeArc},1 ${x2},${y2} L ${x4},${y4} A ${innerRadius},${innerRadius} 0 ${largeArc},0 ${x3},${y3} Z`;
    }
  }

  // Status color mapping
  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'pending': '#f59e0b',
      'confirmed': '#10b981',
      'cancelled': '#ef4444',
      'completed': '#3b82f6',
      'no_show': '#6b7280'
    };
    return colors[status.toLowerCase()] || '#737373';
  }

  // Business type color mapping
  getBusinessTypeColor(index: number): string {
    const colors = [
      '#0284c7', '#7c3aed', '#db2777', '#ea580c',
      '#059669', '#0891b2', '#4f46e5', '#be123c'
    ];
    return colors[index % colors.length];
  }
}

