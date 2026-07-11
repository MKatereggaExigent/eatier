import { AccountFreezeRequest, UserAccountActivity, UserNotificationSettings } from '../../../shared/models/user-profile.model';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CommonModule } from '@angular/common';
import { LucideAngularModule, Settings, Bell, ClipboardList, Shield, User, Calendar, Eye, Download, PauseCircle, Trash2, PlayCircle, Key, Smartphone, Mail, MessageSquare, RefreshCw, X, AlertTriangle, CheckCircle, LogIn, LogOut, FileText, CreditCard, Image, Edit, Terminal, EyeOff } from 'lucide-angular';

@Component({
  selector: 'app-user-accounts-center',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './user-accounts-center.component.html',
  styleUrls: ['./user-accounts-center.component.scss']
})
export class UserAccountsCenterComponent implements OnInit {
  private fb = inject(FormBuilder);

  readonly Settings = Settings;
  readonly Bell = Bell;
  readonly ClipboardList = ClipboardList;
  readonly Shield = Shield;
  readonly User = User;
  readonly Calendar = Calendar;
  readonly Eye = Eye;
  readonly Download = Download;
  readonly PauseCircle = PauseCircle;
  readonly Trash2 = Trash2;
  readonly PlayCircle = PlayCircle;
  readonly Key = Key;
  readonly Smartphone = Smartphone;
  readonly Mail = Mail;
  readonly MessageSquare = MessageSquare;
  readonly RefreshCw = RefreshCw;
  readonly X = X;
  readonly AlertTriangle = AlertTriangle;
  readonly CheckCircle = CheckCircle;
  readonly LogIn = LogIn;
  readonly LogOut = LogOut;
  readonly FileText = FileText;
  readonly CreditCard = CreditCard;
  readonly Image = Image;
  readonly Edit = Edit;
  readonly Terminal = Terminal;
  readonly EyeOff = EyeOff;

  activeSection = signal<string>('overview');
  isLoading = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  showFreezeModal = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  showReactivateModal = signal<boolean>(false);

  notificationForm: FormGroup;
  freezeForm: FormGroup;
  deleteForm: FormGroup;
  reactivateForm: FormGroup;

  accountActivity = signal<UserAccountActivity[]>([]);
  notificationSettings = signal<UserNotificationSettings | null>(null);
  accountStatus = signal<'active' | 'frozen' | 'pending_deletion'>('active');

  readonly freezeDurations = [
    { value: '1_week', label: '1 week', description: 'Account will be reactivated automatically after 1 week' },
    { value: '1_month', label: 'Month', description: 'Account will be reactivated automatically after 1 month' },
    { value: '6_months', label: '6 months', description: 'Account will be reactivated automatically after 6 months' },
    { value: 'indefinite', label: 'Indefinitely', description: 'Account will remain frozen until manually reactivated' }
  ];

  readonly defaultNotificationSettings: UserNotificationSettings = {
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

    setTimeout(() => {
      this.notificationSettings.set(this.defaultNotificationSettings);
      this.accountActivity.set([]);
      this.notificationForm.patchValue(this.defaultNotificationSettings);
      this.isLoading.set(false);
    }, 500);
  }

  setActiveSection(section: string): void {
    this.activeSection.set(section);
  }

  onNotificationSubmit(): void {
    if (this.notificationForm.valid) {
      this.isLoading.set(true);

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

    setTimeout(() => {
      const filename = `user-account-data-${Date.now()}.json`;
      const data = {
        exportDate: new Date().toISOString(),
        accountActivity: this.accountActivity(),
        notificationSettings: this.notificationSettings(),
        accountStatus: this.accountStatus()
      };

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

  getActionIcon(action: string): any {
    const icons: Record<string, any> = {
      'Profile Updated': Edit,
      'Business Card Generated': CreditCard,
      'Portfolio Updated': Image,
      'Login': LogIn,
      'Logout': LogOut,
      'Password Changed': Key,
      'Legacy Access Granted': Terminal,
      'Legacy Access Revoked': EyeOff,
      'Settings Updated': Settings,
      'Insights Viewed': Eye
    };
    return icons[action] || FileText;
  }

  getDeviceIcon(userAgent: string | undefined): any {
    return Smartphone;
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
