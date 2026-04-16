import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notifications-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-dropdown.component.html',
  styleUrl: './notifications-dropdown.component.scss'
})
export class NotificationsDropdownComponent {
  @Output() close = new EventEmitter<void>();
  
  private router = inject(Router);
  notificationService = inject(NotificationService);
  
  notifications = this.notificationService.notifications;
  unreadCount = this.notificationService.unreadCount;

  markAsRead(notification: any, event: Event): void {
    event.stopPropagation();
    this.notificationService.markAsRead(notification.id);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  deleteNotification(id: string, event: Event): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(id);
  }

  navigateToNotification(notification: any): void {
    if (notification.data?.action_url) {
      this.router.navigateByUrl(notification.data.action_url);
      this.markAsRead(notification, new Event('click'));
      this.close.emit();
    }
  }

  getTimeAgo(timestamp?: string | Date): string {
    if (!timestamp) return 'Recently';

    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffMs = now.getTime() - notificationTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks}w ago`;
  }
}
