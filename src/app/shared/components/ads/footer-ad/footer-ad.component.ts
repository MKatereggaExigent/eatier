import { Ad, AdServingService } from '../../../../core/services/ad-serving.service';
import { Component, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Subscription, interval } from 'rxjs';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer-ad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer-ad.component.html',
  styleUrls: ['./footer-ad.component.scss']
})
export class FooterAdComponent implements OnInit, OnDestroy {
  @Input() placement: string = 'footer_banner';
  @Input() autoRotate: boolean = true;
  @Input() rotationInterval: number = 6000; // 6 seconds
  @Input() limit: number = 5;

  private adService = inject(AdServingService);

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

  private createPlaceholderAds(): Ad[] {
    return [
      {
        id: 'footer-placeholder-1',
        title: 'Your Ad Could Be Here',
        description: 'Premium footer placement - visible on every page',
        image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=200&fit=crop',
        cta_text: 'Advertise Now',
        cta_url: '/grow',
        ad_type: 'promoted',
        placement: this.placement,
        business_name: 'Itiyum Ads',
        impressions: 0,
        clicks: 0,
        advertiser_id: 'placeholder',
        advertiser_type: 'system',
        advertiser_name: 'Itiyum'
      }
    ];
  }

  ngOnDestroy(): void {
    this.adsSubscription?.unsubscribe();
    this.rotationSubscription?.unsubscribe();
  }

  private loadAds(): void {
    this.adsSubscription = this.adService.getAdsByPlacement(this.placement, this.limit)
      .subscribe(ads => {
        const adsToDisplay = ads.length > 0 ? ads : this.createPlaceholderAds();
        this.ads.set(adsToDisplay);
        if (adsToDisplay.length > 0) {
          this.currentAd.set(adsToDisplay[0]);
          if (ads.length > 0) {
            this.trackImpression(adsToDisplay[0].id);
          }
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
    }, 400);
  }

  onAdClick(ad: Ad): void {
    this.adService.trackClick(ad.id);
    if (ad.cta_url) {
      window.open(ad.cta_url, '_blank', 'noopener,noreferrer');
    }
  }

  private trackImpression(adId: string): void {
    this.adService.trackImpression(adId);
  }
}

