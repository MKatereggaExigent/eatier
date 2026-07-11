import { AccountFreezeOptions } from '../../../shared/models/business-profile.model';
import { AccountActivity, Business, BusinessOwnerService, BusinessSubscription, NotificationSettings } from '../../../core/services/business-owner.service';
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  isPopular?: boolean;
  isCurrent?: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  lastFour: string;
  expiryDate?: string;
  holderName: string;
  isDefault: boolean;
}

@Component({
  selector: 'app-accounts-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accounts-center.component.html',
  styleUrls: ['./accounts-center.component.scss']
})
export class AccountsCenterComponent implements OnInit {
  private businessOwnerService = inject(BusinessOwnerService);
  private http = inject(HttpClient);

  // State management
  business = signal<Business | null>(null);
  activeSection = signal<string>('overview');
  isLoading = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  showFreezeModal = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  showPaymentModal = signal<boolean>(false);
  isProcessingPayment = signal<boolean>(false);
  showChangePasswordModal = signal<boolean>(false);
  show2FAModal = signal<boolean>(false);
  showSessionsModal = signal<boolean>(false);
  twoFactorEnabled = signal<boolean>(false);
  twoFactorMethod = signal<'email' | 'mobile' | null>(null);
  backupCodes = signal<string[]>([]);
  sessions = signal<any[]>([]);

  // Subscription & Billing
  subscription = signal<BusinessSubscription | null>(null);
  selectedPlan = signal<SubscriptionPlan | null>(null);
  paymentMethods = signal<PaymentMethod[]>([]);
  billingCycle = signal<'monthly' | 'yearly'>('monthly');

  // Data
  accountActivity = signal<AccountActivity[]>([]);
  notificationSettings = signal<NotificationSettings | null>(null);

  // Notification form
  notifMessages = signal(true);
  notifUpdates = signal(true);
  notifCustomerAlerts = signal(true);
  notifMarketingEmails = signal(false);
  notifSystemNotifications = signal(true);
  notifEmailFrequency = signal('daily');

  // Freeze form
  freezeDuration = signal('1_week');
  freezeReason = signal('');

  // Delete form
  deleteConfirmText = signal('');
  deleteReason = signal('');
  deletePassword = signal('');

  // Payment form
  paymentType = signal('card');
  cardHolderName = signal('');
  cardNumber = signal('');
  expiryMonth = signal('');
  expiryYear = signal('');
  cvv = signal('');
  accountHolderName = signal('');
  accountNumber = signal('');
  routingNumber = signal('');
  bankName = signal('');
  billingAddress = signal('');
  billingCity = signal('');
  billingState = signal('');
  billingZip = signal('');
  billingCountry = signal('South Africa');
  savePaymentMethod = signal(true);

  // Change password form
  currentPassword = signal('');
  newPwd = signal('');
  confirmPwd = signal('');

  // 2FA form
  twoFAMethod = signal<'email' | 'mobile'>('email');

  // Subscription Plans
  readonly subscriptionPlans: SubscriptionPlan[] = [
    {
      id: 'basic',
      name: 'Basic',
      price: 29.99,
      billingCycle: 'monthly',
      features: [
        'Up to 50 menu items',
        'Basic analytics',
        'Email support',
        'Standard listing'
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 79.99,
      billingCycle: 'monthly',
      features: [
        'Unlimited menu items',
        'Advanced analytics',
        'Priority support',
        'Featured listing',
        'Customer insights',
        'Booking management'
      ],
      isPopular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 199.99,
      billingCycle: 'monthly',
      features: [
        'Everything in Professional',
        'Multi-location support',
        'API access',
        'Dedicated account manager',
        'Custom integrations',
        'White-label options'
      ]
    }
  ];

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

  ngOnInit(): void {
    this.loadAccountData();
  }

  loadAccountData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.businessOwnerService.getMyBusiness().subscribe({
      next: (response) => {
        if (response && response.business) {
          this.business.set(response.business);

          if (response.subscription) {
            this.subscription.set(response.subscription);
          }

          this.loadNotificationSettings();
          this.loadAccountActivity();
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading business data:', error);
        this.errorMessage.set('Failed to load account data. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  loadNotificationSettings(): void {
    this.businessOwnerService.getNotificationSettings().subscribe({
      next: (settings) => {
        this.notificationSettings.set(settings);
        this.notifMessages.set(settings.messages);
        this.notifUpdates.set(settings.updates);
        this.notifCustomerAlerts.set(settings.customerAlerts);
        this.notifMarketingEmails.set(settings.marketingEmails);
        this.notifSystemNotifications.set(settings.systemNotifications);
        this.notifEmailFrequency.set(settings.emailFrequency);
      },
      error: (error) => {
        console.error('Error loading notification settings:', error);
        const defaults = this.defaultNotificationSettings;
        this.notifMessages.set(defaults.messages);
        this.notifUpdates.set(defaults.updates);
        this.notifCustomerAlerts.set(defaults.customerAlerts);
        this.notifMarketingEmails.set(defaults.marketingEmails);
        this.notifSystemNotifications.set(defaults.systemNotifications);
        this.notifEmailFrequency.set(defaults.emailFrequency);
      }
    });
  }

  loadAccountActivity(): void {
    this.businessOwnerService.getAccountActivity(50, 0).subscribe({
      next: (response) => {
        this.accountActivity.set(response.activities);
      },
      error: (error) => {
        console.error('Error loading account activity:', error);
      }
    });
  }

  setActiveSection(section: string): void {
    this.activeSection.set(section);
  }

  onNotificationSubmit(form: NgForm): void {
    if (form.valid) {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      const formValue: NotificationSettings = {
        messages: this.notifMessages(),
        updates: this.notifUpdates(),
        customerAlerts: this.notifCustomerAlerts(),
        marketingEmails: this.notifMarketingEmails(),
        systemNotifications: this.notifSystemNotifications(),
        emailFrequency: this.notifEmailFrequency() as 'daily' | 'weekly' | 'immediate'
      };

      this.businessOwnerService.updateNotificationSettings(formValue).subscribe({
        next: (response) => {
          if (response) {
            this.notificationSettings.set(response.settings);
            this.successMessage.set('Notification settings updated successfully!');
            setTimeout(() => this.successMessage.set(null), 3000);
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error updating notification settings:', error);
          this.errorMessage.set('Failed to update notification settings. Please try again.');
          this.isLoading.set(false);
        }
      });
    }
  }

  exportAccountData(): void {
    this.isLoading.set(true);

    setTimeout(() => {
      const filename = `account-activity-${Date.now()}.json`;
      const data = {
        exportDate: new Date().toISOString(),
        accountActivity: this.accountActivity(),
        notificationSettings: this.notificationSettings()
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
    this.freezeDuration.set('1_week');
    this.freezeReason.set('');
  }

  closeFreezeModal(): void {
    this.showFreezeModal.set(false);
    this.freezeDuration.set('1_week');
    this.freezeReason.set('');
  }

  onFreezeSubmit(): void {
    this.isLoading.set(true);

    setTimeout(() => {
      console.log('Freezing account:', { duration: this.freezeDuration(), reason: this.freezeReason() });
      this.isLoading.set(false);
      this.closeFreezeModal();
      this.successMessage.set(`Account will be frozen for ${this.getFreezeLabel(this.freezeDuration())}`);
      setTimeout(() => this.successMessage.set(null), 3000);
    }, 1500);
  }

  openDeleteModal(): void {
    this.showDeleteModal.set(true);
    this.deleteConfirmText.set('');
    this.deleteReason.set('');
    this.deletePassword.set('');
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deleteConfirmText.set('');
    this.deleteReason.set('');
    this.deletePassword.set('');
  }

  onDeleteSubmit(): void {
    if (this.deleteConfirmText() === 'DELETE MY ACCOUNT' && this.deletePassword()) {
      this.isLoading.set(true);

      setTimeout(() => {
        console.log('Deleting account permanently');
        this.isLoading.set(false);
        this.closeDeleteModal();
        this.successMessage.set('Account deletion request submitted. You will receive a confirmation email.');
        setTimeout(() => this.successMessage.set(null), 5000);
      }, 2000);
    }
  }

  getFreezeLabel(duration: string): string {
    return this.freezeDurations.find(d => d.value === duration)?.label || duration;
  }

  getFreezeDescription(duration: string): string {
    return this.freezeDurations.find(d => d.value === duration)?.description || '';
  }

  formatTimestamp(timestamp: Date | string): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getActionIcon(action: string): string {
    const icons: Record<string, string> = {
      'Profile Updated': 'edit',
      'Menu Created': 'clipboard',
      'Menu Updated': 'file-text',
      'Login': 'lock',
      'Logout': 'log-out',
      'Password Changed': 'key',
      'password_changed': 'key',
      'Menu Access Granted': 'link',
      'Menu Access Revoked': 'slash',
      'Settings Updated': 'settings',
      'two_factor_enabled': 'smartphone',
      'two_factor_disabled': 'smartphone',
      'session_revoked': 'lock',
      'notification_settings_updated': 'bell'
    };
    return icons[action] || 'file-text';
  }

  formatActivityDetails(details: any): string {
    if (!details) return '';

    const entries = Object.entries(details);
    if (entries.length === 0) return '';

    return entries.map(([key, value]) => {
      const formattedKey = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/^\w/, c => c.toUpperCase());

      return `${formattedKey}: ${value}`;
    }).join(' • ');
  }

  // ===================================
  // BILLING & SUBSCRIPTION METHODS
  // ===================================

  setBillingCycle(cycle: 'monthly' | 'yearly'): void {
    this.billingCycle.set(cycle);
  }

  getPlanPrice(plan: SubscriptionPlan): number {
    if (this.billingCycle() === 'yearly') {
      return Math.round(plan.price * 10);
    }
    return plan.price;
  }

  selectPlan(plan: SubscriptionPlan): void {
    console.log('Plan selected:', plan);
    this.selectedPlan.set(plan);
    this.showPaymentModal.set(true);
    console.log('Payment modal should be visible:', this.showPaymentModal());
  }

  openPaymentModal(): void {
    this.showPaymentModal.set(true);
    this.paymentType.set('card');
    this.cardHolderName.set('');
    this.cardNumber.set('');
    this.expiryMonth.set('');
    this.expiryYear.set('');
    this.cvv.set('');
    this.accountHolderName.set('');
    this.accountNumber.set('');
    this.routingNumber.set('');
    this.bankName.set('');
    this.billingAddress.set('');
    this.billingCity.set('');
    this.billingState.set('');
    this.billingZip.set('');
    this.billingCountry.set('South Africa');
    this.savePaymentMethod.set(true);
  }

  closePaymentModal(): void {
    this.showPaymentModal.set(false);
    this.selectedPlan.set(null);
  }

  onPaymentTypeChange(): void {
    // Handled naturally by @if blocks in template — validation only applies to visible fields
  }

  formatCardNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 16) {
      value = value.substring(0, 16);
    }
    input.value = value;
    this.cardNumber.set(value);
  }

  onPaymentSubmit(): void {
    console.log('Payment submit triggered');
    console.log('Selected plan:', this.selectedPlan());

    if (this.selectedPlan()) {
      this.isProcessingPayment.set(true);

      let userId = localStorage.getItem('user_id');
      const userEmail = localStorage.getItem('user_email') || this.business()?.email;

      if (!userId && this.business()?.owner_id) {
        userId = this.business()!.owner_id;
        console.log('Using owner_id from business:', userId);
      }

      console.log('User ID:', userId);
      console.log('User Email:', userEmail);
      console.log('Business Email:', this.business()?.email);
      console.log('Business Owner ID:', this.business()?.owner_id);

      if (!userId || !userEmail) {
        console.error('Missing user information');
        this.errorMessage.set('User information not found. Please log in again.');
        this.isProcessingPayment.set(false);
        return;
      }

      const payload = {
        userId,
        planId: this.selectedPlan()!.id,
        billingCycle: this.billingCycle(),
        email: userEmail
      };

      console.log('Sending payment request:', payload);
      console.log('API URL:', `${environment.apiUrl}/subscriptions/subscribe`);

      this.http.post<any>(`${environment.apiUrl}/subscriptions/subscribe`, payload).subscribe({
        next: (response) => {
          console.log('Payment response:', response);
          this.isProcessingPayment.set(false);

          if (response.success && response.authorization_url) {
            console.log('Redirecting to Paystack:', response.authorization_url);
            window.location.href = response.authorization_url;
          } else if (response.success && response.subscription) {
            console.log('Free plan activated');
            this.closePaymentModal();
            const newSubscription: BusinessSubscription = {
              id: response.subscription.id || 'sub_' + Date.now(),
              plan: this.selectedPlan()!.id as any,
              status: 'active',
              startDate: new Date().toISOString(),
              price: 0,
              billingCycle: this.billingCycle()
            };
            this.subscription.set(newSubscription);
            this.successMessage.set(`Successfully activated ${this.selectedPlan()?.name} plan!`);
            setTimeout(() => this.successMessage.set(null), 5000);
          }
        },
        error: (error) => {
          console.error('Payment error:', error);
          console.error('Error details:', error.error);
          this.isProcessingPayment.set(false);
          this.errorMessage.set(error.error?.error || 'Failed to initialize payment. Please try again.');
          setTimeout(() => this.errorMessage.set(null), 5000);
        }
      });
    } else {
      console.warn('⚠️ No plan selected');
    }
  }

  isCurrentPlan(planId: string): boolean {
    const sub = this.subscription();
    return sub?.plan === planId && sub?.status === 'active';
  }

  getSubscriptionStatusClass(): string {
    const status = this.subscription()?.status;
    switch (status) {
      case 'active': return 'status-active';
      case 'trial': return 'status-trial';
      case 'expired': return 'status-expired';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-inactive';
    }
  }

  getTrialDaysRemaining(): number | null {
    const sub = this.subscription();
    if (sub?.status === 'trial' && sub?.trialDaysLeft !== undefined) {
      return sub.trialDaysLeft;
    }
    return null;
  }

  // ===================================
  // SECURITY METHODS
  // ===================================

  openChangePasswordModal(): void {
    this.showChangePasswordModal.set(true);
    this.currentPassword.set('');
    this.newPwd.set('');
    this.confirmPwd.set('');
  }

  closeChangePasswordModal(): void {
    this.showChangePasswordModal.set(false);
    this.currentPassword.set('');
    this.newPwd.set('');
    this.confirmPwd.set('');
  }

  onChangePasswordSubmit(): void {
    if (this.newPwd() !== this.confirmPwd()) {
      this.errorMessage.set('New passwords do not match');
      setTimeout(() => this.errorMessage.set(null), 3000);
      return;
    }

    if (!this.currentPassword() || !this.newPwd()) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.businessOwnerService.changePassword(this.currentPassword(), this.newPwd()).subscribe({
      next: (response) => {
        if (response) {
          this.closeChangePasswordModal();
          this.successMessage.set('Password changed successfully!');
          setTimeout(() => this.successMessage.set(null), 3000);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error changing password:', error);
        this.errorMessage.set(error.error?.error || 'Failed to change password. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  open2FAModal(): void {
    this.show2FAModal.set(true);
    this.load2FAStatus();
  }

  close2FAModal(): void {
    this.show2FAModal.set(false);
    this.backupCodes.set([]);
  }

  load2FAStatus(): void {
    this.businessOwnerService.get2FAStatus().subscribe({
      next: (status) => {
        this.twoFactorEnabled.set(status.enabled);
        this.twoFactorMethod.set(status.method);
      },
      error: (error) => {
        console.error('Error loading 2FA status:', error);
      }
    });
  }

  onEnable2FA(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.businessOwnerService.enable2FA(this.twoFAMethod()).subscribe({
      next: (response) => {
        if (response) {
          this.twoFactorEnabled.set(true);
          this.twoFactorMethod.set(response.method as 'email' | 'mobile');
          this.backupCodes.set(response.backupCodes);
          this.successMessage.set('2FA enabled successfully! Please save your backup codes.');
          setTimeout(() => this.successMessage.set(null), 5000);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error enabling 2FA:', error);
        this.errorMessage.set(error.error?.error || 'Failed to enable 2FA. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  onDisable2FA(): void {
    if (confirm('Are you sure you want to disable two-factor authentication?')) {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      this.businessOwnerService.disable2FA().subscribe({
        next: (response) => {
          if (response) {
            this.twoFactorEnabled.set(false);
            this.twoFactorMethod.set(null);
            this.backupCodes.set([]);
            this.successMessage.set('2FA disabled successfully.');
            setTimeout(() => this.successMessage.set(null), 3000);
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error disabling 2FA:', error);
          this.errorMessage.set(error.error?.error || 'Failed to disable 2FA. Please try again.');
          this.isLoading.set(false);
        }
      });
    }
  }

  openSessionsModal(): void {
    this.showSessionsModal.set(true);
    this.loadSessions();
  }

  closeSessionsModal(): void {
    this.showSessionsModal.set(false);
  }

  loadSessions(): void {
    this.businessOwnerService.getSessions().subscribe({
      next: (response) => {
        this.sessions.set(response.sessions);
      },
      error: (error) => {
        console.error('Error loading sessions:', error);
      }
    });
  }

  revokeSession(sessionId: string): void {
    if (confirm('Are you sure you want to revoke this session?')) {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      this.businessOwnerService.revokeSession(sessionId).subscribe({
        next: (response) => {
          if (response) {
            this.loadSessions();
            this.successMessage.set('Session revoked successfully.');
            setTimeout(() => this.successMessage.set(null), 3000);
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error revoking session:', error);
          this.errorMessage.set(error.error?.error || 'Failed to revoke session. Please try again.');
          this.isLoading.set(false);
        }
      });
    }
  }
}
