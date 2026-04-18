import { Component, signal, inject, OnInit, HostListener } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, BarChart3, Globe, UtensilsCrossed, Calendar, Star, Store, CreditCard, TrendingUp, Megaphone, Users, Settings, LogOut, Bell } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationsDropdownComponent } from '../../../core/components/notifications-dropdown/notifications-dropdown.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, NotificationsDropdownComponent]
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  // Icons
  readonly BarChart3 = BarChart3;
  readonly Globe = Globe;
  readonly UtensilsCrossed = UtensilsCrossed;
  readonly Calendar = Calendar;
  readonly Star = Star;
  readonly Store = Store;
  readonly CreditCard = CreditCard;
  readonly TrendingUp = TrendingUp;
  readonly Megaphone = Megaphone;
  readonly Users = Users;
  readonly Settings = Settings;
  readonly LogOut = LogOut;
  readonly Bell = Bell;

  // State
  mobileMenuOpen = signal(false);
  showNotifications = signal(false);
  currentUser = this.authService.currentUser;
  unreadCount = this.notificationService.unreadCount;

  ngOnInit(): void {
    // Load notifications when component initializes
    this.notificationService.loadNotifications();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(open => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleNotifications(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    console.log('Toggle notifications clicked! Current state:', this.showNotifications());
    this.showNotifications.update(show => !show);
    console.log('New state:', this.showNotifications());
  }

  closeNotifications(): void {
    this.showNotifications.set(false);
  }

  getUserInitials(): string {
    const user = this.currentUser();
    if (!user) return '?';

    const firstName = user.firstName || '';
    const lastName = user.lastName || '';

    if (firstName && lastName) {
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }

    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }

    return '?';
  }

  getUserDisplayName(): string {
    const user = this.currentUser();
    if (!user) return 'User';

    const firstName = user.firstName || '';
    const lastName = user.lastName || '';

    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }

    if (user.email) {
      return user.email.split('@')[0];
    }

    return 'User';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
