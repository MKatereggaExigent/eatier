import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { LucideAngularModule, BarChart3, Globe, Users, Store, Calendar, FileText, Megaphone, TrendingUp, ClipboardList, Settings, Camera, Wallet, User, Heart, Star, Package, PartyPopper, CreditCard, Target, ChefHat, LogOut, MessageCircle } from 'lucide-angular';

import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

interface NavigationItem {
  path: string;
  label: string;
  icon: any; // Changed to any to support Lucide icon objects
  isAbsolute?: boolean; // Flag to indicate if path is absolute (e.g., /about)
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, LucideAngularModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class UserDashboardComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Lucide Icons
  readonly BarChart3 = BarChart3;
  readonly Globe = Globe;
  readonly Users = Users;
  readonly Store = Store;
  readonly Calendar = Calendar;
  readonly FileText = FileText;
  readonly Megaphone = Megaphone;
  readonly TrendingUp = TrendingUp;
  readonly ClipboardList = ClipboardList;
  readonly Settings = Settings;
  readonly Camera = Camera;
  readonly Wallet = Wallet;
  readonly User = User;
  readonly Heart = Heart;
  readonly Star = Star;
  readonly Package = Package;
  readonly PartyPopper = PartyPopper;
  readonly CreditCard = CreditCard;
  readonly Target = Target;
  readonly ChefHat = ChefHat;
  readonly LogOut = LogOut;
  readonly MessageCircle = MessageCircle;

  // Mobile menu state
  mobileMenuOpen = signal(false);

  currentUser = this.authService.currentUser;
  userRole = this.authService.userRole;

  // Dynamic navigation based on user role
  navigationItems = computed<NavigationItem[]>(() => {
    const role = this.userRole();

    switch (role) {
      case 'itiyum_admin':
        return [
          { path: 'overview', label: 'Overview', icon: this.BarChart3 },
          { path: '/about', label: 'Site', icon: this.Globe, isAbsolute: true },
          { path: 'users', label: 'Users', icon: this.Users },
          { path: 'businesses', label: 'Businesses', icon: this.Store },
          { path: 'bookings', label: 'Bookings', icon: this.Calendar },
          { path: 'blog', label: 'Blog', icon: this.FileText },
          { path: 'ads', label: 'Manage My Ads', icon: this.Megaphone },
          { path: 'social', label: 'Social', icon: this.Users },
          { path: 'analytics', label: 'Analytics', icon: this.TrendingUp },
          { path: 'reports', label: 'Reports', icon: this.ClipboardList },
          { path: 'settings', label: 'Settings', icon: this.Settings }
        ];

      case 'specialist':
        return [
          { path: 'overview', label: 'Overview', icon: this.BarChart3 },
          { path: '/about', label: 'Site', icon: this.Globe, isAbsolute: true },
          { path: 'portfolio', label: 'Portfolio', icon: this.Camera },
          { path: 'availability', label: 'Availability', icon: this.Calendar },
          { path: 'bookings', label: 'Bookings', icon: this.ClipboardList },
          { path: 'wallet', label: 'Earnings', icon: this.Wallet },
          { path: 'ads', label: 'Manage My Ads', icon: this.Megaphone },
          { path: 'social', label: 'Social', icon: this.Users },
          { path: 'messages', label: 'Messages', icon: this.MessageCircle },
          { path: 'profile', label: 'Profile', icon: this.User }
        ];

      case 'food_enthusiast':
        return [
          { path: 'overview', label: 'Overview', icon: this.BarChart3 },
          { path: '/about', label: 'Site', icon: this.Globe, isAbsolute: true },
          { path: 'orders', label: 'Order History', icon: this.Package },
          { path: 'profile', label: 'Profile', icon: this.User },
          { path: 'favorites', label: 'Favorites', icon: this.Heart },
          { path: 'reviews', label: 'My Reviews', icon: this.Star },
          { path: 'ads', label: 'Manage My Ads', icon: this.Megaphone },
          { path: 'social', label: 'Social', icon: this.Users },
          { path: 'messages', label: 'Messages', icon: this.MessageCircle },
          { path: 'insights', label: 'Insights', icon: this.TrendingUp },
          { path: 'bookings', label: 'Bookings', icon: this.ClipboardList },
          { path: 'specialist-bookings', label: 'Chef Bookings', icon: this.ChefHat }
        ];

      case 'normal_user':
      default:
        return [
          { path: 'overview', label: 'Overview', icon: this.BarChart3 },
          { path: '/about', label: 'Site', icon: this.Globe, isAbsolute: true },
          { path: 'favorites', label: 'Favorites', icon: this.Heart },
          { path: 'orders', label: 'Order History', icon: this.Package },
          { path: 'bookings', label: 'Bookings', icon: this.Calendar },
          { path: 'specialist-bookings', label: 'Chef Bookings', icon: this.ChefHat },
          { path: 'reviews', label: 'My Reviews', icon: this.Star },
          { path: 'promotions', label: 'Deals', icon: this.PartyPopper },
          { path: 'wallet', label: 'Wallet', icon: this.CreditCard },
          { path: 'social', label: 'Social', icon: this.Users },
          { path: 'messages', label: 'Messages', icon: this.MessageCircle },
          { path: 'preferences', label: 'Preferences', icon: this.Target },
          { path: 'profile', label: 'Profile', icon: this.User }
        ];
    }
  });

  dashboardTitle = computed(() => {
    const role = this.userRole();

    switch (role) {
      case 'itiyum_admin':
        return 'Admin Dashboard';
      case 'specialist':
        return 'Specialist Dashboard';
      case 'food_enthusiast':
        return 'Food Enthusiast Hub';
      case 'normal_user':
      default:
        return 'My Itiyum';
    }
  });

  // Base path for navigation links (absolute path)
  basePath = computed(() => {
    const role = this.userRole();
    switch (role) {
      case 'itiyum_admin':
        return '/admin';
      case 'specialist':
        return '/dashboard/specialist';
      case 'food_enthusiast':
        return '/dashboard/food-enthusiast';
      case 'normal_user':
      default:
        return '/dashboard/user';
    }
  });

  getUserDisplayName(): string {
    const user = this.currentUser();
    if (!user) return 'User';

    // Try firstName + lastName first
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    if (fullName) return fullName;

    // Fallback to email (without domain) if no name
    if (user.email) {
      return user.email.split('@')[0];
    }

    return 'User';
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(open => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
