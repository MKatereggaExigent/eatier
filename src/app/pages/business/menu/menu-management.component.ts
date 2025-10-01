import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Menu, MenuAccessPermission } from '../../../shared/models/menu.model';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './menu-management.component.html',
  styleUrls: ['./menu-management.component.scss']
})
export class MenuManagementComponent implements OnInit {
  private fb = inject(FormBuilder);

  // State management
  menus = signal<Menu[]>([]);
  selectedMenu = signal<Menu | null>(null);
  isCreatingMenu = signal<boolean>(false);
  isEditingMenu = signal<boolean>(false);
  showAccessModal = signal<boolean>(false);
  showCreateMenuModal = signal<boolean>(false);
  showManageAccessModal = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  showAdvancedOptions = signal<boolean>(false);
  currentAccessList = signal<MenuAccessPermission[]>([]);
  editingAccess = signal<MenuAccessPermission | null>(null);

  // Forms
  menuForm: FormGroup;
  accessForm: FormGroup;

  // Constants
  readonly menuTypes = [
    { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
    { value: 'lunch', label: 'Lunch', icon: '🌞' },
    { value: 'dinner', label: 'Dinner', icon: '🌙' },
    { value: 'beverages', label: 'Beverages', icon: '🥤' },
    { value: 'dessert', label: 'Dessert', icon: '🍰' },
    { value: 'special', label: 'Special', icon: '⭐' }
  ];

  readonly permissionLevels = [
    {
      value: 'edit_view',
      label: 'Full Access',
      description: 'Can edit, view, and manage all menu items',
      icon: '👑',
      features: ['Edit menu items', 'Add new items', 'Delete items', 'View analytics', 'Manage pricing']
    },
    {
      value: 'view_only',
      label: 'View Only',
      description: 'Can view menu but cannot make changes',
      icon: '👀',
      features: ['View menu items', 'See pricing', 'Access read-only analytics']
    },
    {
      value: 'no_edit',
      label: 'Restricted',
      description: 'Limited access with specific restrictions',
      icon: '🔒',
      features: ['Basic menu viewing', 'No editing permissions', 'No analytics access']
    }
  ];

  readonly accessDurations = [
    { value: 7, label: '1 Week', icon: '📅' },
    { value: 30, label: '1 Month', icon: '🗓️' },
    { value: 90, label: '3 Months', icon: '📆' },
    { value: 365, label: '1 Year', icon: '🗓️' },
    { value: -1, label: 'Never', icon: '♾️' }
  ];

  // Character limits as specified
  readonly DESCRIPTION_MAX_LENGTH = 15;

  // Mock data
  mockMenus: Menu[] = [
    {
      id: '1',
      restaurantId: 'rest-1',
      name: 'Breakfast Menu',
      description: 'Morning delights',
      type: 'breakfast',
      isActive: true,
      categories: [],
      items: [],
      backgroundImage: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&h=400&fit=crop',
      accessPermissions: [
        {
          id: 'perm-1',
          email: 'chef@restaurant.com',
          permissionLevel: 'edit_view',
          shareLink: 'https://eatier.com/menu/share/abc123',
          message: 'Please review and update breakfast items',
          createdAt: new Date('2024-01-15'),
          isActive: true
        }
      ],
      shareableLink: 'https://eatier.com/menu/1/public',
      isPublic: true,
      viewCount: 245,
      lastViewedAt: new Date('2024-01-20'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-20'),
      lastModified: new Date('2024-01-20')
    },
    {
      id: '2',
      restaurantId: 'rest-1',
      name: 'Dinner Menu',
      description: 'Evening specials',
      type: 'dinner',
      isActive: true,
      categories: [],
      items: [],
      backgroundImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop',
      accessPermissions: [],
      shareableLink: 'https://eatier.com/menu/2/public',
      isPublic: false,
      viewCount: 189,
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-18'),
      lastModified: new Date('2024-01-18')
    }
  ];

  constructor() {
    this.menuForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', [
        Validators.required,
        Validators.maxLength(this.DESCRIPTION_MAX_LENGTH),
        this.noEmojiValidator
      ]],
      type: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      backgroundImage: [''],
      isPublic: [true],
      isActive: [true]
    });

    this.accessForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      permissionLevel: ['view_only', Validators.required],
      message: ['', [Validators.maxLength(200)]],
      expirationDays: [30, [Validators.min(1), Validators.max(365)]],
      requirePasswordReset: [false],
      sendNotifications: [true],
      allowDownload: [true]
    });
  }

  ngOnInit(): void {
    this.loadMenus();
    this.loadCurrentAccess();
  }

  private loadCurrentAccess(): void {
    // Mock current access data
    const mockAccess: MenuAccessPermission[] = [
      {
        id: 'access-1',
        email: 'chef@restaurant.com',
        permissionLevel: 'edit_view',
        shareLink: 'https://eatier.com/menu/access/abc123',
        message: 'Please help manage our breakfast menu',
        createdAt: new Date('2024-01-15'),
        expiresAt: new Date('2024-04-15'),
        isActive: true
      },
      {
        id: 'access-2',
        email: 'manager@restaurant.com',
        permissionLevel: 'view_only',
        shareLink: 'https://eatier.com/menu/access/def456',
        message: 'View-only access for menu review',
        createdAt: new Date('2024-01-10'),
        expiresAt: new Date('2024-02-10'),
        isActive: true
      }
    ];
    this.currentAccessList.set(mockAccess);
  }

  loadMenus(): void {
    this.isLoading.set(true);
    // Mock API call
    setTimeout(() => {
      this.menus.set(this.mockMenus);
      this.isLoading.set(false);
    }, 500);
  }

  createNewMenu(): void {
    this.isCreatingMenu.set(true);
    this.isEditingMenu.set(false);
    this.selectedMenu.set(null);
    this.menuForm.reset({
      isPublic: true,
      isActive: true
    });
  }

  editMenu(menu: Menu): void {
    this.isEditingMenu.set(true);
    this.isCreatingMenu.set(false);
    this.selectedMenu.set(menu);
    this.menuForm.patchValue({
      name: menu.name,
      description: menu.description,
      type: menu.type,
      backgroundImage: menu.backgroundImage,
      isPublic: menu.isPublic,
      isActive: menu.isActive
    });
  }

  onSubmitMenu(): void {
    if (this.menuForm.valid) {
      this.isLoading.set(true);
      const formValue = this.menuForm.value;

      // Mock API call
      setTimeout(() => {
        if (this.isCreatingMenu()) {
          const newMenu: Menu = {
            id: Date.now().toString(),
            restaurantId: 'rest-1',
            name: formValue.name,
            description: formValue.description,
            type: formValue.type,
            isActive: formValue.isActive,
            categories: [],
            items: [],
            backgroundImage: formValue.backgroundImage,
            accessPermissions: [],
            shareableLink: `https://eatier.com/menu/${Date.now()}/public`,
            isPublic: formValue.isPublic,
            viewCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastModified: new Date()
          };

          this.menus.update(menus => [...menus, newMenu]);
          this.successMessage.set('Menu created successfully!');
        } else if (this.isEditingMenu() && this.selectedMenu()) {
          const updatedMenus = this.menus().map(menu =>
            menu.id === this.selectedMenu()!.id
              ? { ...menu, ...formValue, updatedAt: new Date(), lastModified: new Date() }
              : menu
          );
          this.menus.set(updatedMenus);
          this.successMessage.set('Menu updated successfully!');
        }

        this.isLoading.set(false);
        this.cancelMenuEdit();
        setTimeout(() => this.successMessage.set(null), 3000);
      }, 1000);
    } else {
      this.markFormGroupTouched(this.menuForm);
    }
  }

  cancelMenuEdit(): void {
    this.isCreatingMenu.set(false);
    this.isEditingMenu.set(false);
    this.selectedMenu.set(null);
    this.menuForm.reset();
  }

  deleteMenu(menu: Menu): void {
    if (confirm(`Are you sure you want to delete "${menu.name}"?`)) {
      this.menus.update(menus => menus.filter(m => m.id !== menu.id));
      this.successMessage.set('Menu deleted successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
    }
  }

  toggleMenuStatus(menu: Menu): void {
    const updatedMenus = this.menus().map(m =>
      m.id === menu.id
        ? { ...m, isActive: !m.isActive, updatedAt: new Date() }
        : m
    );
    this.menus.set(updatedMenus);
  }

  openAccessModal(menu: Menu): void {
    this.selectedMenu.set(menu);
    this.showAccessModal.set(true);
    this.accessForm.reset({
      permissionLevel: 'view_only',
      expirationDays: 30
    });
  }

  closeAccessModal(): void {
    this.showAccessModal.set(false);
    this.selectedMenu.set(null);
    this.accessForm.reset();
  }

  onSubmitAccess(): void {
    if (this.accessForm.valid && this.selectedMenu()) {
      this.isLoading.set(true);
      const formValue = this.accessForm.value;

      // Mock API call
      setTimeout(() => {
        const newPermission: MenuAccessPermission = {
          id: Date.now().toString(),
          email: formValue.email,
          permissionLevel: formValue.permissionLevel,
          shareLink: `https://eatier.com/menu/share/${Date.now()}`,
          message: formValue.message,
          expiresAt: formValue.expirationDays ?
            new Date(Date.now() + formValue.expirationDays * 24 * 60 * 60 * 1000) :
            undefined,
          createdAt: new Date(),
          isActive: true
        };

        const updatedMenus = this.menus().map(menu =>
          menu.id === this.selectedMenu()!.id
            ? { ...menu, accessPermissions: [...menu.accessPermissions, newPermission] }
            : menu
        );

        this.menus.set(updatedMenus);
        this.isLoading.set(false);
        this.closeAccessModal();
        this.successMessage.set('Access granted successfully! Share link has been generated.');
        setTimeout(() => this.successMessage.set(null), 3000);
      }, 1000);
    } else {
      this.markFormGroupTouched(this.accessForm);
    }
  }

  revokeAccess(menuOrAccess: Menu | MenuAccessPermission, permission?: MenuAccessPermission): void {
    if (permission) {
      // Called with menu and permission (existing functionality)
      const menu = menuOrAccess as Menu;
      if (confirm(`Revoke access for ${permission.email}?`)) {
        const updatedMenus = this.menus().map(m =>
          m.id === menu.id
            ? { ...m, accessPermissions: m.accessPermissions.filter(p => p.id !== permission.id) }
            : m
        );
        this.menus.set(updatedMenus);
        this.successMessage.set('Access revoked successfully!');
        setTimeout(() => this.successMessage.set(null), 3000);
      }
    } else {
      // Called with just access permission (new functionality)
      const access = menuOrAccess as MenuAccessPermission;
      if (confirm(`Are you sure you want to revoke access for ${access.email}?`)) {
        this.currentAccessList.update(list => list.filter(a => a.id !== access.id));
        this.successMessage.set(`Access revoked for ${access.email}`);
        setTimeout(() => this.successMessage.set(null), 3000);
      }
    }
  }

  copyShareLink(link: string): void {
    navigator.clipboard.writeText(link).then(() => {
      this.successMessage.set('Share link copied to clipboard!');
      setTimeout(() => this.successMessage.set(null), 2000);
    });
  }

  getMenuTypeIcon(type: string): string {
    return this.menuTypes.find(t => t.value === type)?.icon || '📋';
  }

  getMenuTypeLabel(type: string): string {
    return this.menuTypes.find(t => t.value === type)?.label || type;
  }

  getPermissionLevelLabel(level: string): string {
    return this.permissionLevels.find(p => p.value === level)?.label || level;
  }

  getFieldError(form: FormGroup, fieldName: string): string | null {
    const field = form.get(fieldName);
    if (field && field.invalid && (field.dirty || field.touched)) {
      if (field.errors?.['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors?.['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors?.['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors?.['minlength'].requiredLength} characters`;
      }
      if (field.errors?.['maxlength']) {
        return `${this.getFieldLabel(fieldName)} must be less than ${field.errors?.['maxlength'].requiredLength} characters`;
      }
      if (field.errors?.['min']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors?.['min'].min}`;
      }
      if (field.errors?.['max']) {
        return `${this.getFieldLabel(fieldName)} must be no more than ${field.errors?.['max'].max}`;
      }
      if (field.errors?.['noEmoji']) {
        return 'Emojis are not allowed in the description';
      }
    }
    return null;
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      name: 'Menu name',
      description: 'Description',
      type: 'Menu type',
      email: 'Email',
      permissionLevel: 'Permission level',
      expirationDays: 'Expiration days'
    };
    return labels[fieldName] || fieldName;
  }

  private markFormGroupTouched(form: FormGroup): void {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      control?.markAsTouched();
    });
  }

  getDescriptionCharacterCount(): number {
    return this.menuForm.get('description')?.value?.length || 0;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  openCreateMenuModal(): void {
    this.showCreateMenuModal.set(true);
    this.menuForm.reset();
  }

  closeCreateMenuModal(): void {
    this.showCreateMenuModal.set(false);
    this.menuForm.reset();
  }

  openManageAccessModal(): void {
    this.showManageAccessModal.set(true);
    this.accessForm.reset();
  }

  closeManageAccessModal(): void {
    this.showManageAccessModal.set(false);
    this.accessForm.reset();
  }

  onBackgroundImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        this.menuForm.patchValue({ backgroundImage: imageUrl });
      };
      reader.readAsDataURL(file);
    }
  }

  onGrantAccess(): void {
    if (this.accessForm.valid) {
      this.isLoading.set(true);
      const formValue = this.accessForm.value;

      // Mock API call to grant access
      setTimeout(() => {
        const accessLink = `https://eatier.com/menu/access/${Date.now()}`;

        // Copy link to clipboard
        navigator.clipboard.writeText(accessLink).then(() => {
          this.successMessage.set(`Access granted to ${formValue.email}! Link copied to clipboard: ${accessLink}`);
        });

        this.isLoading.set(false);
        this.closeManageAccessModal();
        setTimeout(() => this.successMessage.set(null), 5000);
      }, 1000);
    }
  }

  // Custom validator to prevent emojis as specified
  private noEmojiValidator(control: any) {
    const value = control.value;
    if (value && /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(value)) {
      return { noEmoji: true };
    }
    return null;
  }

  // Access Management Methods
  getInitials(email: string): string {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  }

  getPermissionIcon(permissionLevel: string): string {
    const level = this.permissionLevels.find(l => l.value === permissionLevel);
    return level?.icon || '🔒';
  }

  getPermissionClass(permissionLevel: string): string {
    switch (permissionLevel) {
      case 'edit_view': return 'full-access';
      case 'view_only': return 'view-only';
      case 'no_edit': return 'restricted';
      default: return 'restricted';
    }
  }

  getPermissionFeatures(permissionLevel: string): string[] {
    const level = this.permissionLevels.find(l => l.value === permissionLevel);
    return level?.features || [];
  }

  isAccessExpired(access: MenuAccessPermission): boolean {
    if (!access.expiresAt) return false;
    return new Date() > new Date(access.expiresAt);
  }

  copyAccessLink(access: MenuAccessPermission): void {
    if (access.shareLink) {
      navigator.clipboard.writeText(access.shareLink).then(() => {
        this.successMessage.set('Access link copied to clipboard!');
        setTimeout(() => this.successMessage.set(null), 3000);
      });
    }
  }

  editAccess(access: MenuAccessPermission): void {
    this.editingAccess.set(access);
    this.accessForm.patchValue({
      email: access.email,
      permissionLevel: access.permissionLevel,
      message: access.message || '',
      expirationDays: access.expiresAt ?
        Math.ceil((new Date(access.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 30
    });
  }

  setAccessDuration(days: number): void {
    this.accessForm.patchValue({ expirationDays: days });
  }

  toggleAdvancedOptions(): void {
    this.showAdvancedOptions.update(show => !show);
  }
}
