import { Ad, AdServingService } from '../../../../core/services/ad-serving.service';
import { Component, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar-ad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-ad.component.html',
  styleUrls: ['./sidebar-ad.component.scss']
})
export class SidebarAdComponent implements OnInit, OnDestroy {
  @Input() placement: string = 'sidebar_ad';
  @Input() limit: number = 3;

  private adService = inject(AdServingService);
  private router = inject(Router);

  ads = signal<Ad[]>([]);

  private adsSubscription?: Subscription;

  ngOnInit(): void {
    this.loadAds();
  }

  ngOnDestroy(): void {
    this.adsSubscription?.unsubscribe();
  }

  private loadAds(): void {
    this.adsSubscription = this.adService.getAdsByPlacement(this.placement, this.limit)
      .subscribe(ads => {
        this.ads.set(ads);
        // Track impressions for all visible ads
        ads.forEach(ad => this.adService.trackImpression(ad.id));
      });
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
}

