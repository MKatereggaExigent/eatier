import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';

interface PlatformStats {
  totalUsers: number;
  totalBusinesses: number;
  totalSpecialists: number;
  totalFoodEnthusiasts: number;
  monthlyActiveUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalBookings: number;
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

  currentUser = this.authService.currentUser;
  isLoading = signal(true);

  // Platform statistics - initialized with zeros, will be populated from API
  platformStats = signal<PlatformStats>({
    totalUsers: 0,
    totalBusinesses: 0,
    totalSpecialists: 0,
    totalFoodEnthusiasts: 0,
    monthlyActiveUsers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalBookings: 0,
    monthlyBookings: 0
  });

  ngOnInit() {
    this.loadDashboardData();
  }

  private loadDashboardData() {
    this.isLoading.set(true);

    // Load statistics
    this.adminService.getStatistics().subscribe({
      next: (stats) => {
        this.platformStats.set({
          totalUsers: stats.totalUsers,
          totalBusinesses: stats.totalBusinesses,
          totalSpecialists: 0, // Not tracked separately yet
          totalFoodEnthusiasts: 0, // Not tracked separately yet
          monthlyActiveUsers: stats.newUsers30d,
          totalRevenue: stats.totalRevenue,
          monthlyRevenue: stats.revenue30d,
          totalBookings: stats.totalBookings,
          monthlyBookings: stats.newBookingsToday
        });
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
        this.isLoading.set(false);
      }
    });

    // Load activity
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
      },
      error: (error) => console.error('Error loading activity:', error)
    });

    // Load top performers
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
      },
      error: (error) => console.error('Error loading top performers:', error)
    });

    // Load alerts
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
      },
      error: (error) => console.error('Error loading alerts:', error)
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
    const monthlyPercentage = (stats.monthlyRevenue / stats.totalRevenue) * 100;
    return monthlyPercentage.toFixed(1);
  });

  userGrowth = computed(() => {
    const stats = this.platformStats();
    const activePercentage = (stats.monthlyActiveUsers / stats.totalUsers) * 100;
    return activePercentage.toFixed(1);
  });

  // Action methods
  markAlertAsRead(alertId: string): void {
    const alerts = this.systemAlerts();
    const updatedAlerts = alerts.map(alert =>
      alert.id === alertId ? { ...alert, isRead: true } : alert
    );
    this.systemAlerts.set(updatedAlerts);
  }

  viewUserDetails(userId: string): void {
    console.log('View user details:', userId);
    // TODO: Navigate to user details page
  }

  viewBusinessDetails(businessId: string): void {
    console.log('View business details:', businessId);
    // TODO: Navigate to business details page
  }

  viewAllUsers(): void {
    console.log('Navigate to users management');
    // TODO: Navigate to users page
  }

  viewAllBusinesses(): void {
    console.log('Navigate to businesses management');
    // TODO: Navigate to businesses page
  }

  viewAllBookings(): void {
    console.log('Navigate to bookings management');
    // TODO: Navigate to bookings page
  }

  viewAllReports(): void {
    console.log('Navigate to reports');
    // TODO: Navigate to reports page
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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
}
