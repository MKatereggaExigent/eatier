import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  isAuthenticated = this.authService.isAuthenticated;
  showUserMenu = signal<boolean>(false);

  toggleUserMenu(): void {
    this.showUserMenu.update(show => !show);
  }

  logout(): void {
    this.authService.logout();
    this.showUserMenu.set(false);
    this.router.navigateByUrl('/');
  }

  getDashboardRoute(): string {
    const user = this.currentUser();
    if (!user) return '/auth/login';

    switch (user.role) {
      case 'business':
        return '/dashboard/business';
      case 'normal_user':
        return '/dashboard/user';
      case 'food_enthusiast':
        return '/dashboard/food-enthusiast';
      case 'specialist':
        return '/dashboard/specialist';
      case 'eatier':
        return '/admin';
      default:
        return '/';
    }
  }

  getUserRoleLabel(): string {
    const user = this.currentUser();
    if (!user) return '';

    switch (user.role) {
      case 'business':
        return 'Business Owner';
      case 'normal_user':
        return 'User';
      case 'food_enthusiast':
        return 'Food Enthusiast';
      case 'specialist':
        return 'Specialist';
      case 'eatier':
        return 'Eatier Admin';
      default:
        return '';
    }
  }
}
