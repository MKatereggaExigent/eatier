import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

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
export class AdminOverviewComponent {
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;

  // Platform statistics
  platformStats = signal<PlatformStats>({
    totalUsers: 12847,
    totalBusinesses: 1256,
    totalSpecialists: 847,
    totalFoodEnthusiasts: 3421,
    monthlyActiveUsers: 8934,
    totalRevenue: 2847392,
    monthlyRevenue: 234567,
    totalBookings: 45678,
    monthlyBookings: 3456
  });

  // Recent platform activity
  recentActivity = signal<RecentActivity[]>([
    {
      id: '1',
      type: 'business_registration',
      description: 'New restaurant registered',
      user: 'Sakura Sushi Bar',
      timestamp: new Date('2024-01-22T10:30:00'),
    },
    {
      id: '2',
      type: 'booking',
      description: 'High-value booking completed',
      user: 'Sarah Johnson',
      timestamp: new Date('2024-01-22T09:15:00'),
      amount: 1200
    },
    {
      id: '3',
      type: 'user_registration',
      description: 'New food enthusiast joined',
      user: 'Michael Chen',
      timestamp: new Date('2024-01-22T08:45:00'),
    },
    {
      id: '4',
      type: 'payment',
      description: 'Platform commission received',
      user: 'Nonna\'s Kitchen',
      timestamp: new Date('2024-01-21T16:20:00'),
      amount: 85
    },
    {
      id: '5',
      type: 'review',
      description: '5-star review posted',
      user: 'Emily Davis',
      timestamp: new Date('2024-01-21T14:10:00'),
    }
  ]);

  // System alerts
  systemAlerts = signal<SystemAlert[]>([
    {
      id: '1',
      type: 'warning',
      title: 'High Server Load',
      message: 'Server CPU usage is at 85%. Consider scaling resources.',
      timestamp: new Date('2024-01-22T11:00:00'),
      isRead: false
    },
    {
      id: '2',
      type: 'info',
      title: 'Scheduled Maintenance',
      message: 'System maintenance scheduled for Sunday 2 AM - 4 AM EST.',
      timestamp: new Date('2024-01-22T09:30:00'),
      isRead: false
    },
    {
      id: '3',
      type: 'success',
      title: 'Payment Processing',
      message: 'All pending payments have been processed successfully.',
      timestamp: new Date('2024-01-21T18:00:00'),
      isRead: true
    }
  ]);

  // Top performing businesses and specialists
  topPerformers = signal<TopPerformer[]>([
    {
      id: '1',
      name: 'The Golden Spoon',
      type: 'business',
      avatar: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=60&h=60&fit=crop',
      rating: 4.9,
      totalBookings: 234,
      monthlyRevenue: 12450,
      location: 'Manhattan, NY'
    },
    {
      id: '2',
      name: 'Chef Mario Rossi',
      type: 'specialist',
      avatar: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=60&h=60&fit=crop&crop=face',
      rating: 4.8,
      totalBookings: 156,
      monthlyRevenue: 8750,
      location: 'Brooklyn, NY'
    },
    {
      id: '3',
      name: 'Sakura Sushi Bar',
      type: 'business',
      rating: 4.7,
      totalBookings: 189,
      monthlyRevenue: 9800,
      location: 'Queens, NY'
    }
  ]);

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
