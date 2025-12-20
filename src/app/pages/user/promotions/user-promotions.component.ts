import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Promotion {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit: number;
  usedCount: number;
  targetType: string;
}

@Component({
  selector: 'app-user-promotions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-promotions.component.html',
  styleUrls: ['./user-promotions.component.scss']
})
export class UserPromotionsComponent implements OnInit {
  private http = inject(HttpClient);

  loading = signal(true);
  promotions = signal<Promotion[]>([]);
  copiedCode = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPromotions();
  }

  loadPromotions(): void {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/member-promotions`).subscribe({
      next: (data) => {
        this.promotions.set(data.promotions || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      this.copiedCode.set(code);
      setTimeout(() => this.copiedCode.set(null), 2000);
    });
  }

  getDiscountDisplay(promo: Promotion): string {
    if (promo.discountType === 'percentage') {
      return `${promo.discountValue}% OFF`;
    }
    return `$${promo.discountValue} OFF`;
  }

  getExpiryStatus(validUntil: Date): string {
    const now = new Date();
    const expiry = new Date(validUntil);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) return 'Expired';
    if (daysLeft === 1) return 'Expires today!';
    if (daysLeft <= 3) return `${daysLeft} days left`;
    if (daysLeft <= 7) return 'Expires this week';
    return `Valid until ${expiry.toLocaleDateString()}`;
  }

  getExpiryClass(validUntil: Date): string {
    const now = new Date();
    const expiry = new Date(validUntil);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) return 'expired';
    if (daysLeft <= 3) return 'urgent';
    return 'normal';
  }

  getTargetLabel(targetType: string): string {
    switch (targetType) {
      case 'all_members': return '👥 All Members';
      case 'new_members': return '🆕 New Members';
      case 'loyal_members': return '⭐ Loyal Members';
      case 'inactive_members': return '💤 Welcome Back';
      default: return '🎁 Exclusive';
    }
  }

  getRemainingUses(promo: Promotion): string {
    if (!promo.usageLimit) return 'Unlimited uses';
    const remaining = promo.usageLimit - promo.usedCount;
    return `${remaining} uses left`;
  }
}

