import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { LegacyAccountAccess, LegacyAccessRequest } from '../../../shared/models/user-profile.model';

@Component({
  selector: 'app-legacy-access',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './legacy-access.component.html',
  styleUrls: ['./legacy-access.component.scss']
})
export class LegacyAccessComponent implements OnInit {
  private fb = inject(FormBuilder);

  // State management
  legacyAccesses = signal<LegacyAccountAccess[]>([]);
  isLoading = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  showGrantModal = signal<boolean>(false);
  showRevokeModal = signal<boolean>(false);
  selectedAccess = signal<LegacyAccountAccess | null>(null);

  // Forms
  grantAccessForm: FormGroup;
  passwordForm: FormGroup;

  // Make Object available in template
  readonly Object = Object;

  // Access level options as specified
  readonly accessLevels = [
    {
      value: 'manage_profile',
      label: 'Manage Profile',
      description: 'Will require owner to share password',
      permissions: {
        editProfile: true,
        viewInsights: true,
        manageBusinessCard: true,
        accessAccountCenter: true
      }
    }
  ];

  // Mock data
  mockLegacyAccesses: LegacyAccountAccess[] = [
    {
      id: '1',
      ownerId: 'user-1',
      delegateEmail: 'assistant@example.com',
      delegateName: 'Sarah Johnson',
      accessLevel: 'manage_profile',
      permissions: {
        editProfile: true,
        viewInsights: true,
        manageBusinessCard: true,
        accessAccountCenter: true
      },
      requiresPassword: true,
      isActive: true,
      createdAt: new Date('2024-01-15'),
      lastAccessedAt: new Date('2024-01-20')
    },
    {
      id: '2',
      ownerId: 'user-1',
      delegateEmail: 'manager@restaurant.com',
      delegateName: 'Michael Chen',
      accessLevel: 'view_edit_restricted',
      permissions: {
        editProfile: true,
        viewInsights: false,
        manageBusinessCard: false,
        accessAccountCenter: false
      },
      requiresPassword: false,
      isActive: true,
      expiresAt: new Date('2024-06-15'),
      createdAt: new Date('2024-01-10'),
      lastAccessedAt: new Date('2024-01-18')
    }
  ];

  constructor() {
    this.grantAccessForm = this.fb.group({
      delegateEmail: ['', [Validators.required, Validators.email]],
      delegateName: ['', [Validators.required, Validators.minLength(2)]],
      accessLevel: ['view_edit_restricted', Validators.required],
      message: [''],
      expirationDays: [90, [Validators.min(1), Validators.max(365)]],
      requiresPassword: [false]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      confirmPassword: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadLegacyAccesses();
  }

  loadLegacyAccesses(): void {
    this.isLoading.set(true);

    // Mock API call
    setTimeout(() => {
      this.legacyAccesses.set(this.mockLegacyAccesses);
      this.isLoading.set(false);
    }, 1000);
  }

  openGrantModal(): void {
    this.showGrantModal.set(true);
    this.grantAccessForm.reset({
      accessLevel: 'view_edit_restricted',
      expirationDays: 90,
      requiresPassword: false
    });
  }

  closeGrantModal(): void {
    this.showGrantModal.set(false);
    this.grantAccessForm.reset();
  }

  onGrantAccess(): void {
    if (this.grantAccessForm.valid) {
      this.isLoading.set(true);
      const formValue = this.grantAccessForm.value;

      // Mock API call
      setTimeout(() => {
        const accessLevel = this.accessLevels.find(level => level.value === formValue.accessLevel);

        const newAccess: LegacyAccountAccess = {
          id: Date.now().toString(),
          ownerId: 'user-1',
          delegateEmail: formValue.delegateEmail,
          delegateName: formValue.delegateName,
          accessLevel: formValue.accessLevel,
          permissions: accessLevel?.permissions || {
            editProfile: false,
            viewInsights: false,
            manageBusinessCard: false,
            accessAccountCenter: false
          },
          requiresPassword: formValue.requiresPassword,
          isActive: true,
          expiresAt: formValue.expirationDays ?
            new Date(Date.now() + formValue.expirationDays * 24 * 60 * 60 * 1000) :
            undefined,
          createdAt: new Date()
        };

        this.legacyAccesses.update(accesses => [...accesses, newAccess]);
        this.isLoading.set(false);
        this.closeGrantModal();
        this.successMessage.set(`Access granted to ${formValue.delegateName}. They will receive an email with instructions.`);
        setTimeout(() => this.successMessage.set(null), 5000);
      }, 1500);
    }
  }

  openRevokeModal(access: LegacyAccountAccess): void {
    this.selectedAccess.set(access);
    this.showRevokeModal.set(true);
    this.passwordForm.reset();
  }

  closeRevokeModal(): void {
    this.showRevokeModal.set(false);
    this.selectedAccess.set(null);
    this.passwordForm.reset();
  }

  onRevokeAccess(): void {
    if (this.passwordForm.valid && this.selectedAccess()) {
      this.isLoading.set(true);

      // Mock API call
      setTimeout(() => {
        const accessId = this.selectedAccess()!.id;
        this.legacyAccesses.update(accesses =>
          accesses.map(access =>
            access.id === accessId
              ? { ...access, isActive: false }
              : access
          )
        );

        this.isLoading.set(false);
        this.closeRevokeModal();
        this.successMessage.set('Access revoked successfully.');
        setTimeout(() => this.successMessage.set(null), 3000);
      }, 1000);
    }
  }

  toggleAccessStatus(access: LegacyAccountAccess): void {
    this.legacyAccesses.update(accesses =>
      accesses.map(a =>
        a.id === access.id
          ? { ...a, isActive: !a.isActive }
          : a
      )
    );

    const status = access.isActive ? 'deactivated' : 'activated';
    this.successMessage.set(`Access ${status} for ${access.delegateName}`);
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  getAccessLevelLabel(level: string): string {
    return this.accessLevels.find(l => l.value === level)?.label || level;
  }

  getAccessLevelDescription(level: string): string {
    return this.accessLevels.find(l => l.value === level)?.description || '';
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateTime(date: Date): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isExpired(access: LegacyAccountAccess): boolean {
    return access.expiresAt ? new Date() > access.expiresAt : false;
  }

  isExpiringSoon(access: LegacyAccountAccess): boolean {
    if (!access.expiresAt) return false;
    const daysUntilExpiry = Math.ceil((access.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  }

  getDaysUntilExpiry(access: LegacyAccountAccess): number {
    if (!access.expiresAt) return -1;
    return Math.ceil((access.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
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
      if (field.errors?.['min']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors?.['min'].min}`;
      }
      if (field.errors?.['max']) {
        return `${this.getFieldLabel(fieldName)} must be no more than ${field.errors?.['max'].max}`;
      }
    }
    return null;
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      delegateEmail: 'Email address',
      delegateName: 'Full name',
      accessLevel: 'Access level',
      expirationDays: 'Expiration days',
      currentPassword: 'Current password',
      confirmPassword: 'Confirm password'
    };
    return labels[fieldName] || fieldName;
  }

  getPermissionIcon(permission: string): string {
    const icons: Record<string, string> = {
      editProfile: '✏️',
      viewInsights: '📊',
      manageBusinessCard: '💳',
      accessAccountCenter: '⚙️'
    };
    return icons[permission] || '📄';
  }

  getPermissionLabel(permission: string): string {
    const labels: Record<string, string> = {
      editProfile: 'Edit Profile',
      viewInsights: 'View Insights',
      manageBusinessCard: 'Manage Business Card',
      accessAccountCenter: 'Access Account Center'
    };
    return labels[permission] || permission;
  }

  getPermissionValue(permissions: any, permission: string): boolean {
    return permissions[permission] || false;
  }
}
