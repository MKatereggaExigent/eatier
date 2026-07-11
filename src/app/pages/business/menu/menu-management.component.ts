import { Component, OnDestroy, OnInit, HostListener, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, finalize, of, takeUntil } from 'rxjs';
import { Menu, MenuAccessPermission } from '../../../shared/models/menu.model';
import { BusinessOwnerService, MenuItem } from '../../../core/services/business-owner.service';

import { CommonModule } from '@angular/common';
import { LucideAngularModule, Sun, Moon, UtensilsCrossed, Soup, Salad, Cookie, Coffee, Wine, Beer, Leaf, Heart, Star, CalendarDays, Package, ChefHat, Store, MoreHorizontal, CheckCircle, AlertTriangle, Plus, Edit3, Trash2, Circle, X, Image, Upload, ToggleLeft, ToggleRight, Save, Ban, Clock, Eye, Lock, LucideIconData } from 'lucide-angular';

interface MenuType {
  value: string;
  label: string;
  icon: LucideIconData;
}

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
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
  selectedImageFile = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);
  showCategoryDropdown = signal(false);
  categorySearchQuery = signal('');

  readonly filteredMenuTypes = computed(() => {
    const query = this.categorySearchQuery().toLowerCase();
    if (!query) return this.menuTypes;
    return this.menuTypes.filter(t =>
      t.label.toLowerCase().includes(query) || t.value.toLowerCase().includes(query)
    );
  });

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeCategoryDropdown();
  }

  onCategorySearch(query: string): void {
    this.categorySearchQuery.set(query);
  }

  imageFitMode = signal<'contain' | 'cover' | 'fill' | 'scale-down'>('contain');

  // Forms
  menuForm: FormGroup;
  accessForm: FormGroup;

  // Constants
  readonly DESCRIPTION_MAX_LENGTH = 500;

  // Lucide icons exposed to template
  readonly Sun = Sun;
  readonly Moon = Moon;
  readonly UtensilsCrossed = UtensilsCrossed;
  readonly Soup = Soup;
  readonly Salad = Salad;
  readonly Cookie = Cookie;
  readonly Coffee = Coffee;
  readonly Wine = Wine;
  readonly Beer = Beer;
  readonly Leaf = Leaf;
  readonly Heart = Heart;
  readonly Star = Star;
  readonly CalendarDays = CalendarDays;
  readonly Package = Package;
  readonly ChefHat = ChefHat;
  readonly Store = Store;
  readonly MoreHorizontal = MoreHorizontal;
  readonly CheckCircle = CheckCircle;
  readonly AlertTriangle = AlertTriangle;
  readonly Plus = Plus;
  readonly Edit3 = Edit3;
  readonly Trash2 = Trash2;
  readonly Circle = Circle;
  readonly X = X;
  readonly Image = Image;
  readonly Upload = Upload;
  readonly ToggleLeft = ToggleLeft;
  readonly ToggleRight = ToggleRight;
  readonly Save = Save;
  readonly Ban = Ban;
  readonly Clock = Clock;
  readonly Eye = Eye;
  readonly Lock = Lock;

  readonly menuTypes: MenuType[] = [
    { value: 'breakfast', label: 'Breakfast', icon: Sun },
    { value: 'brunch', label: 'Brunch', icon: Sun },
    { value: 'lunch', label: 'Lunch', icon: Sun },
    { value: 'dinner', label: 'Dinner', icon: Moon },
    { value: 'appetizers', label: 'Appetizers', icon: UtensilsCrossed },
    { value: 'starters', label: 'Starters', icon: UtensilsCrossed },
    { value: 'soups', label: 'Soups', icon: Soup },
    { value: 'salads', label: 'Salads', icon: Salad },
    { value: 'main-courses', label: 'Main Courses', icon: UtensilsCrossed },
    { value: 'sides', label: 'Sides', icon: Circle },
    { value: 'desserts', label: 'Desserts', icon: Cookie },
    { value: 'seafood', label: 'Seafood', icon: UtensilsCrossed },
    { value: 'chicken', label: 'Chicken', icon: ChefHat },
    { value: 'beef', label: 'Beef', icon: ChefHat },
    { value: 'pork', label: 'Pork', icon: ChefHat },
    { value: 'lamb', label: 'Lamb', icon: ChefHat },
    { value: 'vegetarian', label: 'Vegetarian', icon: Leaf },
    { value: 'vegan', label: 'Vegan', icon: Leaf },
    { value: 'gluten-free', label: 'Gluten-Free', icon: Leaf },
    { value: 'healthy', label: 'Healthy Options', icon: Heart },
    { value: 'beverages', label: 'Beverages', icon: Coffee },
    { value: 'coffee-tea', label: 'Coffee & Tea', icon: Coffee },
    { value: 'cocktails', label: 'Cocktails', icon: Wine },
    { value: 'wine', label: 'Wine', icon: Wine },
    { value: 'beer', label: 'Beer', icon: Beer },
    { value: 'smoothies', label: 'Smoothies & Juices', icon: Coffee },
    { value: 'italian', label: 'Italian', icon: Store },
    { value: 'asian', label: 'Asian', icon: Store },
    { value: 'mexican', label: 'Mexican', icon: Store },
    { value: 'american', label: 'American', icon: Store },
    { value: 'mediterranean', label: 'Mediterranean', icon: Store },
    { value: 'indian', label: 'Indian', icon: Store },
    { value: 'kids-menu', label: 'Kids Menu', icon: Star },
    { value: 'specials', label: 'Chef Specials', icon: Star },
    { value: 'seasonal', label: 'Seasonal', icon: CalendarDays },
    { value: 'combo-meals', label: 'Combo Meals', icon: Package },
    { value: 'snacks', label: 'Snacks', icon: Cookie },
    { value: 'bakery', label: 'Bakery', icon: Cookie },
    { value: 'other', label: 'Other', icon: MoreHorizontal }
  ];

  readonly permissionLevels = [
    {
      value: 'edit_view',
      label: 'Full Access',
      description: 'Can edit, view, and manage all menu items',
      icon: Star,
      features: ['Edit menu items', 'Add new items', 'Delete items', 'View analytics', 'Manage pricing']
    },
    {
      value: 'view_only',
      label: 'View Only',
      description: 'Can view menu but cannot make changes',
      icon: Eye,
      features: ['View menu items', 'See pricing', 'Access read-only analytics']
    },
    {
      value: 'no_edit',
      label: 'Restricted',
      description: 'Limited access with specific restrictions',
      icon: Lock,
      features: ['Basic menu viewing', 'No editing permissions', 'No analytics access']
    }
  ];

  readonly accessDurations = [
    { value: 7, label: '1 Week', icon: CalendarDays },
    { value: 30, label: '1 Month', icon: CalendarDays },
    { value: 90, label: '3 Months', icon: CalendarDays },
    { value: 365, label: '1 Year', icon: CalendarDays },
    { value: -1, label: 'Never', icon: Ban }
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
    this.loadImageFitPreference();
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
    this.showCreateMenuModal.set(true);
    this.selectedMenuItem.set(menuItem);
    this.menuForm.patchValue({
      name: menuItem.title,
      description: menuItem.description,
      type: menuItem.category,
      price: menuItem.price,
      backgroundImage: menuItem.background_image,
      isActive: menuItem.is_active
    });
  }

  openCreateMenuModal(): void {
    this.showCreateMenuModal.set(true);
    this.isEditingMenu.set(false);
    this.selectedMenuItem.set(null);
    this.selectedImageFile.set(null);
    this.imagePreviewUrl.set(null);
    this.showCategoryDropdown.set(false);
    this.menuForm.reset({
      name: '',
      description: '',
      type: '',
      price: null,
      backgroundImage: '',
      isPublic: true,
      isActive: true
    });
  }

  closeCreateMenuModal(): void {
    this.showCreateMenuModal.set(false);
    this.isEditingMenu.set(false);
    this.selectedMenuItem.set(null);
    this.selectedImageFile.set(null);
    this.imagePreviewUrl.set(null);
    this.showCategoryDropdown.set(false);
    this.menuForm.reset();
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (!file.type.startsWith('image/')) {
        this.errorMessage.set('Please select a valid image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage.set('Image size must be less than 5MB');
        return;
      }

      this.selectedImageFile.set(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        this.imagePreviewUrl.set(result);
        this.menuForm.patchValue({ backgroundImage: result });
      };
      reader.readAsDataURL(file);
    }
  }

  removeSelectedImage(): void {
    this.selectedImageFile.set(null);
    this.imagePreviewUrl.set(null);
    this.menuForm.patchValue({ backgroundImage: '' });
  }

  getCategoryLabel(category: string): string {
    const type = this.menuTypes.find(t => t.value === category);
    return type ? type.label : category;
  }

  getCategoryIcon(category: string): LucideIconData {
    return this.menuTypes.find(t => t.value === category)?.icon || MoreHorizontal;
  }

  selectCategory(value: string): void {
    this.menuForm.patchValue({ type: value });
    this.menuForm.get('type')?.markAsTouched();
    this.showCategoryDropdown.set(false);
  }

  toggleCategoryDropdown(): void {
    this.showCategoryDropdown.update(v => !v);
  }

  closeCategoryDropdown(): void {
    this.showCategoryDropdown.set(false);
  }

  onSubmitMenu(): void {
    if (this.menuForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      const formValue = this.menuForm.value;

      const menuData: MenuItem = {
        title: formValue.name,
        description: formValue.description,
        category: formValue.type,
        price: formValue.price || 0,
        background_image: formValue.backgroundImage,
        is_active: formValue.isActive
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
    this.showCreateMenuModal.set(false);
    this.isEditingMenu.set(false);
    this.selectedMenuItem.set(null);
    this.showCategoryDropdown.set(false);
    this.menuForm.reset();
  }

  openManageAccessModal(): void {
    this.showManageAccessModal.set(true);
    this.accessForm.reset();
  }

  deleteMenu(menuItem: MenuItem): void {
    if (!menuItem.id) return;

    if (confirm(`Are you sure you want to delete "${menuItem.title}"?`)) {
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

    const newAvailability = !menuItem.is_active;

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

  formatPrice(price: any): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;

    if (isNaN(numPrice) || numPrice === null || numPrice === undefined) {
      return '0.00';
    }

    return numPrice.toFixed(2);
  }

  getMenuTypeIcon(type: string): LucideIconData {
    return this.menuTypes.find(t => t.value === type)?.icon || MoreHorizontal;
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

  removeBackgroundImage(): void {
    this.menuForm.patchValue({ backgroundImage: '' });
  }

  onGrantAccess(): void {
    if (this.accessForm.valid) {
      this.isLoading.set(true);
      const formValue = this.accessForm.value;

      setTimeout(() => {
        const accessLink = `https://itiyum.com/menu/access/${Date.now()}`;

        navigator.clipboard.writeText(accessLink).then(() => {
          this.successMessage.set(`Access granted to ${formValue.email}! Link copied to clipboard: ${accessLink}`);
        });

        this.isLoading.set(false);
        this.closeManageAccessModal();
        setTimeout(() => this.successMessage.set(null), 5000);
      }, 1000);
    }
  }

  private noEmojiValidator(control: any) {
    const value = control.value;
    if (value && /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(value)) {
      return { noEmoji: true };
    }
    return null;
  }

  getInitials(email: string): string {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  }

  getPermissionIcon(permissionLevel: string): LucideIconData {
    const level = this.permissionLevels.find(l => l.value === permissionLevel);
    return level?.icon || Star;
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

  getImageFitClass(): string {
    const mode = this.imageFitMode();
    return `fit-${mode}`;
  }

  setImageFitMode(mode: 'contain' | 'cover' | 'fill' | 'scale-down'): void {
    this.imageFitMode.set(mode);
    localStorage.setItem('menu-image-fit-mode', mode);
  }

  private loadImageFitPreference(): void {
    const saved = localStorage.getItem('menu-image-fit-mode');
    if (saved && ['contain', 'cover', 'fill', 'scale-down'].includes(saved)) {
      this.imageFitMode.set(saved as any);
    }
  }
}
