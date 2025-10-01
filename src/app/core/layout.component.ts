import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule]
})
export class LayoutComponent {
  // Inject services
  private router = inject(Router);
  private authService = inject(AuthService);

  // State management for UI interactions
  showProfileMenu = signal(false);
  showSearchModal = signal(false);
  showNotifications = signal(false);
  showMobileMenu = signal(false);

  // Authentication state (now using AuthService)
  private _isLoggedIn = signal(false);

  constructor() {
    // Check if user is logged in using AuthService
    this.checkAuthStatus();
  }

  // Public getter for template
  isLoggedIn() {
    return this._isLoggedIn();
  }

  // Check authentication status
  private checkAuthStatus(): void {
    // Use AuthService to check authentication status
    this._isLoggedIn.set(this.authService.isAuthenticated());
  }

  // Temporary method to simulate login (for testing)
  simulateLogin(): void {
    // Use AuthService for demo login
    this.authService.demoLogin().subscribe({
      next: (response) => {
        this._isLoggedIn.set(true);
        console.log('Demo login successful:', response.user.email);
      },
      error: (error) => {
        console.error('Demo login failed:', error);
      }
    });
  }

  // Toggle methods for interactive elements
  toggleProfileMenu(): void {
    this.showProfileMenu.set(!this.showProfileMenu());
    // Close other menus
    this.showSearchModal.set(false);
    this.showNotifications.set(false);
  }

  toggleSearch(): void {
    this.showSearchModal.set(!this.showSearchModal());
    // Close other menus
    this.showProfileMenu.set(false);
    this.showNotifications.set(false);
  }

  toggleNotifications(): void {
    this.showNotifications.set(!this.showNotifications());
    // Close other menus
    this.showProfileMenu.set(false);
    this.showSearchModal.set(false);
    this.showMobileMenu.set(false);
  }

  toggleMobileMenu(): void {
    this.showMobileMenu.set(!this.showMobileMenu());
    // Close other menus
    this.showProfileMenu.set(false);
    this.showSearchModal.set(false);
    this.showNotifications.set(false);
  }

  // Close all menus when clicking outside
  closeAllMenus(): void {
    this.showProfileMenu.set(false);
    this.showSearchModal.set(false);
    this.showNotifications.set(false);
    this.showMobileMenu.set(false);
  }

  // Logout functionality
  logout(): void {
    // Use AuthService for proper logout
    this.authService.logout();

    // Close profile menu
    this.showProfileMenu.set(false);

    // Redirect to home page
    this.router.navigate(['/']);

    // Optional: Show logout success message
    console.log('User logged out successfully');
  }

  // Debug method to check registered users
  checkRegisteredUsers(): void {
    const users = this.authService.getRegisteredUsers();
    console.log('Registered users:', users);
    console.log('Is michaelk@aims.ac.za registered?', this.authService.isUserRegistered('michaelk@aims.ac.za'));
  }
}
