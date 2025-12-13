import { AccountActivity, AccountFreezeOptions, NotificationSettings } from '../../../shared/models/business-profile.model';
import { Business, BusinessOwnerService } from '../../../core/services/business-owner.service';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, finalize, of, takeUntil } from 'rxjs';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-accounts-center',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './accounts-center.component.html',
  styleUrls: ['./accounts-center.component.scss']
})
export class AccountsCenterComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private businessOwnerService = inject(BusinessOwnerService);
  private destroy$ = new Subject<void>();

  // State management
  business = signal<Business | null>(null);
  activeSection = signal<string>('overview');
  isLoading = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  showFreezeModal = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);

  // Forms
  notificationForm: FormGroup;
  freezeForm: FormGroup;
  deleteForm: FormGroup;

  // Data
  accountActivity = signal<AccountActivity[]>([]);
  notificationSettings = signal<NotificationSettings | null>(null);

  // Freeze duration options
  readonly freezeDurations = [
    { value: '1_week', label: '1 week', description: 'Account will be reactivated automatically after 1 week' },
    { value: '1_month', label: 'Month', description: 'Account will be reactivated automatically after 1 month' },
    { value: '6_months', label: '6 months', description: 'Account will be reactivated automatically after 6 months' },
    { value: 'indefinite', label: 'Indefinitely', description: 'Account will remain frozen until manually reactivated' }
  ];

  // Default notification settings for new accounts
  readonly defaultNotificationSettings: NotificationSettings = {
    messages: true,
    updates: true,
    customerAlerts: true,
    marketingEmails: false,
    systemNotifications: true,
    emailFrequency: 'daily'
  };

  constructor() {
    this.notificationForm = this.fb.group({
      messages: [true],
      updates: [true],
      customerAlerts: [true],
      marketingEmails: [false],
      systemNotifications: [true],
      emailFrequency: ['daily', Validators.required]
    });

    this.freezeForm = this.fb.group({
      duration: ['1_week', Validators.required],
      reason: ['']
    });

    this.deleteForm = this.fb.group({
      confirmText: ['', [Validators.required, this.confirmDeleteValidator]],
      reason: [''],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadAccountData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAccountData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.businessOwnerService.getMyBusiness()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading business data:', error);
          this.errorMessage.set('Failed to load account data. Please try again.');
          return of({ business: null });
        }),
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe(response => {
        if (response && response.business) {
          this.business.set(response.business);

          // Load notification settings (using defaults until API is available)
          this.notificationSettings.set(this.defaultNotificationSettings);
          this.notificationForm.patchValue(this.defaultNotificationSettings);

          // Account activity will be empty until API is available
          this.accountActivity.set([]);
        }
      });
  }

  setActiveSection(section: string): void {
    this.activeSection.set(section);
  }

  onNotificationSubmit(): void {
    if (this.notificationForm.valid) {
      this.isLoading.set(true);

      // Mock API call
      setTimeout(() => {
        const formValue = this.notificationForm.value;
        this.notificationSettings.set(formValue);
        this.isLoading.set(false);
        this.successMessage.set('Notification settings updated successfully!');
        setTimeout(() => this.successMessage.set(null), 3000);
      }, 1000);
    }
  }

  exportAccountData(): void {
    this.isLoading.set(true);

    // Mock export process
    setTimeout(() => {
      const filename = `account-activity-${Date.now()}.json`;
      const data = {
        exportDate: new Date().toISOString(),
        accountActivity: this.accountActivity(),
        notificationSettings: this.notificationSettings()
      };

      // Create mock download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      this.isLoading.set(false);
      this.successMessage.set('Account data exported successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
    }, 2000);
  }

  openFreezeModal(): void {
    this.showFreezeModal.set(true);
    this.freezeForm.reset({ duration: '1_week' });
  }

  closeFreezeModal(): void {
    this.showFreezeModal.set(false);
    this.freezeForm.reset();
  }

  onFreezeSubmit(): void {
    if (this.freezeForm.valid) {
      this.isLoading.set(true);
      const formValue = this.freezeForm.value;

      // Mock API call
      setTimeout(() => {
        console.log('Freezing account:', formValue);
        this.isLoading.set(false);
        this.closeFreezeModal();
        this.successMessage.set(`Account will be frozen for ${this.getFreezeLabel(formValue.duration)}`);
        setTimeout(() => this.successMessage.set(null), 3000);
      }, 1500);
    }
  }

  openDeleteModal(): void {
    this.showDeleteModal.set(true);
    this.deleteForm.reset();
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deleteForm.reset();
  }

  onDeleteSubmit(): void {
    if (this.deleteForm.valid) {
      this.isLoading.set(true);

      // Mock API call
      setTimeout(() => {
        console.log('Deleting account permanently');
        this.isLoading.set(false);
        this.closeDeleteModal();
        this.successMessage.set('Account deletion request submitted. You will receive a confirmation email.');
        setTimeout(() => this.successMessage.set(null), 5000);
      }, 2000);
    }
  }

  private confirmDeleteValidator(control: any) {
    const value = control.value;
    if (value !== 'DELETE MY ACCOUNT') {
      return { confirmDelete: true };
    }
    return null;
  }

  getFreezeLabel(duration: string): string {
    return this.freezeDurations.find(d => d.value === duration)?.label || duration;
  }

  getFreezeDescription(duration: string): string {
    return this.freezeDurations.find(d => d.value === duration)?.description || '';
  }

  formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getActionIcon(action: string): string {
    const icons: Record<string, string> = {
      'Profile Updated': '✏️',
      'Menu Created': '📋',
      'Menu Updated': '📝',
      'Login': '🔐',
      'Logout': '🚪',
      'Password Changed': '🔑',
      'Menu Access Granted': '🔗',
      'Menu Access Revoked': '🚫',
      'Settings Updated': '⚙️'
    };
    return icons[action] || '📄';
  }

  formatActivityDetails(details: any): string {
    if (!details) return '';

    const entries = Object.entries(details);
    if (entries.length === 0) return '';

    return entries.map(([key, value]) => {
      // Format the key to be more readable
      const formattedKey = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/^\w/, c => c.toUpperCase());

      return `${formattedKey}: ${value}`;
    }).join(' • ');
  }

  getFieldError(form: FormGroup, fieldName: string): string | null {
    const field = form.get(fieldName);
    if (field && field.invalid && (field.dirty || field.touched)) {
      if (field.errors?.['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors?.['confirmDelete']) {
        return 'Please type "DELETE MY ACCOUNT" to confirm';
      }
    }
    return null;
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      duration: 'Freeze duration',
      reason: 'Reason',
      confirmText: 'Confirmation text',
      password: 'Password',
      emailFrequency: 'Email frequency'
    };
    return labels[fieldName] || fieldName;
  }
}
