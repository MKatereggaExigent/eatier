import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';

interface UserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  tenantId: string | null;
  tenantName: string | null;
  status: string;
  emailVerified: boolean;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  totalBookings: number;
  totalReviews: number;
  totalFavorites: number;
  businessId: string | null;
  businessName: string | null;
  businessType: string | null;
}

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss'
})
export class UserDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private adminService = inject(AdminService);

  user = signal<UserDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  actionLoading = signal(false);

  // Toast
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.loadUser(userId);
    } else {
      this.error.set('User ID not provided');
      this.loading.set(false);
    }
  }

  loadUser(userId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminService.getUser(userId).subscribe({
      next: (user) => {
        this.user.set(user);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading user:', err);
        this.error.set(err.error?.error || 'Failed to load user');
        this.loading.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/users']);
  }

  getRoleLabel(role: string): string {
    const roleLabels: Record<string, string> = {
      'itiyum_admin': 'Platform Admin',
      'business_owner': 'Business Owner',
      'business_staff': 'Business Staff',
      'specialist': 'Specialist',
      'food_enthusiast': 'Food Enthusiast',
      'normal_user': 'Normal User'
    };
    return roleLabels[role] || role;
  }

  getRoleIcon(role: string): string {
    const roleIcons: Record<string, string> = {
      'itiyum_admin': '👑',
      'business_owner': '🏢',
      'business_staff': '👔',
      'specialist': '👨‍🍳',
      'food_enthusiast': '🍕',
      'normal_user': '👤'
    };
    return roleIcons[role] || '👤';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  viewBusiness(businessId: string): void {
    this.router.navigate(['/admin/businesses', businessId]);
  }

  suspendUser(): void {
    const user = this.user();
    if (!user) return;

    this.actionLoading.set(true);
    this.adminService.updateUserStatus(user.id, 'frozen').subscribe({
      next: () => {
        this.showToast('User suspended successfully', 'success');
        this.loadUser(user.id);
        this.actionLoading.set(false);
      },
      error: (err) => {
        this.showToast(err.error?.error || 'Failed to suspend user', 'error');
        this.actionLoading.set(false);
      }
    });
  }

  activateUser(): void {
    const user = this.user();
    if (!user) return;

    this.actionLoading.set(true);
    this.adminService.updateUserStatus(user.id, 'active').subscribe({
      next: () => {
        this.showToast('User activated successfully', 'success');
        this.loadUser(user.id);
        this.actionLoading.set(false);
      },
      error: (err) => {
        this.showToast(err.error?.error || 'Failed to activate user', 'error');
        this.actionLoading.set(false);
      }
    });
  }

  showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}

