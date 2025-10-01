import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AccountFreezeRequest, UserAccountActivity, UserNotificationSettings } from '../../../shared/models/user-profile.model';

@Component({
  selector: 'app-user-accounts-center',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-accounts-center.component.html',
  styleUrls: ['./user-accounts-center.component.scss']
})
export class UserAccountsCenterComponent implements OnInit {
  private fb = inject(FormBuilder);

  // State management
  activeSection = signal<string>('overview');
  isLoading = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  showFreezeModal = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  showReactivateModal = signal<boolean>(false);

  // Forms
  notificationForm: FormGroup;
  freezeForm: FormGroup;
  deleteForm: FormGroup;
  reactivateForm: FormGroup;

  // Data
  accountActivity = signal<UserAccountActivity[]>([]);
  notificationSettings = signal<UserNotificationSettings | null>(null);
  accountStatus = signal<'active' | 'frozen' | 'pending_deletion'>('active');

  // Freeze duration options as specified
  readonly freezeDurations = [
    { value: '1_week', label: '1 week', description: 'Account will be reactivated automatically after 1 week' },
    { value: '1_month', label: 'Month', description: 'Account will be reactivated automatically after 1 month' },
    { value: '6_months', label: '6 months', description: 'Account will be reactivated automatically after 6 months' },
    { value: 'indefinite', label: 'Indefinitely', description: 'Account will remain frozen until manually reactivated' }
  ];

  // Mock data
  mockNotificationSettings: UserNotificationSettings = {
    customerUpdates: true,
    systemUpdates: true,
    marketingEmails: false,
    professionalInquiries: true,
    bookingNotifications: true,
    reviewNotifications: true,
    emailFrequency: 'daily',
    pushNotifications: true,
    smsNotifications: false
  };

  mockAccountActivity: UserAccountActivity[] = [
    {
      id: '1',
      userId: 'user-1',
      action: 'Profile Updated',
      details: { field: 'specialty_dishes', added: 'Pasta Carbonara' },
      timestamp: new Date('2024-01-20T14:30:00'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      location: 'New York, NY'
    },
    {
      id: '2',
      userId: 'user-1',
      action: 'Business Card Generated',
      details: { format: 'QR Code', customization: 'professional_layout' },
      timestamp: new Date('2024-01-19T16:45:00'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: 'New York, NY'
    },
    {
      id: '3',
      userId: 'user-1',
      action: 'Login',
      details: { method: 'email', success: true },
      timestamp: new Date('2024-01-19T08:00:00'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: 'New York, NY'
    },
    {
      id: '4',
      userId: 'user-1',
      action: 'Portfolio Updated',
      details: { images_added: 2, images_removed: 1 },
      timestamp: new Date('2024-01-18T12:15:00'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      location: 'New York, NY'
    },
    {
      id: '5',
      userId: 'user-1',
      action: 'Legacy Access Granted',
      details: { delegate_email: 'assistant@example.com', access_level: 'manage_profile' },
      timestamp: new Date('2024-01-15T10:30:00'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: 'New York, NY'
    }
  ];

  constructor() {
    this.notificationForm = this.fb.group({
      customerUpdates: [true],
      systemUpdates: [true],
      marketingEmails: [false],
      professionalInquiries: [true],
      bookingNotifications: [true],
      reviewNotifications: [true],
      emailFrequency: ['daily', Validators.required],
      pushNotifications: [true],
      smsNotifications: [false]
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

    this.reactivateForm = this.fb.group({
      password: ['', Validators.required],
      verificationCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
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
      const filename = `user-account-data-${Date.now()}.json`;
      const data = {
        exportDate: new Date().toISOString(),
        accountActivity: this.accountActivity(),
        notificationSettings: this.notificationSettings(),
        accountStatus: this.accountStatus()
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
        this.accountStatus.set('frozen');
        this.isLoading.set(false);
        this.closeFreezeModal();
        this.successMessage.set(`Account frozen for ${this.getFreezeLabel(formValue.duration)}. You can reactivate anytime.`);
        setTimeout(() => this.successMessage.set(null), 5000);
      }, 1500);
    }
  }

  openReactivateModal(): void {
    this.showReactivateModal.set(true);
    this.reactivateForm.reset();
  }

  closeReactivateModal(): void {
    this.showReactivateModal.set(false);
    this.reactivateForm.reset();
  }

  onReactivateSubmit(): void {
    if (this.reactivateForm.valid) {
      this.isLoading.set(true);

      // Mock API call
      setTimeout(() => {
        this.accountStatus.set('active');
        this.isLoading.set(false);
        this.closeReactivateModal();
        this.successMessage.set('Account reactivated successfully! Welcome back!');
        setTimeout(() => this.successMessage.set(null), 3000);
      }, 2000);
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
        this.accountStatus.set('pending_deletion');
        this.isLoading.set(false);
        this.closeDeleteModal();
        this.successMessage.set('Account deletion request submitted. You have 30 days to cancel before permanent deletion.');
        setTimeout(() => this.successMessage.set(null), 5000);
      }, 2000);
    }
  }

  sendVerificationCode(): void {
    // Mock sending verification code
    this.successMessage.set('Verification code sent to your email address.');
    setTimeout(() => this.successMessage.set(null), 3000);
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
      'Business Card Generated': '💳',
      'Portfolio Updated': '🖼️',
      'Login': '🔐',
      'Logout': '🚪',
      'Password Changed': '🔑',
      'Legacy Access Granted': '👥',
      'Legacy Access Revoked': '🚫',
      'Settings Updated': '⚙️',
      'Insights Viewed': '📊'
    };
    return icons[action] || '📄';
  }

  getDeviceIcon(userAgent: string | undefined): string {
    if (!userAgent) return '💻';
    if (userAgent.includes('iPhone') || userAgent.includes('Android')) {
      return '📱';
    } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
      return '📱';
    } else {
      return '💻';
    }
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
      if (field.errors?.['pattern']) {
        return 'Please enter a valid 6-digit verification code';
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
      verificationCode: 'Verification code',
      emailFrequency: 'Email frequency'
    };
    return labels[fieldName] || fieldName;
  }
}
