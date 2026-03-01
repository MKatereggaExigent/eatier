import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { CartService } from '../../../core/services/cart.service';

interface OrderItem {
  id: string;
  menuItemId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Business {
  id: string;
  name: string;
  logo: string;
  address: string;
}

interface Order {
  id: string;
  orderNumber: string;
  businessId: string;
  businessName: string;
  businessLogo: string;
  business?: Business;
  status: string;
  orderType: string;
  subtotal: number;
  discount: number;
  discountAmount: number;
  deliveryFee: number;
  totalAmount: number;
  items: OrderItem[];
  createdAt: Date;
  rating: number | null;
  orderRating: number | null;
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
  private router = inject(Router);
  private cartService = inject(CartService);

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
        // Map the nested business object to flat properties for template
        const mappedOrders = (data.orders || []).map((order: any) => ({
          ...order,
          businessId: order.business?.id || order.businessId,
          businessName: order.business?.name || order.businessName || 'Restaurant',
          businessLogo: order.business?.logo || order.businessLogo,
          rating: order.orderRating || order.rating
        }));
        this.orders.set(mappedOrders);
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
    const order = this.orders().find(o => o.id === orderId);
    if (!order) return;

    this.reordering.set(orderId);

    // Add all items from the order to the cart
    const businessId = order.businessId || order.business?.id;
    if (!businessId) {
      this.reordering.set(null);
      alert('Cannot reorder: Business information missing');
      return;
    }

    // Add items to cart one by one
    let addedCount = 0;
    const totalItems = order.items.length;

    order.items.forEach(item => {
      this.cartService.addToCart({
        businessId: businessId,
        menuItemId: item.menuItemId || item.id,
        quantity: item.quantity
      }).subscribe({
        next: () => {
          addedCount++;
          if (addedCount === totalItems) {
            this.reordering.set(null);
            // Navigate to checkout
            this.router.navigate(['/checkout', businessId]);
          }
        },
        error: (err) => {
          addedCount++;
          console.error('Error adding item to cart:', err);
          if (addedCount === totalItems) {
            this.reordering.set(null);
            // Still try to navigate to checkout even if some items failed
            this.router.navigate(['/checkout', businessId]);
          }
        }
      });
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

