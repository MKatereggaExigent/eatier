import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, finalize, of, takeUntil } from 'rxjs';
import { Menu, MenuAccessPermission } from '../../../shared/models/menu.model';
import { BusinessOwnerService, MenuItem } from '../../../core/services/business-owner.service';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './menu-management.component.html',
  styleUrls: ['./menu-management.component.scss']
})
export class MenuManagementComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private businessOwnerService = inject(BusinessOwnerService);
  private destroy$ = new Subject<void>();

  // State management
  menuItems = signal<MenuItem[]>([]);
  selectedMenuItem = signal<MenuItem | null>(null);
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMenus(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.businessOwnerService.getMenu()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading menu items:', error);
          this.errorMessage.set('Failed to load menu items. Please try again.');
          return of({ menu: [] });
        }),
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe(response => {
        this.menuItems.set(response.menu || []);
      });
  }

  createNewMenu(): void {
    this.isCreatingMenu.set(true);
    this.isEditingMenu.set(false);
    this.selectedMenuItem.set(null);
    this.menuForm.reset({
      isPublic: true,
      isActive: true
    });
  }

  editMenu(menuItem: MenuItem): void {
    this.isEditingMenu.set(true);
    this.isCreatingMenu.set(false);
    this.selectedMenuItem.set(menuItem);
    this.menuForm.patchValue({
      name: menuItem.item_name,
      description: menuItem.description,
      type: menuItem.category,
      isActive: menuItem.is_available
    });
  }

  onSubmitMenu(): void {
    if (this.menuForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      const formValue = this.menuForm.value;

      const menuData: MenuItem = {
        item_name: formValue.name,
        description: formValue.description,
        category: formValue.type,
        price: 0, // Default price
        is_available: formValue.isActive
      };

      const request$ = this.isEditingMenu() && this.selectedMenuItem()
        ? this.businessOwnerService.updateMenuItem(this.selectedMenuItem()!.id!, menuData)
        : this.businessOwnerService.createMenuItem(menuData);

      request$
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            console.error('Error saving menu item:', error);
            this.errorMessage.set('Failed to save menu item. Please try again.');
            return of(null);
          }),
          finalize(() => {
            this.isLoading.set(false);
          })
        )
        .subscribe(response => {
          if (response) {
            this.successMessage.set(
              this.isEditingMenu() ? 'Menu item updated successfully!' : 'Menu item created successfully!'
            );
            this.loadMenus();
            this.cancelMenuEdit();
            setTimeout(() => this.successMessage.set(null), 3000);
          }
        });
    } else {
      this.markFormGroupTouched(this.menuForm);
    }
  }

  cancelMenuEdit(): void {
    this.isCreatingMenu.set(false);
    this.isEditingMenu.set(false);
    this.selectedMenuItem.set(null);
    this.menuForm.reset();
  }

  deleteMenu(menuItem: MenuItem): void {
    if (!menuItem.id) return;

    if (confirm(`Are you sure you want to delete "${menuItem.item_name}"?`)) {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      this.businessOwnerService.deleteMenuItem(menuItem.id)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            console.error('Error deleting menu item:', error);
            this.errorMessage.set('Failed to delete menu item. Please try again.');
            return of(null);
          }),
          finalize(() => {
            this.isLoading.set(false);
          })
        )
        .subscribe(response => {
          if (response) {
            this.successMessage.set('Menu item deleted successfully!');
            this.loadMenus();
            setTimeout(() => this.successMessage.set(null), 3000);
          }
        });
    }
  }

  toggleMenuStatus(menuItem: MenuItem): void {
    if (!menuItem.id) return;

    const newAvailability = !menuItem.is_available;

    this.businessOwnerService.toggleMenuItemAvailability(menuItem.id, newAvailability)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error toggling menu item status:', error);
          this.errorMessage.set('Failed to update menu item status.');
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.loadMenus();
        }
      });
  }

  // ============================================
  // ACCESS MANAGEMENT METHODS - CURRENTLY DISABLED
  // These features are not supported by the current backend API
  // TODO: Implement when backend supports menu sharing
  // ============================================

  /*
  openAccessModal(menu: Menu): void {
    // Not implemented - backend doesn't support menu sharing yet
  }

  closeAccessModal(): void {
    // Not implemented
  }

  onSubmitAccess(): void {
    // Not implemented
  }

  revokeAccess(menuOrAccess: Menu | MenuAccessPermission, permission?: MenuAccessPermission): void {
    // Not implemented
  }

  copyShareLink(link: string): void {
    // Not implemented
  }
  */

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

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
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
        const accessLink = `https://itiyum.com/menu/access/${Date.now()}`;

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
