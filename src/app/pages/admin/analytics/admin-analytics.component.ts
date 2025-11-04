import { Component, OnInit, inject, signal } from '@angular/core';

import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

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

  currentUser = this.authService.currentUser;

  // State management
  isLoading = signal(false);

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

  ngOnInit() {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.isLoading.set(true);

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
      },
      error: (error) => {
        console.error('Error loading analytics:', error);
        this.isLoading.set(false);
        alert('Failed to load analytics. Please try again.');
      }
    });
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
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

