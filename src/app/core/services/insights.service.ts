import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface BusinessInsightsResponse {
  businessId: string;
  period: {
    start: string;
    end: string;
    type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  };
  metrics: {
    totalViews: number;
    uniqueVisitors: number;
    menuViews: number;
    profileViews: number;
    contactClicks: number;
    qrScans: number;
    shareCount: number;
  };
  engagement: {
    averageSessionDuration: number;
    bounceRate: number;
    returnVisitorRate: number;
    peakHours: string[];
    popularMenuItems: string[];
  };
  growth: {
    viewsGrowth: number;
    engagementGrowth: number;
    customerGrowth: number;
  };
  demographics: {
    topCountries: { country: string; count: number }[];
    deviceTypes: { type: string; percentage: number }[];
    referralSources: { source: string; count: number }[];
  };
  bookings: {
    total: number;
    confirmed: number;
    cancelled: number;
    completed: number;
    revenue: number;
    avgPartySize: number;
  };
  reviews: {
    total: number;
    avgRating: number;
    positive: number;
    negative: number;
  };
  dailyData: {
    date: string;
    views: number;
    visitors: number;
    menuViews: number;
    contactClicks: number;
  }[];
}

export interface TrackEventPayload {
  businessId: string;
  userId?: string;
  pageType?: string;
  clickType?: string;
  sessionId?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  region?: string;
  referrer?: string;
  sessionDuration?: number;
  isReturningVisitor?: boolean;
  platform?: string; // for shares
  scanLocation?: string; // for QR scans
  pagesVisited?: number; // for session end
  duration?: number; // for session end
}

@Injectable({
  providedIn: 'root'
})
export class InsightsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';

  /**
   * Get business insights for a specific period
   */
  getBusinessInsights(
    businessId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' = 'daily',
    startDate?: string,
    endDate?: string
  ): Observable<BusinessInsightsResponse> {
    let url = `${this.apiUrl}/insights/business/${businessId}?period=${period}`;

    if (period === 'custom' && startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }

    return this.http.get<BusinessInsightsResponse>(url).pipe(
      catchError(error => {
        console.error('Error fetching business insights:', error);
        throw error;
      })
    );
  }

  /**
   * Track a page view event
   */
  trackPageView(payload: TrackEventPayload): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/insights/track/pageview`, payload).pipe(
      catchError(error => {
        console.error('Error tracking page view:', error);
        return of({ success: false });
      })
    );
  }

  /**
   * Track a contact click event
   */
  trackContactClick(payload: TrackEventPayload): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/insights/track/contact`, payload).pipe(
      catchError(error => {
        console.error('Error tracking contact click:', error);
        return of({ success: false });
      })
    );
  }

  /**
   * Track a QR code scan event
   */
  trackQRScan(payload: TrackEventPayload): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/insights/track/qrscan`, payload).pipe(
      catchError(error => {
        console.error('Error tracking QR scan:', error);
        return of({ success: false });
      })
    );
  }

  /**
   * Track a share event
   */
  trackShare(payload: TrackEventPayload): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/insights/track/share`, payload).pipe(
      catchError(error => {
        console.error('Error tracking share:', error);
        return of({ success: false });
      })
    );
  }

  /**
   * Track session end (for duration and bounce rate)
   */
  trackSessionEnd(payload: TrackEventPayload): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/insights/track/session-end`, payload).pipe(
      catchError(error => {
        console.error('Error tracking session end:', error);
        return of({ success: false });
      })
    );
  }

  /**
   * Check if this is a returning visitor
   */
  isReturningVisitor(businessId: string): boolean {
    const visitedKey = `visited_business_${businessId}`;
    const hasVisited = localStorage.getItem(visitedKey);
    if (!hasVisited) {
      localStorage.setItem(visitedKey, new Date().toISOString());
      return false;
    }
    return true;
  }

  /**
   * Get device info for tracking
   */
  getDeviceInfo(): { deviceType: string; browser: string; os: string } {
    const userAgent = navigator.userAgent;

    // Detect device type
    let deviceType = 'desktop';
    if (/Mobi|Android/i.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/Tablet|iPad/i.test(userAgent)) {
      deviceType = 'tablet';
    }

    // Detect browser
    let browser = 'unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // Detect OS
    let os = 'unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return { deviceType, browser, os };
  }
}

