import { Ad, AdServingService } from '../../../../core/services/ad-serving.service';
import { Component, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription, interval } from 'rxjs';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-right-sidebar-ad',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './right-sidebar-ad.component.html',
  styleUrls: ['./right-sidebar-ad.component.scss']
})
export class RightSidebarAdComponent implements OnInit, OnDestroy {
  @Input() placement: string = 'sidebar_right';
  @Input() autoRotate: boolean = true; // Enable auto-rotation for premium ads
  @Input() rotationInterval: number = 15000; // 15 seconds (slow rotation for premium)
  @Input() limit: number = 5; // Show 5 ads stacked

  private adService = inject(AdServingService);
  private router = inject(Router);

  ads = signal<Ad[]>([]);
  currentAdIndex = signal<number>(0);
  currentAd = signal<Ad | null>(null);
  isTransitioning = signal<boolean>(false);

  private adsSubscription?: Subscription;
  private rotationSubscription?: Subscription;

  ngOnInit(): void {
    this.loadAds();

    if (this.autoRotate) {
      this.startRotation();
    }
  }

  // No placeholder ads - show empty state when no real ads exist
  hasNoAds = signal<boolean>(false);

  ngOnDestroy(): void {
    this.adsSubscription?.unsubscribe();
    this.rotationSubscription?.unsubscribe();
  }

  private loadAds(): void {
    this.adsSubscription = this.adService.getAdsByPlacement(this.placement, this.limit)
      .subscribe(ads => {
        if (ads.length > 0) {
          this.ads.set(ads);
          this.currentAd.set(ads[0]);
          this.trackImpression(ads[0].id);
          this.hasNoAds.set(false);
        } else {
          this.ads.set([]);
          this.currentAd.set(null);
          this.hasNoAds.set(true);
        }
      });
  }

  private startRotation(): void {
    this.rotationSubscription = interval(this.rotationInterval).subscribe(() => {
      this.nextAd();
    });
  }

  nextAd(): void {
    const ads = this.ads();
    if (ads.length === 0) return;

    this.isTransitioning.set(true);

    setTimeout(() => {
      const nextIndex = (this.currentAdIndex() + 1) % ads.length;
      this.currentAdIndex.set(nextIndex);
      this.currentAd.set(ads[nextIndex]);
      this.trackImpression(ads[nextIndex].id);

      setTimeout(() => {
        this.isTransitioning.set(false);
      }, 50);
    }, 500);
  }

  onAdClick(ad: Ad): void {
    this.adService.trackClick(ad.id);
    this.handleCtaAction(ad);
  }

  private handleCtaAction(ad: Ad): void {
    switch (ad.cta_type) {
      case 'book_now':
        if (ad.business_id) {
          this.router.navigate(['/restaurants', ad.business_id], { queryParams: { action: 'book' } });
        }
        break;
      case 'view_menu':
        if (ad.business_id) {
          this.router.navigate(['/restaurants', ad.business_id], { queryParams: { tab: 'menu' } });
        }
        break;
      case 'call_now':
        if (ad.phone) {
          window.location.href = `tel:${ad.phone}`;
        } else if (ad.business_id) {
          this.router.navigate(['/restaurants', ad.business_id], { queryParams: { tab: 'contact' } });
        }
        break;
      case 'visit_website':
        if (ad.website) {
          window.open(ad.website, '_blank', 'noopener,noreferrer');
        } else if (ad.cta_url) {
          window.open(ad.cta_url, '_blank', 'noopener,noreferrer');
        } else if (ad.business_id) {
          this.router.navigate(['/restaurants', ad.business_id]);
        }
        break;
      case 'get_deal':
      case 'order_now':
        if (ad.cta_url) {
          window.open(ad.cta_url, '_blank', 'noopener,noreferrer');
        } else if (ad.business_id) {
          this.router.navigate(['/restaurants', ad.business_id], { queryParams: { action: 'order' } });
        }
        break;
      default:
        if (ad.cta_url) {
          window.open(ad.cta_url, '_blank', 'noopener,noreferrer');
        } else if (ad.business_id) {
          this.router.navigate(['/restaurants', ad.business_id]);
        }
        break;
    }
  }

  private trackImpression(adId: string): void {
    this.adService.trackImpression(adId);
  }
}

