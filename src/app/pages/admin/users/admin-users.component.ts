import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'eatier' | 'business' | 'food_enthusiast' | 'normal_user' | 'specialist';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
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
  role: 'all' | 'eatier' | 'business' | 'food_enthusiast' | 'normal_user' | 'specialist';
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
  private fb = inject(FormBuilder);

  currentUser = this.authService.currentUser;

  // State management
  isLoading = signal(false);
  users = signal<AdminUser[]>([]);
  selectedUser = signal<AdminUser | null>(null);

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
    { value: 'eatier', label: 'Eatier Admin' },
    { value: 'business', label: 'Business Owner' },
    { value: 'food_enthusiast', label: 'Food Enthusiast' },
    { value: 'normal_user', label: 'Normal User' },
    { value: 'specialist', label: 'Specialist' }
  ];

  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' },
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
    // Mock data - in real app, this would be an API call
    setTimeout(() => {
      this.users.set(this.mockUsers);
      this.isLoading.set(false);
    }, 1000);
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
    console.log('Suspend user:', user.id);
    // TODO: Implement user suspension
  }

  activateUser(user: AdminUser): void {
    console.log('Activate user:', user.id);
    // TODO: Implement user activation
  }

  deleteUser(user: AdminUser): void {
    this.selectedUser.set(user);
    this.showDeleteConfirm.set(true);
  }

  confirmDelete(): void {
    const user = this.selectedUser();
    if (user) {
      console.log('Delete user:', user.id);
      // TODO: Implement user deletion
      this.showDeleteConfirm.set(false);
      this.selectedUser.set(null);
    }
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.selectedUser.set(null);
  }

  // Utility methods
  getRoleLabel(role: string): string {
    const roleMap: { [key: string]: string } = {
      'eatier': 'Eatier Admin',
      'business': 'Business Owner',
      'food_enthusiast': 'Food Enthusiast',
      'normal_user': 'Normal User',
      'specialist': 'Specialist'
    };
    return roleMap[role] || role;
  }

  getRoleIcon(role: string): string {
    const iconMap: { [key: string]: string } = {
      'eatier': '🏛️',
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

  // Mock data
  private mockUsers: AdminUser[] = [
    {
      id: '1',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'food_enthusiast',
      status: 'active',
      createdAt: new Date('2024-01-15'),
      lastLoginAt: new Date('2024-01-30'),
      emailVerified: true,
      phoneVerified: true,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      phone: '+1234567890',
      totalBookings: 15,
      totalReviews: 8
    },
    {
      id: '2',
      email: 'restaurant@example.com',
      firstName: 'Maria',
      lastName: 'Garcia',
      role: 'business',
      status: 'active',
      createdAt: new Date('2024-01-10'),
      lastLoginAt: new Date('2024-01-29'),
      emailVerified: true,
      phoneVerified: false,
      businessName: 'Maria\'s Italian Kitchen',
      totalBookings: 245
    },
    {
      id: '3',
      email: 'chef.smith@example.com',
      firstName: 'David',
      lastName: 'Smith',
      role: 'specialist',
      status: 'active',
      createdAt: new Date('2024-01-20'),
      lastLoginAt: new Date('2024-01-28'),
      emailVerified: true,
      phoneVerified: true,
      totalBookings: 32
    }
  ];
}
