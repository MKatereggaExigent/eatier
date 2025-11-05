import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdServingService, Ad } from '../../../../core/services/ad-serving.service';
import { interval, Subscription } from 'rxjs';

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

  ngOnDestroy(): void {
    this.adsSubscription?.unsubscribe();
    this.rotationSubscription?.unsubscribe();
  }

  private loadAds(): void {
    this.adsSubscription = this.adService.getAdsByPlacement(this.placement, this.limit)
      .subscribe(ads => {
        this.ads.set(ads);
        if (ads.length > 0) {
          this.currentAd.set(ads[0]);
          this.trackImpression(ads[0].id);
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

