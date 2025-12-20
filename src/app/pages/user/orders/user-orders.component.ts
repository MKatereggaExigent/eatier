import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  businessName: string;
  businessLogo: string;
  status: string;
  orderType: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  totalAmount: number;
  items: OrderItem[];
  createdAt: Date;
  rating: number | null;
}

@Component({
  selector: 'app-user-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-orders.component.html',
  styleUrls: ['./user-orders.component.scss']
})
export class UserOrdersComponent implements OnInit {
  private http = inject(HttpClient);

  loading = signal(true);
  orders = signal<Order[]>([]);
  selectedOrder = signal<Order | null>(null);
  reordering = signal<string | null>(null);

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/orders`).subscribe({
      next: (data) => {
        this.orders.set(data.orders || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  viewOrderDetails(order: Order): void {
    this.selectedOrder.set(order);
  }

  closeOrderDetails(): void {
    this.selectedOrder.set(null);
  }

  reorder(orderId: string): void {
    this.reordering.set(orderId);
    this.http.post<any>(`${environment.apiUrl}/orders/${orderId}/reorder`, {}).subscribe({
      next: (data) => {
        this.reordering.set(null);
        // Reload orders to show the new order
        this.loadOrders();
        alert('Order placed successfully! Order #' + data.order.orderNumber);
      },
      error: (err) => {
        this.reordering.set(null);
        alert(err.error?.error || 'Failed to reorder');
      }
    });
  }

  rateOrder(orderId: string, rating: number): void {
    this.http.patch<any>(`${environment.apiUrl}/orders/${orderId}/rate`, { rating }).subscribe({
      next: () => {
        // Update the order in the list
        this.orders.update(orders => 
          orders.map(o => o.id === orderId ? { ...o, rating } : o)
        );
        if (this.selectedOrder()?.id === orderId) {
          this.selectedOrder.update(o => o ? { ...o, rating } : null);
        }
      },
      error: (err) => {
        alert(err.error?.error || 'Failed to rate order');
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-confirmed';
      case 'preparing': return 'status-preparing';
      case 'ready': return 'status-ready';
      case 'delivered': return 'status-delivered';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return '✅';
      case 'pending': return '⏳';
      case 'confirmed': return '✔️';
      case 'preparing': return '👨‍🍳';
      case 'ready': return '📦';
      case 'delivered': return '🚗';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

