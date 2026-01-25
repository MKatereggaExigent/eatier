import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface PaymentVerification {
  success: boolean;
  status: string;
  amount: number;
  currency: string;
  reference: string;
  customer: {
    email: string;
  };
  paid_at: string;
  channel: string;
  metadata: any;
}

@Component({
  selector: 'app-payment-callback',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-callback.component.html',
  styleUrls: ['./payment-callback.component.scss']
})
export class PaymentCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  // State signals
  loading = signal(true);
  paymentStatus = signal<'success' | 'failed' | 'pending' | 'error'>('pending');
  paymentDetails = signal<PaymentVerification | null>(null);
  errorMessage = signal('');

  ngOnInit(): void {
    // Get reference from query params
    const reference = this.route.snapshot.queryParamMap.get('reference') ||
                      this.route.snapshot.queryParamMap.get('trxref');

    if (reference) {
      this.verifyPayment(reference);
    } else {
      this.loading.set(false);
      this.paymentStatus.set('error');
      this.errorMessage.set('No payment reference found');
    }
  }

  verifyPayment(reference: string): void {
    this.http.get<PaymentVerification>(`${environment.apiUrl}/payments/verify/${reference}`)
      .subscribe({
        next: (response) => {
          this.paymentDetails.set(response);

          if (response.status === 'success') {
            this.paymentStatus.set('success');
            // Handle specific payment types
            this.handleSuccessfulPayment(response);
          } else if (response.status === 'failed') {
            this.loading.set(false);
            this.paymentStatus.set('failed');
          } else {
            this.loading.set(false);
            this.paymentStatus.set('pending');
          }
        },
        error: (error) => {
          this.loading.set(false);
          this.paymentStatus.set('error');
          this.errorMessage.set(error.error?.error || 'Failed to verify payment');
        }
      });
  }

  private handleSuccessfulPayment(payment: PaymentVerification): void {
    const metadata = payment.metadata;

    if (metadata?.type === 'subscription') {
      // Activate subscription
      this.http.post(`${environment.apiUrl}/subscriptions/activate`, { reference: payment.reference })
        .subscribe({
          next: () => {
            this.loading.set(false);
            console.log('Subscription activated successfully');
          },
          error: (err) => {
            this.loading.set(false);
            console.error('Failed to activate subscription:', err);
          }
        });
    } else if (metadata?.type === 'ad_campaign') {
      // Activate ad campaign
      this.http.post(`${environment.apiUrl}/business-ads/my-ads/${metadata.ad_campaign_id}/verify-payment`, {
        reference: payment.reference,
        userId: metadata.user_id
      }).subscribe({
        next: () => {
          this.loading.set(false);
          console.log('Ad campaign activated successfully');
        },
        error: (err) => {
          this.loading.set(false);
          console.error('Failed to activate ad campaign:', err);
        }
      });
    } else {
      this.loading.set(false);
    }
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  goToDashboard(): void {
    const userRole = localStorage.getItem('user_role') || 'normal_user';
    const dashboardRoutes: Record<string, string> = {
      'itiyum_admin': '/admin',
      'business_owner': '/business',
      'business': '/business',
      'specialist': '/dashboard/specialist',
      'food_enthusiast': '/dashboard/food-enthusiast',
      'normal_user': '/dashboard/user'
    };
    this.router.navigate([dashboardRoutes[userRole] || '/dashboard/user']);
  }

  retryPayment(): void {
    // Navigate back to the page where payment was initiated
    const metadata = this.paymentDetails()?.metadata;
    if (metadata?.returnUrl) {
      this.router.navigateByUrl(metadata.returnUrl);
    } else {
      this.goHome();
    }
  }

  formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency || 'ZAR'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('en-ZA', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }
}

