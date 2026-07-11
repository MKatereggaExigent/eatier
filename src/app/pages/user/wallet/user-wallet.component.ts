import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule, Wallet, DollarSign, TrendingUp, Copy, Check, Gift, Users, Award, RefreshCw, ArrowUpRight, Calendar, Star } from 'lucide-angular';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

interface WalletData {
  id: string;
  cashbackBalance: number;
  loyaltyPoints: number;
  pendingCashback: number;
  pendingPoints: number;
  totalCashbackEarned: number;
  totalCashbackUsed: number;
  totalPointsEarned: number;
  totalPointsUsed: number;
  totalEarned: number;
  totalRedeemed: number;
  referralCode: string;
  referralCount: number;
  referralEarnings: number;
  tier: string;
  tierProgress: number;
  lifetimeSpend: number;
  status: string;
  tierInfo: TierInfo | null;
  nextTier: NextTierInfo | null;
}

interface TierInfo {
  name: string;
  cashbackRate: number;
  pointsMultiplier: number;
  freeDelivery: boolean;
  prioritySupport: boolean;
  exclusiveDeals: boolean;
  badgeColor: string;
  badgeIcon: string;
}

interface NextTierInfo {
  name: string;
  minSpend: number;
  spendToReach: number;
}

interface Transaction {
  id: string;
  type: string;
  amountType: string;
  amount: number;
  description: string;
  referenceType: string;
  balanceAfter: number;
  createdAt: Date;
}

interface ReferralInfo {
  referralCode: string;
  referralCount: number;
  referralEarnings: number;
  referralLink: string;
  referrals: ReferralRecord[];
}

interface ReferralRecord {
  id: string;
  referredName: string;
  status: string;
  reward: number;
  credited: boolean;
  createdAt: Date;
}

@Component({
  selector: 'app-user-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './user-wallet.component.html',
  styleUrls: ['./user-wallet.component.scss']
})
export class UserWalletComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  readonly Wallet = Wallet;
  readonly DollarSign = DollarSign;
  readonly TrendingUp = TrendingUp;
  readonly Copy = Copy;
  readonly Check = Check;
  readonly Gift = Gift;
  readonly Users = Users;
  readonly Award = Award;
  readonly RefreshCw = RefreshCw;
  readonly ArrowUpRight = ArrowUpRight;
  readonly Calendar = Calendar;
  readonly Star = Star;

  loading = signal(true);
  wallet = signal<WalletData | null>(null);
  transactions = signal<Transaction[]>([]);
  referralInfo = signal<ReferralInfo | null>(null);

  // Role detection
  userRole = this.authService.userRole;
  isSpecialist = computed(() => this.userRole() === 'specialist');

  // UI state
  redeeming = signal(false);
  converting = signal(false);
  copyingCode = signal(false);
  activeTab = signal<'overview' | 'transactions' | 'referrals' | 'tiers'>('overview');
  transactionFilter = signal<'all' | 'credit' | 'debit'>('all');

  // Points conversion
  pointsToConvert = signal(100);

  // Computed values
  cashbackValue = computed(() => (this.pointsToConvert() / 100).toFixed(2));

  // Page title based on role
  pageTitle = computed(() => this.isSpecialist() ? 'My Earnings' : 'My Wallet');
  pageSubtitle = computed(() => this.isSpecialist()
    ? 'Track your service earnings, tips, and payouts'
    : 'Manage your cashback, loyalty points, and rewards');

  filteredTransactions = computed(() => {
    const filter = this.transactionFilter();
    const txs = this.transactions();
    if (filter === 'all') return txs;
    return txs.filter(tx => tx.type === filter);
  });

  ngOnInit(): void {
    this.loadWallet();
    this.loadTransactions();
    this.loadReferralInfo();
  }

  loadWallet(): void {
    this.loading.set(true);
    this.http.get<WalletData>(`${environment.apiUrl}/wallet`).subscribe({
      next: (data) => {
        this.wallet.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadTransactions(): void {
    this.http.get<{ transactions: Transaction[] }>(`${environment.apiUrl}/wallet/transactions?limit=50`).subscribe({
      next: (data) => {
        this.transactions.set(data.transactions || []);
      }
    });
  }

  loadReferralInfo(): void {
    this.http.get<ReferralInfo>(`${environment.apiUrl}/wallet/referral`).subscribe({
      next: (data) => {
        this.referralInfo.set(data);
      }
    });
  }

  redeemCashback(amount: number): void {
    if (!this.wallet() || this.wallet()!.cashbackBalance < amount) {
      alert('Insufficient cashback balance');
      return;
    }

    this.redeeming.set(true);
    this.http.post<any>(`${environment.apiUrl}/wallet/redeem`, {
      amountType: 'cashback',
      amount
    }).subscribe({
      next: (res) => {
        this.redeeming.set(false);
        this.loadWallet();
        this.loadTransactions();
        alert(`Successfully redeemed $${amount.toFixed(2)} cashback!`);
      },
      error: (err) => {
        this.redeeming.set(false);
        alert(err.error?.error || 'Failed to redeem');
      }
    });
  }

  convertPoints(): void {
    const points = this.pointsToConvert();
    const wallet = this.wallet();

    if (!wallet || wallet.loyaltyPoints < points) {
      alert('Insufficient points');
      return;
    }

    if (points < 100) {
      alert('Minimum 100 points required');
      return;
    }

    this.converting.set(true);
    this.http.post<any>(`${environment.apiUrl}/wallet/convert-points`, { points }).subscribe({
      next: (res) => {
        this.converting.set(false);
        this.loadWallet();
        this.loadTransactions();
        alert(`Converted ${points} points to $${res.cashbackReceived.toFixed(2)} cashback!`);
      },
      error: (err) => {
        this.converting.set(false);
        alert(err.error?.error || 'Failed to convert points');
      }
    });
  }

  copyReferralCode(): void {
    const code = this.referralInfo()?.referralCode || this.wallet()?.referralCode;
    if (code) {
      navigator.clipboard.writeText(code);
      this.copyingCode.set(true);
      setTimeout(() => this.copyingCode.set(false), 2000);
    }
  }

  copyReferralLink(): void {
    const link = this.referralInfo()?.referralLink;
    if (link) {
      navigator.clipboard.writeText(link);
      this.copyingCode.set(true);
      setTimeout(() => this.copyingCode.set(false), 2000);
    }
  }

  setTab(tab: 'overview' | 'transactions' | 'referrals' | 'tiers'): void {
    this.activeTab.set(tab);
  }

  setFilter(filter: 'all' | 'credit' | 'debit'): void {
    this.transactionFilter.set(filter);
  }

  getTransactionClass(type: string): string {
    return type === 'credit' ? 'transaction-credit' : 'transaction-debit';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatAmount(amount: number, type: string, amountType: string): string {
    const isCredit = type === 'credit';
    if (amountType === 'loyalty_points') {
      return `${isCredit ? '+' : '-'}${Math.abs(amount).toFixed(0)} pts`;
    }
    return `${isCredit ? '+' : '-'}$${Math.abs(amount).toFixed(2)}`;
  }
}

