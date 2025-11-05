import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';

import { HttpClient } from '@angular/common/http';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'booking' | 'review' | 'message';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3001/api';

  notifications = signal<Notification[]>([]);
  unreadCount = signal<number>(0);
  isLoading = signal<boolean>(false);
  private isInitialized = false;

  constructor() {
    // Don't load on construction - let component trigger it when authenticated
  }

  loadNotifications(): void {
    if (this.isInitialized) {
      return; // Already loaded
    }

    this.isInitialized = true;
    this.isLoading.set(true);

    // Try API first, fall back to mock data
    this.http.get<Notification[]>(`${this.apiUrl}/notifications`)
      .pipe(
        tap(notifications => {
          this.notifications.set(notifications);
          this.updateUnreadCount();
          this.isLoading.set(false);
        }),
        catchError(error => {
          console.error('Error loading notifications, using mock data:', error);
          this.isLoading.set(false);
          // Use mock notifications for demo
          this.loadMockNotifications();
          return of([]);
        })
      )
      .subscribe();
  }

  markAsRead(notificationId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/notifications/${notificationId}/read`, {})
      .pipe(
        tap(() => {
          const notifications = this.notifications();
          const updated = notifications.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          );
          this.notifications.set(updated);
          this.updateUnreadCount();
        }),
        catchError(error => {
          console.error('Error marking notification as read:', error);
          // Update locally anyway
          const notifications = this.notifications();
          const updated = notifications.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          );
          this.notifications.set(updated);
          this.updateUnreadCount();
          return of(null);
        })
      );
  }

  markAllAsRead(): void {
    this.http.patch(`${this.apiUrl}/notifications/read-all`, {})
      .pipe(
        tap(() => {
          const notifications = this.notifications();
          const updated = notifications.map(n => ({ ...n, read: true }));
          this.notifications.set(updated);
          this.updateUnreadCount();
        }),
        catchError(error => {
          console.error('Error marking all notifications as read:', error);
          // Update locally anyway
          const notifications = this.notifications();
          const updated = notifications.map(n => ({ ...n, read: true }));
          this.notifications.set(updated);
          this.updateUnreadCount();
          return of(null);
        })
      )
      .subscribe();
  }

  deleteNotification(notificationId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/notifications/${notificationId}`)
      .pipe(
        tap(() => {
          const notifications = this.notifications();
          const updated = notifications.filter(n => n.id !== notificationId);
          this.notifications.set(updated);
          this.updateUnreadCount();
        }),
        catchError(error => {
          console.error('Error deleting notification:', error);
          return of(null);
        })
      );
  }

  private updateUnreadCount(): void {
    const count = this.notifications().filter(n => !n.read).length;
    this.unreadCount.set(count);
  }

  private loadMockNotifications(): void {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'booking',
        title: 'Booking Confirmed',
        message: 'Your table reservation at The Savory Kitchen has been confirmed for tomorrow at 7:00 PM.',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        read: false,
        actionUrl: '/dashboard/bookings',
        icon: '📅'
      },
      {
        id: '2',
        type: 'review',
        title: 'New Review',
        message: 'Someone left a 5-star review for your restaurant!',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        read: false,
        actionUrl: '/dashboard/reviews',
        icon: '⭐'
      },
      {
        id: '3',
        type: 'success',
        title: 'Payment Successful',
        message: 'Your payment of $45.00 has been processed successfully.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        read: true,
        icon: '✅'
      },
      {
        id: '4',
        type: 'info',
        title: 'Profile Update',
        message: 'Your profile has been successfully updated.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        read: true,
        icon: 'ℹ️'
      },
      {
        id: '5',
        type: 'message',
        title: 'New Message',
        message: 'You have a new message from Urban Brew Cafe.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
        read: true,
        actionUrl: '/messages',
        icon: '💬'
      }
    ];

    this.notifications.set(mockNotifications);
    this.updateUnreadCount();
  }

  getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }
}
