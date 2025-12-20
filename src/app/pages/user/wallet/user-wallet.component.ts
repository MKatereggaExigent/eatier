import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface WalletData {
  cashbackBalance: number;
  loyaltyPoints: number;
  totalEarned: number;
  totalRedeemed: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  referenceType: string;
  createdAt: Date;
}

@Component({
  selector: 'app-user-wallet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-wallet.component.html',
  styleUrls: ['./user-wallet.component.scss']
})
export class UserWalletComponent implements OnInit {
  private http = inject(HttpClient);

  loading = signal(true);
  wallet = signal<WalletData | null>(null);
  transactions = signal<Transaction[]>([]);
  redeeming = signal(false);

  ngOnInit(): void {
    this.loadWallet();
    this.loadTransactions();
  }

  loadWallet(): void {
    this.http.get<any>(`${environment.apiUrl}/wallet`).subscribe({
      next: (data) => {
        this.wallet.set(data.wallet);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadTransactions(): void {
    this.http.get<any>(`${environment.apiUrl}/wallet/transactions`).subscribe({
      next: (data) => {
        this.transactions.set(data.transactions || []);
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
      type: 'cashback',
      amount
    }).subscribe({
      next: () => {
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

  getTransactionIcon(type: string): string {
    switch (type) {
      case 'cashback_earned': return '💰';
      case 'cashback_redeemed': return '🎁';
      case 'loyalty_earned': return '⭐';
      case 'loyalty_redeemed': return '🏆';
      case 'referral_bonus': return '👥';
      case 'promotion_credit': return '🎉';
      default: return '📋';
    }
  }

  getTransactionClass(type: string): string {
    return type.includes('earned') || type.includes('bonus') || type.includes('credit') 
      ? 'transaction-credit' 
      : 'transaction-debit';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatAmount(amount: number, type: string): string {
    const isCredit = type.includes('earned') || type.includes('bonus') || type.includes('credit');
    return `${isCredit ? '+' : '-'}$${Math.abs(amount).toFixed(2)}`;
  }
}

