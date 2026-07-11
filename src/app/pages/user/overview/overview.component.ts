import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Subject, catchError, finalize, of, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LucideAngularModule, AlertTriangle, PenLine, Heart, Calendar, Camera, Search, Star, User, Store, UtensilsCrossed, Wallet, Gift, Target, MessageSquare, RefreshCw, Newspaper, CreditCard, PartyPopper, Users, Zap, Sun, Clock } from 'lucide-angular';

import { AuthService } from '../../../core/services/auth.service';
import { UserService, UserStats, UserActivity, Favorite } from '../../../core/services/user.service';
import { environment } from '../../../../environments/environment';

interface LoadingState {
  stats: boolean;
  activity: boolean;
  favorites: boolean;
  recommendations: boolean;
  wallet: boolean;
  promotions: boolean;
}

interface ErrorState {
  stats: string | null;
  activity: string | null;
  favorites: string | null;
  recommendations: string | null;
  wallet: string | null;
  promotions: string | null;
}

interface WalletData {
  cashbackBalance: number;
  loyaltyPoints: number;
}

interface Promotion {
  id: string;
  code: string;
  title: string;
  discountType: string;
  discountValue: number;
  validUntil: Date;
}

@Component({
  selector: 'app-user-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class UserOverviewComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private http = inject(HttpClient);
  private destroy$ = new Subject<void>();

  currentUser = this.authService.currentUser;

  // Lucide Icons
  readonly AlertTriangle = AlertTriangle;
  readonly PenLine = PenLine;
  readonly Heart = Heart;
  readonly Calendar = Calendar;
  readonly Camera = Camera;
  readonly Search = Search;
  readonly Star = Star;
  readonly User = User;
  readonly Store = Store;
  readonly UtensilsCrossed = UtensilsCrossed;
  readonly Wallet = Wallet;
  readonly Gift = Gift;
  readonly Target = Target;
  readonly MessageSquare = MessageSquare;
  readonly RefreshCw = RefreshCw;
  readonly Newspaper = Newspaper;
  readonly CreditCard = CreditCard;
  readonly PartyPopper = PartyPopper;
  readonly Users = Users;
  readonly Zap = Zap;
  readonly Sun = Sun;
  readonly Clock = Clock;

  // Loading states
  loading = signal<LoadingState>({
    stats: true,
    activity: true,
    favorites: true,
    recommendations: true,
    wallet: true,
    promotions: true
  });

  // Error states
  errors = signal<ErrorState>({
    stats: null,
    activity: null,
    favorites: null,
    recommendations: null,
    wallet: null,
    promotions: null
  });

  // Data signals
  stats = signal<UserStats>({
    totalReviews: 0,
    totalBookings: 0,
    totalFavorites: 0,
    totalPhotos: 0
  });

  recentActivity = signal<UserActivity[]>([]);
  favoriteRestaurants = signal<Favorite[]>([]);
  recommendedRestaurants = signal<any[]>([]);
  wallet = signal<WalletData | null>(null);
  promotions = signal<Promotion[]>([]);

  // Computed properties
  isLoading = computed(() =>
    this.loading().stats ||
    this.loading().activity ||
    this.loading().favorites ||
    this.loading().recommendations
  );

  hasErrors = computed(() =>
    this.errors().stats ||
    this.errors().activity ||
    this.errors().favorites ||
    this.errors().recommendations
  );

  ngOnInit(): void {
    this.loadAllData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAllData(): void {
    const userId = this.currentUser()?.id;
    if (!userId) {
      console.error('No user ID found');
      return;
    }

    this.loadUserStats(userId);
    this.loadRecentActivity(userId);
    this.loadFavorites(userId);
    this.loadRecommendations(userId);
    this.loadWallet();
    this.loadPromotions();
  }

  private loadUserStats(userId: string): void {
    this.loading.update(state => ({ ...state, stats: true }));
    this.errors.update(state => ({ ...state, stats: null }));

    this.userService.getUserStats(userId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading user stats:', error);
          this.errors.update(state => ({
            ...state,
            stats: 'Failed to load statistics'
          }));
          return of({ totalReviews: 0, totalBookings: 0, totalFavorites: 0, totalPhotos: 0 });
        }),
        finalize(() => {
          this.loading.update(state => ({ ...state, stats: false }));
        })
      )
      .subscribe(stats => {
        this.stats.set(stats);
      });
  }

  private loadRecentActivity(userId: string): void {
    this.loading.update(state => ({ ...state, activity: true }));
    this.errors.update(state => ({ ...state, activity: null }));

    this.userService.getUserActivity(userId, { limit: 5 })
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading activity:', error);
          this.errors.update(state => ({
            ...state,
            activity: 'Failed to load recent activity'
          }));
          return of({ activities: [] });
        }),
        finalize(() => {
          this.loading.update(state => ({ ...state, activity: false }));
        })
      )
      .subscribe(response => {
        this.recentActivity.set(response.activities);
      });
  }

  private loadFavorites(userId: string): void {
    this.loading.update(state => ({ ...state, favorites: true }));
    this.errors.update(state => ({ ...state, favorites: null }));

    this.userService.getUserFavorites(userId, { page: 1, limit: 3 })
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading favorites:', error);
          this.errors.update(state => ({
            ...state,
            favorites: 'Failed to load favorites'
          }));
          return of({ favorites: [], total: 0, pagination: { page: 1, limit: 3, hasMore: false } });
        }),
        finalize(() => {
          this.loading.update(state => ({ ...state, favorites: false }));
        })
      )
      .subscribe(response => {
        this.favoriteRestaurants.set(response.favorites);
      });
  }

  private loadRecommendations(userId: string): void {
    this.loading.update(state => ({ ...state, recommendations: true }));
    this.errors.update(state => ({ ...state, recommendations: null }));

    this.userService.getRecommendedBusinesses(userId, { limit: 3 })
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading recommendations:', error);
          this.errors.update(state => ({
            ...state,
            recommendations: 'Failed to load recommendations'
          }));
          return of({ businesses: [] });
        }),
        finalize(() => {
          this.loading.update(state => ({ ...state, recommendations: false }));
        })
      )
      .subscribe(response => {
        this.recommendedRestaurants.set(response.businesses);
      });
  }

  private loadWallet(): void {
    this.loading.update(state => ({ ...state, wallet: true }));
    this.errors.update(state => ({ ...state, wallet: null }));

    this.http.get<any>(`${environment.apiUrl}/wallet`, {
      headers: this.getAuthHeaders()
    })
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading wallet:', error);
          this.errors.update(state => ({ ...state, wallet: 'Failed to load wallet' }));
          return of(null);
        }),
        finalize(() => {
          this.loading.update(state => ({ ...state, wallet: false }));
        })
      )
      .subscribe(response => {
        // Backend returns wallet data directly, not wrapped in { wallet: ... }
        if (response) {
          this.wallet.set({
            cashbackBalance: response.cashbackBalance || 0,
            loyaltyPoints: response.loyaltyPoints || 0
          });
        }
      });
  }

  private loadPromotions(): void {
    this.loading.update(state => ({ ...state, promotions: true }));
    this.errors.update(state => ({ ...state, promotions: null }));

    this.http.get<any>(`${environment.apiUrl}/member-promotions`, {
      headers: this.getAuthHeaders()
    })
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading promotions:', error);
          this.errors.update(state => ({ ...state, promotions: 'Failed to load promotions' }));
          return of({ promotions: [] });
        }),
        finalize(() => {
          this.loading.update(state => ({ ...state, promotions: false }));
        })
      )
      .subscribe(response => {
        this.promotions.set((response.promotions || []).slice(0, 3));
      });
  }

  getDiscountDisplay(promo: Promotion): string {
    if (promo.discountType === 'percentage') {
      return `${promo.discountValue}% OFF`;
    }
    return `$${promo.discountValue} OFF`;
  }

  copyPromoCode(code: string): void {
    navigator.clipboard.writeText(code);
  }

  // Helper methods
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getActivityIcon(type: string): any {
    const icons = {
      review: PenLine,
      favorite: Heart,
      photo: Camera,
      booking: Calendar
    };
    return icons[type as keyof typeof icons] || Star;
  }

  getStarArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i < Math.round(rating) ? 1 : 0);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  refreshData(): void {
    this.loadAllData();
  }
}
