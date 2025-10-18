import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';

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
}

