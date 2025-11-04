import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdServingService, Ad } from '../../../../core/services/ad-serving.service';
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
    if (ad.cta_url) {
      window.open(ad.cta_url, '_blank', 'noopener,noreferrer');
    }
  }
}

