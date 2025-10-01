import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AccountFreezeOptions, AccountActivity, NotificationSettings } from '../../../shared/models/business-profile.model';

@Component({
  selector: 'app-accounts-center',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './accounts-center.component.html',
  styleUrls: ['./accounts-center.component.scss']
})
export class AccountsCenterComponent implements OnInit {
  private fb = inject(FormBuilder);

  // State management
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

  // Mock data
  mockNotificationSettings: NotificationSettings = {
    messages: true,
    updates: true,
    customerAlerts: true,
    marketingEmails: false,
    systemNotifications: true,
    emailFrequency: 'daily'
  };

  mockAccountActivity: AccountActivity[] = [
    {
      id: '1',
      userId: 'user-1',
      action: 'Profile Updated',
      details: { field: 'business_hours', oldValue: '9-5', newValue: '11-10' },
      timestamp: new Date('2024-01-20T14:30:00'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    {
      id: '2',
      userId: 'user-1',
      action: 'Menu Created',
      details: { menuName: 'Breakfast Menu', menuType: 'breakfast' },
      timestamp: new Date('2024-01-19T09:15:00'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    {
      id: '3',
      userId: 'user-1',
      action: 'Login',
      details: { method: 'email', success: true },
      timestamp: new Date('2024-01-19T08:00:00'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    {
      id: '4',
      userId: 'user-1',
      action: 'Password Changed',
      details: { method: 'security_settings' },
      timestamp: new Date('2024-01-18T16:45:00'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    {
      id: '5',
      userId: 'user-1',
      action: 'Menu Access Granted',
      details: { email: 'chef@restaurant.com', permission: 'edit_view' },
      timestamp: new Date('2024-01-17T11:20:00'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  ];

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

  loadAccountData(): void {
    this.isLoading.set(true);

    // Mock API calls
    setTimeout(() => {
      this.notificationSettings.set(this.mockNotificationSettings);
      this.accountActivity.set(this.mockAccountActivity);

      // Populate notification form
      this.notificationForm.patchValue(this.mockNotificationSettings);

      this.isLoading.set(false);
    }, 1000);
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
