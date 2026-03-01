import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CartService, Cart, CartItem } from '../../../core/services/cart.service';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cart-drawer.component.html',
  styleUrls: ['./cart-drawer.component.scss']
})
export class CartDrawerComponent implements OnInit {
  cartService = inject(CartService);
  private router = inject(Router);

  isOpen = this.cartService.cartDrawerOpen;
  carts = this.cartService.carts;
  loading = this.cartService.loading;
  totalItemCount = this.cartService.totalItemCount;
  totalCartValue = this.cartService.totalCartValue;

  ngOnInit(): void {
    this.cartService.loadCarts().subscribe();
  }

  close(): void {
    this.cartService.closeCartDrawer();
  }

  incrementItem(item: CartItem): void {
    this.cartService.incrementQuantity(item);
  }

  decrementItem(item: CartItem): void {
    this.cartService.decrementQuantity(item);
  }

  removeItem(item: CartItem): void {
    this.cartService.removeCartItem(item.id).subscribe();
  }

  clearCart(cart: Cart): void {
    if (confirm('Clear all items from this cart?')) {
      this.cartService.clearCart(cart.id).subscribe();
    }
  }

  proceedToCheckout(cart: Cart): void {
    this.close();
    this.router.navigate(['/checkout', cart.id]);
  }

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  }

  continueShopping(): void {
    this.close();
    this.router.navigate(['/restaurants']);
  }
}

