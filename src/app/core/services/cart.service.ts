import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, forkJoin, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

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
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}`;

  // LocalStorage key for guest cart
  private readonly GUEST_CART_KEY = 'itiyum_guest_cart';

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

  constructor() {
    // Watch for auth state changes to merge cart on login
    effect(() => {
      const isAuthenticated = this.authService.isAuthenticated();
      if (isAuthenticated) {
        // User just logged in - merge guest cart if any
        this.mergeGuestCartOnLogin();
      } else {
        // User logged out - load guest cart
        this.loadGuestCart();
      }
    });
  }

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
    // If not authenticated, load from localStorage
    if (!this.authService.isAuthenticated()) {
      this.loadGuestCart();
      return of({ carts: this._carts() });
    }

    // Authenticated - load from backend
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
    if (!this.authService.isAuthenticated()) {
      const guestCart = this._carts().find(c => c.businessId === businessId) || null;
      return of({ cart: guestCart });
    }
    return this.http.get<{ cart: Cart | null }>(`${this.apiUrl}/cart/${businessId}`);
  }

  addToCart(request: AddToCartRequest): Observable<any> {
    // If not authenticated, add to guest cart (localStorage)
    if (!this.authService.isAuthenticated()) {
      return this.addToGuestCart(request);
    }

    // Authenticated - use backend API
    return this.http.post(`${this.apiUrl}/cart/items`, request).pipe(
      tap(() => this.loadCarts().subscribe())
    );
  }

  updateCartItem(itemId: string, data: { quantity?: number; specialInstructions?: string }): Observable<any> {
    if (!this.authService.isAuthenticated()) {
      return this.updateGuestCartItem(itemId, data);
    }
    return this.http.put(`${this.apiUrl}/cart/items/${itemId}`, data).pipe(
      tap(() => this.loadCarts().subscribe())
    );
  }

  removeCartItem(itemId: string): Observable<any> {
    if (!this.authService.isAuthenticated()) {
      return this.removeGuestCartItem(itemId);
    }
    return this.http.delete(`${this.apiUrl}/cart/items/${itemId}`).pipe(
      tap(() => this.loadCarts().subscribe())
    );
  }

  clearCart(cartId: string): Observable<any> {
    if (!this.authService.isAuthenticated()) {
      return this.clearGuestCart(cartId);
    }
    return this.http.delete(`${this.apiUrl}/cart/${cartId}`).pipe(
      tap(() => this.loadCarts().subscribe())
    );
  }

  updateOrderType(cartId: string, orderType: 'delivery' | 'pickup' | 'dine_in'): Observable<any> {
    if (!this.authService.isAuthenticated()) {
      // Update guest cart order type
      const carts = this._carts();
      const updatedCarts = carts.map(c =>
        c.id === cartId ? { ...c, orderType } : c
      );
      this._carts.set(updatedCarts);
      this.saveGuestCart();
      return of({ success: true });
    }
    return this.http.put(`${this.apiUrl}/cart/${cartId}/order-type`, { orderType });
  }

  applyPromoCode(cartId: string, promoCode: string): Observable<any> {
    // Promo codes require authentication (need backend validation)
    if (!this.authService.isAuthenticated()) {
      return of({ error: 'Please log in to apply promo codes' });
    }
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

  // ============================================================================
  // Guest Cart Operations (localStorage)
  // ============================================================================

  private loadGuestCart(): void {
    try {
      const stored = localStorage.getItem(this.GUEST_CART_KEY);
      if (stored) {
        const guestCarts = JSON.parse(stored) as Cart[];
        this._carts.set(guestCarts);
      } else {
        this._carts.set([]);
      }
    } catch (error) {
      console.error('Error loading guest cart:', error);
      this._carts.set([]);
    }
  }

  private saveGuestCart(): void {
    try {
      localStorage.setItem(this.GUEST_CART_KEY, JSON.stringify(this._carts()));
    } catch (error) {
      console.error('Error saving guest cart:', error);
    }
  }

  private clearGuestCartStorage(): void {
    try {
      localStorage.removeItem(this.GUEST_CART_KEY);
    } catch (error) {
      console.error('Error clearing guest cart:', error);
    }
  }

  private addToGuestCart(request: AddToCartRequest): Observable<any> {
    // We need to fetch menu item details to build the cart item
    return this.http.get<any>(`${this.apiUrl}/menus/item/${request.menuItemId}`).pipe(
      tap(response => {
        const menuItem = response.menuItem;
        const carts = [...this._carts()];

        // Find or create cart for this business
        let cart = carts.find(c => c.businessId === request.businessId);

        if (!cart) {
          // Create new guest cart for this business
          cart = {
            id: `guest-cart-${request.businessId}`,
            businessId: request.businessId,
            businessName: menuItem.businessName || 'Restaurant',
            businessLogo: menuItem.businessLogo,
            businessAddress: menuItem.businessAddress,
            orderType: 'delivery',
            subtotal: 0,
            taxAmount: 0,
            deliveryFee: 0,
            discountAmount: 0,
            totalAmount: 0,
            items: [],
            itemCount: 0
          };
          carts.push(cart);
        }

        // Check if item already exists
        const existingItemIndex = cart.items.findIndex(
          i => i.menuItemId === request.menuItemId &&
               JSON.stringify(i.customizations) === JSON.stringify(request.customizations || [])
        );

        if (existingItemIndex >= 0) {
          // Update quantity
          cart.items[existingItemIndex].quantity += (request.quantity || 1);
          cart.items[existingItemIndex].totalPrice =
            cart.items[existingItemIndex].unitPrice * cart.items[existingItemIndex].quantity;
        } else {
          // Add new item
          const newItem: CartItem = {
            id: `guest-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            menuItemId: request.menuItemId,
            itemName: menuItem.title || menuItem.name,
            itemDescription: menuItem.description,
            itemImageUrl: menuItem.backgroundImage || menuItem.image,
            quantity: request.quantity || 1,
            unitPrice: parseFloat(menuItem.price),
            totalPrice: parseFloat(menuItem.price) * (request.quantity || 1),
            customizations: request.customizations || [],
            specialInstructions: request.specialInstructions || ''
          };
          cart.items.push(newItem);
        }

        // Recalculate cart totals
        this.recalculateCartTotals(cart);

        // Update carts signal
        const cartIndex = carts.findIndex(c => c.businessId === request.businessId);
        carts[cartIndex] = cart;
        this._carts.set(carts);
        this.saveGuestCart();
      }),
      catchError(error => {
        console.error('Error adding to guest cart:', error);
        return of({ error: 'Failed to add item to cart' });
      })
    );
  }

  private updateGuestCartItem(itemId: string, data: { quantity?: number; specialInstructions?: string }): Observable<any> {
    const carts = [...this._carts()];

    for (const cart of carts) {
      const itemIndex = cart.items.findIndex(i => i.id === itemId);
      if (itemIndex >= 0) {
        if (data.quantity !== undefined) {
          cart.items[itemIndex].quantity = data.quantity;
          cart.items[itemIndex].totalPrice = cart.items[itemIndex].unitPrice * data.quantity;
        }
        if (data.specialInstructions !== undefined) {
          cart.items[itemIndex].specialInstructions = data.specialInstructions;
        }
        this.recalculateCartTotals(cart);
        break;
      }
    }

    this._carts.set(carts);
    this.saveGuestCart();
    return of({ success: true });
  }

  private removeGuestCartItem(itemId: string): Observable<any> {
    const carts = [...this._carts()];

    for (const cart of carts) {
      const itemIndex = cart.items.findIndex(i => i.id === itemId);
      if (itemIndex >= 0) {
        cart.items.splice(itemIndex, 1);
        this.recalculateCartTotals(cart);
        break;
      }
    }

    // Remove empty carts
    const nonEmptyCarts = carts.filter(c => c.items.length > 0);
    this._carts.set(nonEmptyCarts);
    this.saveGuestCart();
    return of({ success: true });
  }

  private clearGuestCart(cartId: string): Observable<any> {
    const carts = this._carts().filter(c => c.id !== cartId);
    this._carts.set(carts);
    this.saveGuestCart();
    return of({ success: true });
  }

  private recalculateCartTotals(cart: Cart): void {
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalAmount = cart.subtotal + cart.taxAmount + cart.deliveryFee - cart.discountAmount;
  }

  // ============================================================================
  // Guest Cart Merge on Login
  // ============================================================================

  private mergeGuestCartOnLogin(): void {
    try {
      const stored = localStorage.getItem(this.GUEST_CART_KEY);
      if (!stored) {
        // No guest cart to merge, just load user carts
        this.loadCarts().subscribe();
        return;
      }

      const guestCarts = JSON.parse(stored) as Cart[];
      if (guestCarts.length === 0) {
        this.loadCarts().subscribe();
        return;
      }

      // Merge each guest cart item to backend
      const mergeRequests: Observable<any>[] = [];

      for (const cart of guestCarts) {
        for (const item of cart.items) {
          mergeRequests.push(
            this.http.post(`${this.apiUrl}/cart/items`, {
              businessId: cart.businessId,
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              customizations: item.customizations || [],
              specialInstructions: item.specialInstructions || ''
            }).pipe(
              catchError(error => {
                console.error('Error merging cart item:', error);
                return of(null); // Continue with other items
              })
            )
          );
        }
      }

      if (mergeRequests.length > 0) {
        forkJoin(mergeRequests).subscribe({
          next: () => {
            console.log('Guest cart merged successfully');
            this.clearGuestCartStorage();
            this.loadCarts().subscribe();
          },
          error: (error) => {
            console.error('Error merging guest cart:', error);
            this.loadCarts().subscribe();
          }
        });
      } else {
        this.loadCarts().subscribe();
      }
    } catch (error) {
      console.error('Error parsing guest cart for merge:', error);
      this.clearGuestCartStorage();
      this.loadCarts().subscribe();
    }
  }

  // Check if user has guest cart items
  hasGuestCartItems(): boolean {
    try {
      const stored = localStorage.getItem(this.GUEST_CART_KEY);
      if (stored) {
        const carts = JSON.parse(stored) as Cart[];
        return carts.some(c => c.items.length > 0);
      }
    } catch {
      // Ignore
    }
    return false;
  }
}

