import { AccountActivity, AccountFreezeOptions, NotificationSettings } from '../../../shared/models/business-profile.model';
import { Business, BusinessOwnerService, BusinessSubscription } from '../../../core/services/business-owner.service';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, finalize, of, takeUntil } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

import { CommonModule } from '@angular/common';

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
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './accounts-center.component.html',
  styleUrls: ['./accounts-center.component.scss']
})
export class AccountsCenterComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private businessOwnerService = inject(BusinessOwnerService);
  private http = inject(HttpClient);
  private destroy$ = new Subject<void>();

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

  // Subscription & Billing
  subscription = signal<BusinessSubscription | null>(null);
  selectedPlan = signal<SubscriptionPlan | null>(null);
  paymentMethods = signal<PaymentMethod[]>([]);
  billingCycle = signal<'monthly' | 'yearly'>('monthly');

  // Forms
  notificationForm: FormGroup;
  freezeForm: FormGroup;
  deleteForm: FormGroup;
  paymentForm: FormGroup;

  // Data
  accountActivity = signal<AccountActivity[]>([]);
  notificationSettings = signal<NotificationSettings | null>(null);

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

    // Payment form with card/bank details
    this.paymentForm = this.fb.group({
      paymentType: ['card', Validators.required],
      // Card fields
      cardHolderName: ['', Validators.required],
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
      expiryMonth: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]],
      expiryYear: ['', [Validators.required, Validators.pattern(/^\d{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
      // Bank fields (optional, used when paymentType is 'bank')
      accountHolderName: [''],
      accountNumber: [''],
      routingNumber: [''],
      bankName: [''],
      // Billing address
      billingAddress: [''],
      billingCity: [''],
      billingState: [''],
      billingZip: [''],
      billingCountry: ['South Africa'],
      // Save for future
      savePaymentMethod: [true]
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
          return of({ business: null, subscription: null });
        }),
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe(response => {
        if (response && response.business) {
          this.business.set(response.business);

          // Load subscription data
          if (response.subscription) {
            this.subscription.set(response.subscription);
          }

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
      emailFrequency: 'Email frequency',
      cardHolderName: 'Card holder name',
      cardNumber: 'Card number',
      expiryMonth: 'Expiry month',
      expiryYear: 'Expiry year',
      cvv: 'CVV',
      accountHolderName: 'Account holder name',
      accountNumber: 'Account number',
      routingNumber: 'Routing number'
    };
    return labels[fieldName] || fieldName;
  }

  // ===================================
  // BILLING & SUBSCRIPTION METHODS
  // ===================================

  setBillingCycle(cycle: 'monthly' | 'yearly'): void {
    this.billingCycle.set(cycle);
  }

  getPlanPrice(plan: SubscriptionPlan): number {
    if (this.billingCycle() === 'yearly') {
      return Math.round(plan.price * 10); // 2 months free on yearly
    }
    return plan.price;
  }

  selectPlan(plan: SubscriptionPlan): void {
    this.selectedPlan.set(plan);
    this.showPaymentModal.set(true);
  }

  openPaymentModal(): void {
    this.showPaymentModal.set(true);
    this.paymentForm.reset({
      paymentType: 'card',
      billingCountry: 'South Africa',
      savePaymentMethod: true
    });
  }

  closePaymentModal(): void {
    this.showPaymentModal.set(false);
    this.selectedPlan.set(null);
    this.paymentForm.reset();
  }

  onPaymentTypeChange(): void {
    const paymentType = this.paymentForm.get('paymentType')?.value;

    if (paymentType === 'card') {
      // Make card fields required
      this.paymentForm.get('cardHolderName')?.setValidators([Validators.required]);
      this.paymentForm.get('cardNumber')?.setValidators([Validators.required, Validators.pattern(/^\d{16}$/)]);
      this.paymentForm.get('expiryMonth')?.setValidators([Validators.required]);
      this.paymentForm.get('expiryYear')?.setValidators([Validators.required]);
      this.paymentForm.get('cvv')?.setValidators([Validators.required, Validators.pattern(/^\d{3,4}$/)]);
      // Clear bank validators
      this.paymentForm.get('accountHolderName')?.clearValidators();
      this.paymentForm.get('accountNumber')?.clearValidators();
      this.paymentForm.get('routingNumber')?.clearValidators();
    } else {
      // Make bank fields required
      this.paymentForm.get('accountHolderName')?.setValidators([Validators.required]);
      this.paymentForm.get('accountNumber')?.setValidators([Validators.required]);
      this.paymentForm.get('routingNumber')?.setValidators([Validators.required]);
      // Clear card validators
      this.paymentForm.get('cardHolderName')?.clearValidators();
      this.paymentForm.get('cardNumber')?.clearValidators();
      this.paymentForm.get('expiryMonth')?.clearValidators();
      this.paymentForm.get('expiryYear')?.clearValidators();
      this.paymentForm.get('cvv')?.clearValidators();
    }

    // Update validity
    Object.keys(this.paymentForm.controls).forEach(key => {
      this.paymentForm.get(key)?.updateValueAndValidity();
    });
  }

  formatCardNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 16) {
      value = value.substring(0, 16);
    }
    input.value = value;
    this.paymentForm.get('cardNumber')?.setValue(value);
  }

  onPaymentSubmit(): void {
    if (this.selectedPlan()) {
      this.isProcessingPayment.set(true);

      // Get user info from localStorage
      const userId = localStorage.getItem('user_id');
      const userEmail = localStorage.getItem('user_email') || this.business()?.email;

      if (!userId || !userEmail) {
        this.errorMessage.set('User information not found. Please log in again.');
        this.isProcessingPayment.set(false);
        return;
      }

      // Initialize Paystack payment
      this.http.post<any>(`${environment.apiUrl}/subscriptions/subscribe`, {
        userId,
        planId: this.selectedPlan()!.id,
        billingCycle: this.billingCycle(),
        email: userEmail
      }).subscribe({
        next: (response) => {
          this.isProcessingPayment.set(false);

          if (response.success && response.authorization_url) {
            // Redirect to Paystack payment page
            window.location.href = response.authorization_url;
          } else if (response.success && response.subscription) {
            // Free plan activated immediately
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
          this.isProcessingPayment.set(false);
          this.errorMessage.set(error.error?.error || 'Failed to initialize payment. Please try again.');
          setTimeout(() => this.errorMessage.set(null), 5000);
        }
      });
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
}
