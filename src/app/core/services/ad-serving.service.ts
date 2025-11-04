import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Ad {
  id: string;
  title: string;
  description: string;
  image_url: string;
  video_url?: string;
  cta_text: string;
  cta_url: string;
  ad_type: string;
  placement: string;
  impressions: number;
  clicks: number;
  advertiser_id: string;
  advertiser_type: string;
  advertiser_name: string;
  business_name?: string;
}

export interface AdPlacement {
  id: string;
  name: string;
  description: string;
  dimensions: string;
  position: string;
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
   * Fetch ads from the backend
   */
  private fetchAds(placement: string, limit: number): void {
    this.http.get<{ placement: string; ads: Ad[]; count: number }>(
      `${this.apiUrl}/placements/${placement}?limit=${limit}`
    ).pipe(
      map(response => response.ads),
      catchError(error => {
        console.error(`Error fetching ads for placement ${placement}:`, error);
        return [];
      })
    ).subscribe(ads => {
      this.adsCache.get(placement)?.next(ads);
    });
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

    this.http.post(`${this.apiUrl}/impressions/${adId}`, {})
      .pipe(
        catchError(error => {
          console.error('Error tracking impression:', error);
          return [];
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

