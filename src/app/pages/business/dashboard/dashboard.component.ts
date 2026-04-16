import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../../core/sidebar/sidebar.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  imports: [SidebarComponent, RouterOutlet]
})
export class DashboardComponent {
  @ViewChild(SidebarComponent) sidebar!: SidebarComponent;

  constructor(private authService: AuthService) {}

  getUserInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return '?';

    const firstName = user.first_name || '';
    const lastName = user.last_name || '';

    if (firstName && lastName) {
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }

    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }

    return '?';
  }
}
