import { Ad, AdServingService } from '../../../../core/services/ad-serving.service';
import { Component, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Subscription, interval } from 'rxjs';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header-ad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header-ad.component.html',
  styleUrls: ['./header-ad.component.scss']
})
export class HeaderAdComponent implements OnInit, OnDestroy {
  @Input() placement: string = 'homepage_banner';
  @Input() autoRotate: boolean = true;
  @Input() rotationInterval: number = 5000; // 5 seconds for flashy effect
  @Input() limit: number = 5;
  @Input() animationType: 'carousel' | 'fade' = 'fade'; // fade or carousel

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
        id: 'placeholder-1',
        title: 'Advertise Your Business Here',
        description: 'Reach thousands of food lovers. Premium header placement available.',
        image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=300&fit=crop',
        cta_text: 'Get Started',
        cta_url: '/grow',
        ad_type: 'promoted',
        placement: this.placement,
        business_name: 'Itiyum Ads',
        impressions: 0,
        clicks: 0,
        advertiser_id: 'placeholder',
        advertiser_type: 'system',
        advertiser_name: 'Itiyum'
      },
      {
        id: 'placeholder-2',
        title: 'Grow Your Restaurant Business',
        description: 'Connect with customers actively looking for great food experiences.',
        image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=300&fit=crop',
        cta_text: 'Learn More',
        cta_url: '/grow',
        ad_type: 'promoted',
        placement: this.placement,
        business_name: 'Itiyum Platform',
        impressions: 0,
        clicks: 0,
        advertiser_id: 'placeholder',
        advertiser_type: 'system',
        advertiser_name: 'Itiyum'
      },
      {
        id: 'placeholder-3',
        title: 'Premium Ad Space Available',
        description: 'Showcase your menu, specials, and events to engaged diners.',
        image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=300&fit=crop',
        cta_text: 'View Pricing',
        cta_url: '/grow',
        ad_type: 'promoted',
        placement: this.placement,
        business_name: 'Your Business',
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
        // If no ads from API, use placeholder ads
        const adsToDisplay = ads.length > 0 ? ads : this.createPlaceholderAds();
        this.ads.set(adsToDisplay);
        if (adsToDisplay.length > 0) {
          this.currentAd.set(adsToDisplay[0]);
          // Only track impression for real ads, not placeholders
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
    }, 300);
  }

  previousAd(): void {
    const ads = this.ads();
    if (ads.length === 0) return;

    this.isTransitioning.set(true);

    setTimeout(() => {
      const prevIndex = this.currentAdIndex() === 0 ? ads.length - 1 : this.currentAdIndex() - 1;
      this.currentAdIndex.set(prevIndex);
      this.currentAd.set(ads[prevIndex]);
      this.trackImpression(ads[prevIndex].id);

      setTimeout(() => {
        this.isTransitioning.set(false);
      }, 50);
    }, 300);
  }

  goToAd(index: number): void {
    const ads = this.ads();
    if (index < 0 || index >= ads.length) return;

    this.isTransitioning.set(true);

    setTimeout(() => {
      this.currentAdIndex.set(index);
      this.currentAd.set(ads[index]);
      this.trackImpression(ads[index].id);

      setTimeout(() => {
        this.isTransitioning.set(false);
      }, 50);
    }, 300);
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

