import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'itiyum' | 'business' | 'food_enthusiast' | 'normal_user' | 'specialist';
  status: 'active' | 'frozen' | 'pending_deletion' | 'deleted' | 'pending';
  createdAt: Date;
  lastLoginAt?: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  avatar?: string;
  phone?: string;
  businessName?: string;
  totalBookings?: number;
  totalReviews?: number;
}

export interface UserFilters {
  role: 'all' | 'itiyum' | 'business' | 'food_enthusiast' | 'normal_user' | 'specialist';
  status: 'all' | 'active' | 'inactive' | 'suspended' | 'pending';
  verification: 'all' | 'verified' | 'unverified';
  sortBy: 'newest' | 'oldest' | 'name' | 'email' | 'lastLogin';
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit {
  private authService = inject(AuthService);
  private adminService = inject(AdminService);
  private fb = inject(FormBuilder);

  currentUser = this.authService.currentUser;

  // State management
  isLoading = signal(false);
  users = signal<AdminUser[]>([]);
  selectedUser = signal<AdminUser | null>(null);

  // Pagination
  currentPage = signal(1);
  pageSize = signal(20);
  totalUsers = signal(0);

  // UI state
  searchQuery = signal('');
  showFilters = signal(false);
  showUserModal = signal(false);
  showDeleteConfirm = signal(false);

  // Filter options
  filters = signal<UserFilters>({
    role: 'all',
    status: 'all',
    verification: 'all',
    sortBy: 'newest'
  });

  // Form for user actions
  userActionForm: FormGroup;

  // Available options
  roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'itiyum', label: 'Itiyum Admin' },
    { value: 'business', label: 'Business Owner' },
    { value: 'food_enthusiast', label: 'Food Enthusiast' },
    { value: 'normal_user', label: 'Normal User' },
    { value: 'specialist', label: 'Specialist' }
  ];

  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'frozen', label: 'Frozen/Suspended' },
    { value: 'pending_deletion', label: 'Pending Deletion' },
    { value: 'deleted', label: 'Deleted' },
    { value: 'pending', label: 'Pending' }
  ];

  verificationOptions = [
    { value: 'all', label: 'All Users' },
    { value: 'verified', label: 'Verified' },
    { value: 'unverified', label: 'Unverified' }
  ];

  sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'name', label: 'Name A-Z' },
    { value: 'email', label: 'Email A-Z' },
    { value: 'lastLogin', label: 'Last Login' }
  ];

  constructor() {
    this.userActionForm = this.fb.group({
      status: ['', Validators.required],
      reason: ['', Validators.required]
    });
  }

  // Computed properties
  filteredUsers = computed(() => {
    let filtered = this.users();
    const query = this.searchQuery().toLowerCase();
    const currentFilters = this.filters();

    // Search filter
    if (query) {
      filtered = filtered.filter(user =>
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.businessName && user.businessName.toLowerCase().includes(query))
      );
    }

    // Role filter
    if (currentFilters.role !== 'all') {
      filtered = filtered.filter(user => user.role === currentFilters.role);
    }

    // Status filter
    if (currentFilters.status !== 'all') {
      filtered = filtered.filter(user => user.status === currentFilters.status);
    }

    // Verification filter
    if (currentFilters.verification !== 'all') {
      if (currentFilters.verification === 'verified') {
        filtered = filtered.filter(user => user.emailVerified);
      } else {
        filtered = filtered.filter(user => !user.emailVerified);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (currentFilters.sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'email':
          return a.email.localeCompare(b.email);
        case 'lastLogin':
          const aLogin = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          const bLogin = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          return bLogin - aLogin;
        default:
          return 0;
      }
    });

    return filtered;
  });

  hasActiveFilters = computed(() => {
    const currentFilters = this.filters();
    return currentFilters.role !== 'all' ||
           currentFilters.status !== 'all' ||
           currentFilters.verification !== 'all' ||
           this.searchQuery().length > 0;
  });

  userStats = computed(() => {
    const users = this.users();
    return {
      total: users.length,
      active: users.filter(u => u.status === 'active').length,
      businesses: users.filter(u => u.role === 'business').length,
      foodEnthusiasts: users.filter(u => u.role === 'food_enthusiast').length,
      specialists: users.filter(u => u.role === 'specialist').length,
      verified: users.filter(u => u.emailVerified).length
    };
  });

  ngOnInit() {
    this.loadUsers();
  }

  // Data loading methods
  loadUsers(): void {
    this.isLoading.set(true);

    const currentFilters = this.filters();
    const searchTerm = this.searchQuery();

    // Build status filter - map 'all' to undefined
    const statusFilter = currentFilters.status !== 'all' ? currentFilters.status : undefined;

    console.log('Loading users with params:', {
      page: this.currentPage(),
      pageSize: this.pageSize(),
      searchTerm,
      statusFilter
    });

    this.adminService.getUsers(
      this.currentPage(),
      this.pageSize(),
      searchTerm || undefined,
      statusFilter
    ).subscribe({
      next: (response: any) => {
        console.log('Users API response:', response);

        if (!response || !response.users) {
          console.error('Invalid response format:', response);
          this.users.set([]);
          this.isLoading.set(false);
          return;
        }

        // Map backend user data to AdminUser interface
        const mappedUsers: AdminUser[] = response.users.map((user: any) => ({
          id: user.id,
          email: user.email,
          firstName: user.first_name || 'Unknown',
          lastName: user.last_name || 'User',
          role: this.mapBackendRole(user.role_name),
          status: user.account_status || 'pending',
          createdAt: new Date(user.created_at),
          lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : undefined,
          emailVerified: user.email_verified || false,
          phoneVerified: user.phone_verified || false,
          avatar: user.avatar_url,
          phone: user.phone,
          businessName: user.business_name,
          totalBookings: parseInt(user.total_bookings) || 0,
          totalReviews: user.total_reviews || 0
        }));

        console.log('Mapped users:', mappedUsers);
        this.users.set(mappedUsers);
        this.totalUsers.set(response.total || mappedUsers.length);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        this.users.set([]);
        this.isLoading.set(false);
      }
    });
  }

  private mapBackendRole(roleName: string | null): AdminUser['role'] {
    if (!roleName) return 'normal_user';

    const roleMap: Record<string, AdminUser['role']> = {
      'Itiyum Admin': 'itiyum',
      'itiyum_admin': 'itiyum',
      'Business Owner': 'business',
      'business_owner': 'business',
      'Food Enthusiast': 'food_enthusiast',
      'food_enthusiast': 'food_enthusiast',
      'Normal User': 'normal_user',
      'normal_user': 'normal_user',
      'Specialist': 'specialist',
      'specialist': 'specialist'
    };
    return roleMap[roleName] || 'normal_user';
  }

  // UI interaction methods
  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  clearFilters(): void {
    this.filters.set({
      role: 'all',
      status: 'all',
      verification: 'all',
      sortBy: 'newest'
    });
    this.searchQuery.set('');
  }

  updateFilter(key: keyof UserFilters, value: string): void {
    this.filters.update(current => ({ ...current, [key]: value }));
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  onFilterChange(key: keyof UserFilters, event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.updateFilter(key, target.value);
  }

  // User actions
  viewUserDetails(user: AdminUser): void {
    this.selectedUser.set(user);
    this.showUserModal.set(true);
  }

  closeUserModal(): void {
    this.selectedUser.set(null);
    this.showUserModal.set(false);
  }

  suspendUser(user: AdminUser): void {
    if (confirm(`Are you sure you want to suspend ${user.firstName} ${user.lastName}?`)) {
      this.adminService.suspendUser(user.id, 'Suspended by admin').subscribe({
        next: (response) => {
          console.log('User suspended successfully:', response);
          // Update the user in the list
          const users = this.users();
          const updatedUsers = users.map(u =>
            u.id === user.id ? { ...u, status: 'frozen' as const } : u
          );
          this.users.set(updatedUsers);
        },
        error: (error) => {
          console.error('Error suspending user:', error);
          alert('Failed to suspend user. Please try again.');
        }
      });
    }
  }

  activateUser(user: AdminUser): void {
    if (confirm(`Are you sure you want to activate ${user.firstName} ${user.lastName}?`)) {
      this.adminService.activateUser(user.id).subscribe({
        next: (response) => {
          console.log('User activated successfully:', response);
          // Update the user in the list
          const users = this.users();
          const updatedUsers = users.map(u =>
            u.id === user.id ? { ...u, status: 'active' as const } : u
          );
          this.users.set(updatedUsers);
        },
        error: (error) => {
          console.error('Error activating user:', error);
          alert('Failed to activate user. Please try again.');
        }
      });
    }
  }

  deleteUser(user: AdminUser): void {
    this.selectedUser.set(user);
    this.showDeleteConfirm.set(true);
  }

  confirmDelete(): void {
    const user = this.selectedUser();
    if (user) {
      this.adminService.deleteUser(user.id).subscribe({
        next: (response) => {
          console.log('User deleted successfully:', response);
          // Remove the user from the list
          const users = this.users();
          const updatedUsers = users.filter(u => u.id !== user.id);
          this.users.set(updatedUsers);
          this.totalUsers.set(this.totalUsers() - 1);
          this.showDeleteConfirm.set(false);
          this.selectedUser.set(null);
        },
        error: (error) => {
          console.error('Error deleting user:', error);
          alert('Failed to delete user. Please try again.');
          this.showDeleteConfirm.set(false);
          this.selectedUser.set(null);
        }
      });
    }
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.selectedUser.set(null);
  }

  // Utility methods
  getRoleLabel(role: string): string {
    const roleMap: { [key: string]: string } = {
      'itiyum': 'Itiyum Admin',
      'business': 'Business Owner',
      'food_enthusiast': 'Food Enthusiast',
      'normal_user': 'Normal User',
      'specialist': 'Specialist'
    };
    return roleMap[role] || role;
  }

  getRoleIcon(role: string): string {
    const iconMap: { [key: string]: string } = {
      'itiyum': '🏛️',
      'business': '🏪',
      'food_enthusiast': '🍽️',
      'normal_user': '👤',
      'specialist': '👨‍🍳'
    };
    return iconMap[role] || '👤';
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'active': 'success',
      'inactive': 'warning',
      'suspended': 'danger',
      'pending': 'info'
    };
    return colorMap[status] || 'secondary';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

}
