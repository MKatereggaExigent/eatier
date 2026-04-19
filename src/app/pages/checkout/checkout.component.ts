import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService, CheckoutSummary, DeliveryAddress, CheckoutRequest } from '../../core/services/cart.service';
import { CurrencyService } from '../../core/services/currency.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cartService = inject(CartService);
  private currencyService = inject(CurrencyService);

  // State
  loading = signal(true);
  submitting = signal(false);
  error = signal<string | null>(null);
  checkoutSummary = signal<CheckoutSummary | null>(null);

  // Form state
  selectedAddressId = signal<string | null>(null);
  useNewAddress = signal(false);
  newAddress = signal<Partial<DeliveryAddress>>({
    label: 'Home',
    addressLine1: '',
    city: 'Kampala',
    country: 'Uganda'
  });
  deliveryInstructions = signal('');
  paymentMethod = signal('cash');
  saveAddress = signal(false);

  // Order type
  orderType = signal<'delivery' | 'pickup'>('delivery');

  cartId = '';

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.cartId = params['cartId'];
      this.loadCheckoutSummary();
    });
  }

  loadCheckoutSummary(): void {
    this.loading.set(true);
    this.cartService.getCheckoutSummary(this.cartId).subscribe({
      next: (summary) => {
        this.checkoutSummary.set(summary);
        this.orderType.set(summary.cart.orderType as 'delivery' | 'pickup');
        this.deliveryInstructions.set(summary.deliveryInstructions || '');
        
        // Select default address if available
        const defaultAddr = summary.savedAddresses.find(a => a.isDefault);
        if (defaultAddr) {
          this.selectedAddressId.set(defaultAddr.id);
        } else if (summary.savedAddresses.length > 0) {
          this.selectedAddressId.set(summary.savedAddresses[0].id);
        } else {
          this.useNewAddress.set(true);
        }
        
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load checkout summary');
        this.loading.set(false);
        console.error('Checkout error:', err);
      }
    });
  }

  selectAddress(addressId: string): void {
    this.selectedAddressId.set(addressId);
    this.useNewAddress.set(false);
  }

  toggleNewAddress(): void {
    this.useNewAddress.set(true);
    this.selectedAddressId.set(null);
  }

  updateNewAddress(field: string, value: string): void {
    this.newAddress.update(addr => ({ ...addr, [field]: value }));
  }

  changeOrderType(type: 'delivery' | 'pickup'): void {
    this.orderType.set(type);
    this.cartService.updateOrderType(this.cartId, type).subscribe();
  }

  placeOrder(): void {
    const summary = this.checkoutSummary();
    if (!summary) return;

    // Validate for delivery orders
    if (this.orderType() === 'delivery') {
      if (!this.selectedAddressId() && !this.useNewAddress()) {
        this.error.set('Please select or enter a delivery address');
        return;
      }
      
      if (this.useNewAddress()) {
        const addr = this.newAddress();
        if (!addr.addressLine1 || !addr.city) {
          this.error.set('Please enter a complete address');
          return;
        }
      }
    }

    this.submitting.set(true);
    this.error.set(null);

    // Build checkout request
    const request: CheckoutRequest = {
      deliveryInstructions: this.deliveryInstructions(),
      paymentMethod: this.paymentMethod(),
      saveAddress: this.saveAddress()
    };

    if (this.orderType() === 'delivery') {
      if (this.useNewAddress()) {
        request.deliveryAddress = {
          addressLine1: this.newAddress().addressLine1 || '',
          addressLine2: this.newAddress().addressLine2,
          city: this.newAddress().city || 'Kampala',
          country: this.newAddress().country || 'Uganda',
          recipientName: this.newAddress().recipientName,
          phone: this.newAddress().phone
        };
        request.addressLabel = this.newAddress().label;
      } else {
        const selectedAddr = summary.savedAddresses.find(a => a.id === this.selectedAddressId());
        if (selectedAddr) {
          request.deliveryAddress = {
            addressLine1: selectedAddr.addressLine1,
            addressLine2: selectedAddr.addressLine2,
            city: selectedAddr.city,
            country: selectedAddr.country,
            recipientName: selectedAddr.recipientName,
            phone: selectedAddr.phone
          };
        }
      }
    }

    this.cartService.checkout(this.cartId, request).subscribe({
      next: (response) => {
        this.submitting.set(false);
        console.log('Checkout response:', response);

        // Handle response - check if order exists
        if (response && response.order && response.order.id) {
          // Navigate to order confirmation
          this.router.navigate(['/order-confirmation', response.order.id], {
            queryParams: { orderNumber: response.order.orderNumber }
          });
        } else if (response && response.error) {
          // Handle error response
          this.error.set(response.error);
        } else {
          // Unknown response format
          console.error('Unexpected response format:', response);
          this.error.set('Order placed but confirmation unavailable. Please check your orders.');
        }
      },
      error: (err) => {
        this.submitting.set(false);
        console.error('Checkout error:', err);
        this.error.set(err.error?.error || 'Failed to place order');
      }
    });
  }

  formatPrice(amount: number): string {
    return this.currencyService.formatAmount(amount);
  }

  goBack(): void {
    this.router.navigate(['/restaurants']);
  }
}
