import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './unauthorized.component.html',
  styleUrls: ['./unauthorized.component.scss']
})
export class UnauthorizedComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;

  goToDashboard(): void {
    const user = this.currentUser();
    if (user) {
      const route = this.getDefaultRoute(user.role);
      this.router.navigateByUrl(route);
    } else {
      this.router.navigateByUrl('/login');
    }
  }

  private getDefaultRoute(role: string): string {
    switch (role) {
      case 'eatier':
        return '/admin';
      case 'business':
        return '/dashboard/business';
      case 'food_enthusiast':
        return '/dashboard/food-enthusiast';
      case 'normal_user':
        return '/dashboard/user';
      case 'specialist':
        return '/dashboard/specialist';
      default:
        return '/';
    }
  }
}
