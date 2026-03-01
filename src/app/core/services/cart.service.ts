import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CartItem {
  id: string;
  menuItemId: string;
  itemName: string;
  itemDescription?: string;
  itemImageUrl?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customizations?: any[];
  specialInstructions?: string;
}

export interface Cart {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo?: string;
  businessAddress?: string;
  orderType: 'delivery' | 'pickup' | 'dine_in';
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  promotionCode?: string;
  items: CartItem[];
  itemCount: number;
}

export interface CheckoutSummary {
  cart: Cart & { businessPhone?: string };
  pricing: {
    subtotal: number;
    taxAmount: number;
    taxRate: number;
    deliveryFee: number;
    discountAmount: number;
    promotionCode?: string;
    totalAmount: number;
  };
  savedAddresses: DeliveryAddress[];
  scheduledTime?: string;
  deliveryInstructions?: string;
}

export interface DeliveryAddress {
  id: string;
  label: string;
  recipientName?: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  deliveryInstructions?: string;
  isDefault: boolean;
}

export interface AddToCartRequest {
  businessId: string;
  menuItemId: string;
  quantity?: number;
  customizations?: any[];
  specialInstructions?: string;
}

export interface CheckoutRequest {
  deliveryAddress?: {
    recipientName?: string;
    phone?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  deliveryInstructions?: string;
  scheduledTime?: string;
  paymentMethod?: string;
  saveAddress?: boolean;
  addressLabel?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}`;

  // State
  private _carts = signal<Cart[]>([]);
  private _loading = signal(false);
  private _cartDrawerOpen = signal(false);

  // Public signals
  carts = this._carts.asReadonly();
  loading = this._loading.asReadonly();
  cartDrawerOpen = this._cartDrawerOpen.asReadonly();

  // Computed values
  totalItemCount = computed(() => 
    this._carts().reduce((sum, cart) => sum + cart.itemCount, 0)
  );

  totalCartValue = computed(() =>
    this._carts().reduce((sum, cart) => sum + cart.totalAmount, 0)
  );

  hasItems = computed(() => this.totalItemCount() > 0);

  // Get cart for specific business
  getCartForBusiness = (businessId: string) => computed(() =>
    this._carts().find(cart => cart.businessId === businessId)
  );

  // ============================================================================
  // Cart Drawer
  // ============================================================================
  openCartDrawer(): void {
    this._cartDrawerOpen.set(true);
  }

  closeCartDrawer(): void {
    this._cartDrawerOpen.set(false);
  }

  toggleCartDrawer(): void {
    this._cartDrawerOpen.update(open => !open);
  }

  // ============================================================================
  // Cart Operations
  // ============================================================================
  loadCarts(): Observable<{ carts: Cart[] }> {
    this._loading.set(true);
    return this.http.get<{ carts: Cart[] }>(`${this.apiUrl}/cart`).pipe(
      tap(response => {
        this._carts.set(response.carts);
        this._loading.set(false);
      }),
      catchError(error => {
        console.error('Error loading carts:', error);
        this._loading.set(false);
        return of({ carts: [] });
      })
    );
  }

  getCart(businessId: string): Observable<{ cart: Cart | null }> {
    return this.http.get<{ cart: Cart | null }>(`${this.apiUrl}/cart/${businessId}`);
  }

  addToCart(request: AddToCartRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/cart/items`, request).pipe(
      tap(() => this.loadCarts().subscribe())
    );
  }

  updateCartItem(itemId: string, data: { quantity?: number; specialInstructions?: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/cart/items/${itemId}`, data).pipe(
      tap(() => this.loadCarts().subscribe())
    );
  }

  removeCartItem(itemId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/cart/items/${itemId}`).pipe(
      tap(() => this.loadCarts().subscribe())
    );
  }

  clearCart(cartId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/cart/${cartId}`).pipe(
      tap(() => this.loadCarts().subscribe())
    );
  }

  updateOrderType(cartId: string, orderType: 'delivery' | 'pickup' | 'dine_in'): Observable<any> {
    return this.http.put(`${this.apiUrl}/cart/${cartId}/order-type`, { orderType });
  }

  applyPromoCode(cartId: string, promoCode: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cart/${cartId}/promo`, { promoCode }).pipe(
      tap(() => this.loadCarts().subscribe())
    );
  }

  // ============================================================================
  // Checkout Operations
  // ============================================================================
  getCheckoutSummary(cartId: string): Observable<CheckoutSummary> {
    return this.http.get<CheckoutSummary>(`${this.apiUrl}/checkout/${cartId}/summary`);
  }

  checkout(cartId: string, request: CheckoutRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/checkout/${cartId}`, request).pipe(
      tap(() => {
        this.loadCarts().subscribe();
        this.closeCartDrawer();
      })
    );
  }

  // ============================================================================
  // Address Operations
  // ============================================================================
  getSavedAddresses(): Observable<{ addresses: DeliveryAddress[] }> {
    return this.http.get<{ addresses: DeliveryAddress[] }>(`${this.apiUrl}/checkout/addresses`);
  }

  saveAddress(address: Omit<DeliveryAddress, 'id'>): Observable<any> {
    return this.http.post(`${this.apiUrl}/checkout/addresses`, address);
  }

  deleteAddress(addressId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/checkout/addresses/${addressId}`);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================
  incrementQuantity(item: CartItem): void {
    this.updateCartItem(item.id, { quantity: item.quantity + 1 }).subscribe();
  }

  decrementQuantity(item: CartItem): void {
    if (item.quantity > 1) {
      this.updateCartItem(item.id, { quantity: item.quantity - 1 }).subscribe();
    } else {
      this.removeCartItem(item.id).subscribe();
    }
  }
}

