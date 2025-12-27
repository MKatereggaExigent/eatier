import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';

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

  // Business/Tenant Info
  tenantName?: string;
  tenantSlug?: string;
  businessName?: string;
  businessId?: string;
  businessStatus?: string;

  // Activity Stats
  totalBookings?: number;
  totalReviews?: number;
  totalCheckins?: number;
  followingCount?: number;
  followersCount?: number;
  badgesCount?: number;
  lastActivityAt?: Date;

  // Profile Info
  bio?: string;
  location?: string;
  dateOfBirth?: Date;

  // Specialist Info
  specialization?: string;
  yearsOfExperience?: number;

  // Food Enthusiast Info
  dietaryPreferences?: string[];
  favoriteCuisines?: string[];
}

export interface UserFilters {
  role: 'all' | 'itiyum' | 'business' | 'food_enthusiast' | 'normal_user' | 'specialist';
  status: 'all' | 'active' | 'inactive' | 'suspended' | 'pending';
  verification: 'all' | 'verified' | 'unverified';
  sortBy: 'newest' | 'oldest' | 'name' | 'email' | 'lastLogin';
}

export interface ColumnCategory {
  label: string;
  columns: Array<{ key: string; label: string }>;
}

export interface ColumnCategories {
  [key: string]: ColumnCategory;
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
  private http = inject(HttpClient);
  private router = inject(Router);

  currentUser = this.authService.currentUser;

  // Expose Math for template
  Math = Math;

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
  showAddUserModal = signal(false);
  showEditRoleModal = signal(false);
  viewMode = signal<'cards' | 'table'>('table'); // Default to table view

  // Available roles from backend
  availableRoles = signal<any[]>([]);
  selectedRoleForEdit = signal<string>('');
  userForRoleEdit = signal<AdminUser | null>(null);

  // Column management
  availableColumns = signal<any[]>([]);
  columnCategories = signal<ColumnCategories>({});
  visibleColumns = signal<string[]>([]);
  showColumnManager = signal(false);

  // Filter options
  filters = signal<UserFilters>({
    role: 'all',
    status: 'all',
    verification: 'all',
    sortBy: 'newest'
  });

  // Forms
  userActionForm: FormGroup;
  addUserForm: FormGroup;
  editRoleForm: FormGroup;

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

    this.addUserForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone: [''],
      role: ['normal_user', Validators.required],
      status: ['active', Validators.required]
    });

    this.editRoleForm = this.fb.group({
      role: ['', Validators.required]
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

  // Pagination computed values
  totalPages = computed(() => Math.ceil(this.totalUsers() / this.pageSize()));

  hasNextPage = computed(() => this.currentPage() < this.totalPages());

  hasPreviousPage = computed(() => this.currentPage() > 1);

  ngOnInit() {
    this.loadUsers();
    this.loadRoles();
    this.loadColumns();
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
          role: this.mapBackendRole(user.role || user.role_name),
          status: user.account_status || 'pending',
          createdAt: new Date(user.created_at),
          lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : undefined,
          emailVerified: user.email_verified || false,
          phoneVerified: user.phone_verified || false,
          avatar: user.avatar_url,
          phone: user.phone,
          tenantName: user.tenant_name,
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

  loadRoles(): void {
    this.http.get<any>(`${environment.apiUrl}/admin/roles`).subscribe({
      next: (response) => {
        this.availableRoles.set(response.roles || []);
      },
      error: (error) => {
        console.error('Error loading roles:', error);
        // Fallback to basic roles
        this.availableRoles.set([
          { role_name: 'normal_user', display_name: 'Normal User', category: 'customer' },
          { role_name: 'food_enthusiast', display_name: 'Food Enthusiast', category: 'customer' },
          { role_name: 'business_owner', display_name: 'Business Owner', category: 'business' },
          { role_name: 'specialist', display_name: 'Specialist', category: 'customer' },
          { role_name: 'itiyum_admin', display_name: 'Itiyum Admin', category: 'administrative' }
        ]);
      }
    });
  }

  loadColumns(): void {
    this.http.get<any>(`${environment.apiUrl}/admin/users/columns`).subscribe({
      next: (response) => {
        this.availableColumns.set(response.columns || []);
        this.columnCategories.set(response.categories || {});

        // Load saved column preferences from localStorage or use defaults
        const savedColumns = localStorage.getItem('adminUsersVisibleColumns');
        if (savedColumns) {
          this.visibleColumns.set(JSON.parse(savedColumns));
        } else {
          this.visibleColumns.set(response.defaultColumns || []);
        }
      },
      error: (error) => {
        console.error('Error loading columns:', error);
        // Fallback to basic columns
        this.visibleColumns.set(['email', 'firstName', 'lastName', 'role', 'status', 'tenantName', 'businessName', 'totalBookings', 'totalReviews', 'createdAt', 'lastLoginAt']);
      }
    });
  }

  toggleColumn(columnKey: string): void {
    const currentColumns = this.visibleColumns();
    if (currentColumns.includes(columnKey)) {
      this.visibleColumns.set(currentColumns.filter(col => col !== columnKey));
    } else {
      this.visibleColumns.set([...currentColumns, columnKey]);
    }
    // Save to localStorage
    localStorage.setItem('adminUsersVisibleColumns', JSON.stringify(this.visibleColumns()));
  }

  isColumnVisible(columnKey: string): boolean {
    return this.visibleColumns().includes(columnKey);
  }

  openColumnManager(): void {
    this.showColumnManager.set(true);
  }

  closeColumnManager(): void {
    this.showColumnManager.set(false);
  }

  resetColumns(): void {
    const defaultColumns = this.availableColumns().filter(col => col.default).map(col => col.key);
    this.visibleColumns.set(defaultColumns);
    localStorage.setItem('adminUsersVisibleColumns', JSON.stringify(defaultColumns));
  }

  getColumnValue(user: AdminUser, columnKey: string): any {
    // Map camelCase keys to user properties
    const keyMap: Record<string, keyof AdminUser> = {
      'id': 'id',
      'email': 'email',
      'firstName': 'firstName',
      'lastName': 'lastName',
      'phone': 'phone',
      'role': 'role',
      'status': 'status',
      'tenantName': 'tenantName',
      'businessName': 'businessName',
      'businessStatus': 'businessStatus',
      'emailVerified': 'emailVerified',
      'phoneVerified': 'phoneVerified',
      'totalBookings': 'totalBookings',
      'totalReviews': 'totalReviews',
      'totalCheckins': 'totalCheckins',
      'followingCount': 'followingCount',
      'followersCount': 'followersCount',
      'badgesCount': 'badgesCount',
      'bio': 'bio',
      'location': 'location',
      'dateOfBirth': 'dateOfBirth',
      'specialization': 'specialization',
      'yearsOfExperience': 'yearsOfExperience',
      'dietaryPreferences': 'dietaryPreferences',
      'favoriteCuisines': 'favoriteCuisines',
      'createdAt': 'createdAt',
      'lastLoginAt': 'lastLoginAt',
      'lastActivityAt': 'lastActivityAt'
    };

    const mappedKey = keyMap[columnKey];
    return mappedKey ? user[mappedKey] : undefined;
  }

  getColumnLabel(columnKey: string): string {
    const column = this.availableColumns().find(col => col.key === columnKey);
    return column ? column.label : columnKey;
  }

  // UI interaction methods
  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === 'cards' ? 'table' : 'cards');
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

  viewFullProfile(user: AdminUser): void {
    this.closeUserModal();
    this.router.navigate(['/admin/users', user.id]);
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

  // Add User methods
  openAddUserModal(): void {
    this.addUserForm.reset({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      role: 'normal_user',
      status: 'active'
    });
    this.showAddUserModal.set(true);
  }

  closeAddUserModal(): void {
    this.showAddUserModal.set(false);
    this.addUserForm.reset();
  }

  createUser(): void {
    if (this.addUserForm.valid) {
      const formValue = this.addUserForm.value;
      this.http.post<any>(`${environment.apiUrl}/admin/users`, formValue).subscribe({
        next: (response) => {
          console.log('User created successfully:', response);
          this.closeAddUserModal();
          this.loadUsers(); // Reload users list
          alert('User created successfully!');
        },
        error: (error) => {
          console.error('Error creating user:', error);
          alert(error.error?.error || 'Failed to create user. Please try again.');
        }
      });
    } else {
      alert('Please fill in all required fields correctly.');
    }
  }

  // Edit Role methods
  openEditRoleModal(user: AdminUser): void {
    this.userForRoleEdit.set(user);
    this.editRoleForm.patchValue({
      role: this.mapRoleToBackend(user.role)
    });
    this.showEditRoleModal.set(true);
  }

  closeEditRoleModal(): void {
    this.showEditRoleModal.set(false);
    this.userForRoleEdit.set(null);
    this.editRoleForm.reset();
  }

  updateUserRole(): void {
    const user = this.userForRoleEdit();
    if (user && this.editRoleForm.valid) {
      const newRole = this.editRoleForm.value.role;
      this.http.patch<any>(`${environment.apiUrl}/admin/users/${user.id}/role`, { role: newRole }).subscribe({
        next: (response) => {
          console.log('User role updated successfully:', response);
          this.closeEditRoleModal();
          this.loadUsers(); // Reload users list
          alert('User role updated successfully!');
        },
        error: (error) => {
          console.error('Error updating user role:', error);
          alert(error.error?.error || 'Failed to update user role. Please try again.');
        }
      });
    }
  }

  private mapRoleToBackend(role: AdminUser['role']): string {
    const roleMap: Record<AdminUser['role'], string> = {
      'itiyum': 'itiyum_admin',
      'business': 'business_owner',
      'food_enthusiast': 'food_enthusiast',
      'normal_user': 'normal_user',
      'specialist': 'specialist'
    };
    return roleMap[role] || 'normal_user';
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

  // Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadUsers();
    }
  }

  nextPage(): void {
    if (this.hasNextPage()) {
      this.currentPage.update(page => page + 1);
      this.loadUsers();
    }
  }

  previousPage(): void {
    if (this.hasPreviousPage()) {
      this.currentPage.update(page => page - 1);
      this.loadUsers();
    }
  }

  changePageSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newSize = parseInt(target.value, 10);
    this.pageSize.set(newSize);
    this.currentPage.set(1); // Reset to first page
    this.loadUsers();
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current > 3) {
        pages.push(-1); // Ellipsis
      }

      // Show pages around current
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push(-1); // Ellipsis
      }

      // Always show last page
      pages.push(total);
    }

    return pages;
  }

}
