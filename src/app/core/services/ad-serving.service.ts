import { BehaviorSubject, Observable, interval, of } from 'rxjs';
import { Injectable, inject } from '@angular/core';
import { catchError, map, tap } from 'rxjs/operators';

import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Ad {
  id: string;
  title: string;
  description: string;
  image_url: string;
  video_url?: string;
  cta_text: string;
  cta_url: string;
  cta_type: 'book_now' | 'visit_website' | 'call_now' | 'learn_more' | 'get_deal' | 'view_menu' | 'order_now';
  ad_type: string;
  placement: string;
  impressions: number;
  clicks: number;
  advertiser_id: string;
  advertiser_type: string;
  advertiser_name: string;
  business_name?: string;
  business_id?: string;
  headline?: string;
  body_text?: string;
  phone?: string;
  website?: string;
  tier_name?: string;
  tier_priority?: number;
  rotation_speed_seconds?: number;
}

export interface AdPlacement {
  id: string;
  name: string;
  display_name: string;
  description: string;
  page_location: string;
  position: string;
  width: number;
  height: number;
  tier_id: string;
  tier_name: string;
  price_daily: number;
  price_weekly: number;
  price_monthly: number;
}

export interface AdTier {
  id: string;
  name: string;
  display_name: string;
  description: string;
  base_price_daily: number;
  base_price_weekly: number;
  base_price_monthly: number;
  priority_weight: number;
  rotation_speed_seconds: number;
  supports_video: boolean;
  supports_animation: boolean;
  features: string[];
  placements?: AdPlacement[];
}

@Injectable({
  providedIn: 'root'
})
export class AdServingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/ads-public`;

  // Cache for ads by placement
  private adsCache = new Map<string, BehaviorSubject<Ad[]>>();

  // Track which ads have been shown (for impression tracking)
  private shownAds = new Set<string>();

  /**
   * Get ads for a specific placement
   * @param placement The placement ID (e.g., 'homepage_banner', 'sidebar_ad')
   * @param limit Maximum number of ads to fetch
   */
  getAdsByPlacement(placement: string, limit: number = 5): Observable<Ad[]> {
    // Check if we have a cached observable for this placement
    if (!this.adsCache.has(placement)) {
      this.adsCache.set(placement, new BehaviorSubject<Ad[]>([]));
      this.fetchAds(placement, limit);
    }

    return this.adsCache.get(placement)!.asObservable();
  }

  /**
   * Fetch ads from the backend with placement filter
   */
  private fetchAds(placement: string, limit: number): void {
    // Map frontend placement names to backend placement names
    const placementMap: Record<string, string> = {
      'sidebar_ad': 'sidebar_left',
      'sidebar_left': 'sidebar_left',
      'sidebar_right': 'sidebar_right',
      'homepage_banner': 'homepage_hero_banner',
      'header_banner': 'header_banner',
      'footer_banner': 'footer_banner',
      'inline_content': 'inline_content',
      'community_feed': 'community_feed',
      'restaurant_list_banner': 'restaurant_list_banner',
      'specialist_list_banner': 'specialist_list_banner'
    };

    const backendPlacement = placementMap[placement] || placement;

    this.http.get<{ ads: any[]; count: number }>(
      `${this.apiUrl}/placements/${backendPlacement}?limit=${limit}`
    ).pipe(
      map(response => this.transformAds(response.ads || [], placement)),
      catchError(error => {
        console.error(`Error fetching ads for placement ${placement}:`, error);
        return [];
      })
    ).subscribe(ads => {
      this.adsCache.get(placement)?.next(ads);
    });
  }

  /**
   * Transform backend ad data to frontend Ad interface
   */
  private transformAds(ads: any[], placement: string): Ad[] {
    return ads.map(ad => ({
      id: ad.id,
      title: ad.title,
      description: ad.description || ad.body_text || '',
      image_url: ad.image_url || ad.media_urls?.[0] || '',
      video_url: ad.video_url || ad.video_urls?.[0] || undefined,
      cta_text: ad.call_to_action || 'Learn More',
      cta_url: ad.cta_url || '',
      cta_type: ad.cta_type || 'learn_more',
      ad_type: ad.type || 'promoted',
      placement: ad.placement_name || placement,
      impressions: ad.impressions || 0,
      clicks: ad.clicks || 0,
      advertiser_id: ad.user_id || '',
      advertiser_type: 'business',
      advertiser_name: ad.business_name || '',
      business_name: ad.business_name,
      business_id: ad.business_id,
      headline: ad.headline,
      body_text: ad.body_text,
      phone: ad.business_phone || ad.cta_phone,
      website: ad.business_website || ad.cta_url,
      tier_name: ad.tier_name,
      tier_priority: ad.tier_priority,
      rotation_speed_seconds: ad.rotation_speed_seconds
    }));
  }

  /**
   * Refresh ads for a placement
   * Useful for rotating ads
   */
  refreshAds(placement: string, limit: number = 5): void {
    this.fetchAds(placement, limit);
  }

  /**
   * Track ad impression
   * Called when an ad is displayed to the user
   */
  trackImpression(adId: string): void {
    // Only track each ad impression once per session
    if (this.shownAds.has(adId)) {
      return;
    }

    this.shownAds.add(adId);

    // Track impression via API
    this.http.post(`${this.apiUrl}/impressions/${adId}`, {})
      .pipe(
        catchError(error => {
          console.error('Error tracking impression:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Track ad click
   * Called when a user clicks on an ad
   */
  trackClick(adId: string): void {
    this.http.post(`${this.apiUrl}/clicks/${adId}`, {})
      .pipe(
        catchError(error => {
          console.error('Error tracking click:', error);
          return [];
        })
      )
      .subscribe();
  }

  /**
   * Get all available ad placements
   */
  getAvailablePlacements(): Observable<AdPlacement[]> {
    return this.http.get<{ placements: AdPlacement[] }>(`${this.apiUrl}/placements`)
      .pipe(
        map(response => response.placements),
        catchError(error => {
          console.error('Error fetching placements:', error);
          return [];
        })
      );
  }

  /**
   * Get all ad tiers with pricing
   */
  getAdTiers(): Observable<AdTier[]> {
    return this.http.get<{ tiers: AdTier[] }>(`${this.apiUrl}/tiers`)
      .pipe(
        map(response => response.tiers),
        catchError(error => {
          console.error('Error fetching ad tiers:', error);
          return [];
        })
      );
  }

  /**
   * Setup auto-refresh for a placement
   * Ads will automatically refresh at the specified interval
   * @param placement The placement ID
   * @param intervalMs Refresh interval in milliseconds (default: 30 seconds)
   * @param limit Maximum number of ads
   */
  setupAutoRefresh(placement: string, intervalMs: number = 30000, limit: number = 5): void {
    interval(intervalMs).subscribe(() => {
      this.refreshAds(placement, limit);
    });
  }

  /**
   * Clear the shown ads cache
   * Useful when user navigates or session changes
   */
  clearImpressionCache(): void {
    this.shownAds.clear();
  }
}

