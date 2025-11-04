import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdServingService, Ad } from '../../../../core/services/ad-serving.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-inline-ad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inline-ad.component.html',
  styleUrls: ['./inline-ad.component.scss']
})
export class InlineAdComponent implements OnInit, OnDestroy {
  @Input() placement: string = 'inline_content';
  @Input() limit: number = 1;

  private adService = inject(AdServingService);
  
  ad = signal<Ad | null>(null);
  
  private adsSubscription?: Subscription;

  ngOnInit(): void {
    this.loadAd();
  }

  ngOnDestroy(): void {
    this.adsSubscription?.unsubscribe();
  }

  private loadAd(): void {
    this.adsSubscription = this.adService.getAdsByPlacement(this.placement, this.limit)
      .subscribe(ads => {
        if (ads.length > 0) {
          this.ad.set(ads[0]);
          this.adService.trackImpression(ads[0].id);
        }
      });
  }

  onAdClick(ad: Ad): void {
    this.adService.trackClick(ad.id);
    if (ad.cta_url) {
      window.open(ad.cta_url, '_blank', 'noopener,noreferrer');
    }
  }
}

