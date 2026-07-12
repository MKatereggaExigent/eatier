import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface OrderDetails {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  totalAmount: number;
  businessName: string;
  createdAt: string;
  deliveryAddress?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './order-confirmation.component.html',
  styleUrls: ['./order-confirmation.component.scss']
})
export class OrderConfirmationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  loading = signal(true);
  error = signal<string | null>(null);
  order = signal<OrderDetails | null>(null);
  orderNumber = signal('');

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const orderId = params['orderId'];
      this.route.queryParams.subscribe(query => {
        this.orderNumber.set(query['orderNumber'] || '');
      });
      this.loadOrderDetails(orderId);
    });
  }

  loadOrderDetails(orderId: string): void {
    this.loading.set(true);
    this.http.get<{ order: OrderDetails }>(`${environment.apiUrl}/orders/${orderId}`).subscribe({
      next: (response) => {
        this.order.set(response.order);
        this.loading.set(false);
      },
      error: () => {
        // Even if we can't load details, show basic confirmation
        this.loading.set(false);
      }
    });
  }

  formatPrice(amount: number): string {
    return `R ${amount.toLocaleString()}`;
  }

  goToOrders(): void {
    this.router.navigate(['/dashboard/user/orders']);
  }

  continueShopping(): void {
    this.router.navigate(['/restaurants']);
  }
}

