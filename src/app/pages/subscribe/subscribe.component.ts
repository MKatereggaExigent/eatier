import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

interface SubscriptionPlan {
  id: string;
  plan_code: string;
  user_type: string;
  name: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  features: any;
  max_menu_items: number;
  max_images: number;
  max_locations: number;
  advertising_credits: number;
  is_popular: boolean;
  trial_days: number;
}

@Component({
  selector: 'app-subscribe',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subscribe.component.html',
  styleUrls: ['./subscribe.component.scss']
})
export class SubscribeComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  // State
  plans = signal<SubscriptionPlan[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  billingCycle = signal<'monthly' | 'yearly'>('monthly');
  selectedUserType = signal<string>('business_owner');
  processingPlanId = signal<string | null>(null);

  // User types for tabs
  readonly userTypes = [
    { id: 'business_owner', name: 'Business Owners', icon: '🏪', description: 'Restaurants & Food Businesses' },
    { id: 'specialist', name: 'Specialists', icon: '👨‍🍳', description: 'Chefs, Caterers & Food Experts' },
    { id: 'food_enthusiast', name: 'Food Enthusiasts', icon: '🍽️', description: 'Passionate Foodies' },
    { id: 'normal_user', name: 'Regular Users', icon: '👤', description: 'Casual Diners' }
  ];

  ngOnInit(): void {
    this.loadPlans();
  }

  loadPlans(): void {
    this.loading.set(true);
    this.http.get<SubscriptionPlan[]>(`${environment.apiUrl}/subscriptions/plans`)
      .subscribe({
        next: (plans) => {
          this.plans.set(plans);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load subscription plans');
          this.loading.set(false);
          console.error('Error loading plans:', err);
        }
      });
  }

  get filteredPlans(): SubscriptionPlan[] {
    return this.plans().filter(p => p.user_type === this.selectedUserType());
  }

  selectUserType(type: string): void {
    this.selectedUserType.set(type);
  }

  toggleBillingCycle(): void {
    this.billingCycle.set(this.billingCycle() === 'monthly' ? 'yearly' : 'monthly');
  }

  getPrice(plan: SubscriptionPlan): number {
    return this.billingCycle() === 'yearly' ? plan.yearly_price : plan.monthly_price;
  }

  getMonthlyEquivalent(plan: SubscriptionPlan): number {
    if (this.billingCycle() === 'yearly') {
      return Math.round(plan.yearly_price / 12);
    }
    return plan.monthly_price;
  }

  getSavingsPercent(plan: SubscriptionPlan): number {
    if (plan.monthly_price === 0) return 0;
    const yearlyTotal = plan.yearly_price;
    const monthlyTotal = plan.monthly_price * 12;
    return Math.round(((monthlyTotal - yearlyTotal) / monthlyTotal) * 100);
  }

  getFeaturesList(plan: SubscriptionPlan): string[] {
    const features = plan.features || {};
    const list: string[] = [];

    if (features.menuManagement) list.push(`Up to ${plan.max_menu_items || 'unlimited'} menu items`);
    if (features.onlineBookings) list.push('Online table bookings');
    if (features.reviewManagement) list.push('Review management');
    if (features.analytics) list.push('Analytics dashboard');
    if (features.advancedAnalytics) list.push('Advanced analytics & insights');
    if (features.marketingTools) list.push('Marketing tools');
    if (features.emailMarketing) list.push('Email marketing campaigns');
    if (features.smsNotifications) list.push('SMS notifications');
    if (features.prioritySupport) list.push('Priority support');
    if (features.dedicatedManager) list.push('Dedicated account manager');
    if (features.customBranding) list.push('Custom branding');
    if (features.apiAccess) list.push('API access');
    if (features.multiLocation) list.push(`Multi-location support (${plan.max_locations || 1})`);
    if (plan.advertising_credits > 0) list.push(`R${plan.advertising_credits} ad credits/month`);
    if (features.portfolioShowcase) list.push('Portfolio showcase');
    if (features.clientBookings) list.push('Client booking system');
    if (features.exclusiveContent) list.push('Exclusive content access');
    if (features.earlyAccess) list.push('Early access to features');
    if (features.adFreeExperience) list.push('Ad-free experience');

    return list.length > 0 ? list : ['Basic features included'];
  }

  subscribeToPlan(plan: SubscriptionPlan): void {
    const userId = localStorage.getItem('user_id');
    const userEmail = localStorage.getItem('user_email');

    if (!userId || !userEmail) {
      // Redirect to login with return URL
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: '/pricing' }
      });
      return;
    }

    this.processingPlanId.set(plan.id);

    this.http.post<any>(`${environment.apiUrl}/subscriptions/subscribe`, {
      userId,
      planId: plan.id,
      billingCycle: this.billingCycle(),
      email: userEmail
    }).subscribe({
      next: (response) => {
        this.processingPlanId.set(null);
        if (response.success && response.authorization_url) {
          // Redirect to Paystack
          window.location.href = response.authorization_url;
        } else if (response.success) {
          // Free plan activated
          this.router.navigate(['/dashboard'], {
            queryParams: { subscribed: 'true', plan: plan.name }
          });
        }
      },
      error: (err) => {
        this.processingPlanId.set(null);
        this.error.set(err.error?.error || 'Failed to process subscription');
        setTimeout(() => this.error.set(null), 5000);
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}
