import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface TabItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-admin-insights',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-insights.component.html',
  styleUrls: ['./admin-insights.component.scss']
})
export class AdminInsightsComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;

  tabs: TabItem[] = [
    { path: 'overview', label: 'Overview', icon: 'bar-chart' },
    { path: 'analytics', label: 'Analytics', icon: 'trending-up' },
    { path: 'reports', label: 'Reports', icon: 'clipboard' }
  ];

  isActiveTab(path: string): boolean {
    return this.router.url.includes(path);
  }
}

