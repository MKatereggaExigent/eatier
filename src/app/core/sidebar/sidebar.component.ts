import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { BusinessOwner } from '../../shared/models/user.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TitleCasePipe],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  // State management
  isCollapsed = signal(false);
  currentUser = this.authService.currentUser;

  // Business information
  businessName = signal('My Restaurant');
  businessType = signal('Restaurant');
  subscriptionStatus = signal<'trial' | 'active' | 'expired' | 'inactive'>('trial');
  trialDaysLeft = signal(14);
  unreadReviews = signal(3);

  // Computed properties
  businessOwner = computed(() => {
    const user = this.currentUser();
    return user && user.role === 'business' ? user as BusinessOwner : null;
  });

  ngOnInit(): void {
    this.loadBusinessInfo();
  }

  private loadBusinessInfo(): void {
    const owner = this.businessOwner();
    if (owner) {
      // Use firstName + lastName as business name since businessName doesn't exist in the model
      this.businessName.set(`${owner.firstName} ${owner.lastName}'s Restaurant`);
      this.businessType.set('Restaurant'); // Default type
      this.subscriptionStatus.set(owner.subscriptionStatus || 'trial');

      // Calculate trial days left (mock calculation)
      if (owner.subscriptionStatus === 'trial') {
        this.trialDaysLeft.set(14); // Mock value
      }
    }
  }

  // UI Methods
  toggleSidebar(): void {
    this.isCollapsed.update(collapsed => !collapsed);
  }

  getSubscriptionIcon(): string {
    switch (this.subscriptionStatus()) {
      case 'active':
        return '✅';
      case 'trial':
        return '⏰';
      case 'expired':
        return '⚠️';
      case 'inactive':
        return '⏸️';
      default:
        return '📋';
    }
  }

  // Mock method to simulate unread reviews count
  private updateUnreadReviews(): void {
    // In a real app, this would come from a service
    this.unreadReviews.set(Math.floor(Math.random() * 10));
  }

  // Logout method
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
