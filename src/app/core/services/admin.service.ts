import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminStatistics {
  // User metrics
  totalUsers: number;
  newUsers30d: number;
  newUsers7d: number;
  businessOwners: number;
  foodEnthusiasts: number;
  normalUsers: number;
  specialists: number;

  // Business metrics
  totalBusinesses: number;
  activeBusinesses: number;
  pendingBusinesses: number;
  suspendedBusinesses: number;
  newBusinesses30d: number;
  featuredBusinesses: number;
  avgBusinessRating: number;

  // Subscription metrics (REVENUE STREAM #1)
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  freePlanCount: number;
  starterPlanCount: number;
  professionalPlanCount: number;
  enterprisePlanCount: number;
  monthlySubscriptionRevenue: number;
  totalPotentialRevenue: number;

  // Booking metrics (REVENUE STREAM #2)
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  bookings30d: number;
  bookings7d: number;
  avgPartySize: number;

  // Ad metrics (REVENUE STREAM #3)
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  pausedCampaigns: number;
  totalAdBudget: number;
  totalAdSpent: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  avgCTR: number;

  // Revenue breakdown
  subscriptionRevenue: number;
  adRevenue: number;
  commissionRevenue: number;
  totalRevenue: number;

  // Legacy/computed fields
  monthlyActiveUsers: number;
  monthlyRevenue: number;
  monthlyBookings: number;
  lastUpdated?: Date;
}

export interface ActivityLog {
  id: string;
  action_type: string;
  resource_type: string;
  resource_id?: string;
  description: string;
  metadata?: any;
  created_at: Date;
}

export interface TopPerformer {
  id: string;
  name: string;
  type: string;
  location: string;
  total_bookings: number;
  total_revenue: number;
  rating: number;
}

export interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface GeoLocation {
  id: string;
  name: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  businesses: number;
  users: number;
  bookings: number;
  revenue: number;
}

export interface RegionalStats {
  id: string;
  name: string;
  businesses: number;
  users: number;
  bookings: number;
  revenue: number;
}

export interface GeographicalDistribution {
  locations: GeoLocation[];
  regions: RegionalStats[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin`;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Get platform statistics
   */
  getStatistics(): Observable<AdminStatistics> {
    return this.http.get<AdminStatistics>(`${this.apiUrl}/statistics`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get recent activity
   */
  getActivity(limit: number = 10): Observable<ActivityLog[]> {
    return this.http.get<ActivityLog[]>(`${this.apiUrl}/activity`, {
      headers: this.getHeaders(),
      params: { limit: limit.toString() }
    });
  }

  /**
   * Get top performers
   */
  getTopPerformers(limit: number = 5): Observable<TopPerformer[]> {
    return this.http.get<TopPerformer[]>(`${this.apiUrl}/top-performers`, {
      headers: this.getHeaders(),
      params: { limit: limit.toString() }
    });
  }

  /**
   * Get system alerts
   */
  getAlerts(): Observable<SystemAlert[]> {
    return this.http.get<SystemAlert[]>(`${this.apiUrl}/alerts`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get users list
   */
  getUsers(page: number = 1, limit: number = 10, search?: string, status?: string): Observable<any> {
    const params: any = { page: page.toString(), limit: limit.toString() };
    if (search) params.search = search;
    if (status) params.status = status;

    return this.http.get(`${this.apiUrl}/users`, {
      headers: this.getHeaders(),
      params
    });
  }

  /**
   * Get single user by ID
   */
  getUser(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get businesses list
   */
  getBusinesses(page: number = 1, limit: number = 100, search?: string, status?: string, businessType?: string, verified?: string): Observable<any> {
    const params: any = { page: page.toString(), limit: limit.toString() };
    if (search) params.search = search;
    if (status && status !== 'all') params.status = status;
    if (businessType && businessType !== 'all') params.business_type = businessType;
    if (verified && verified !== 'all') params.verified = verified;

    return this.http.get(`${this.apiUrl}/businesses`, {
      headers: this.getHeaders(),
      params
    });
  }

  /**
   * Get single business by ID
   */
  getBusiness(businessId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/businesses/${businessId}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Verify a business
   */
  verifyBusiness(businessId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/businesses/${businessId}/verify`, {}, {
      headers: this.getHeaders()
    });
  }

  /**
   * Suspend a business
   */
  suspendBusiness(businessId: string, reason?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/businesses/${businessId}/suspend`, { reason }, {
      headers: this.getHeaders()
    });
  }

  /**
   * Activate a business
   */
  activateBusiness(businessId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/businesses/${businessId}/activate`, {}, {
      headers: this.getHeaders()
    });
  }

  /**
   * Delete a business
   */
  deleteBusiness(businessId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/businesses/${businessId}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Suspend a user
   */
  suspendUser(userId: string, reason?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${userId}/suspend`, { reason }, {
      headers: this.getHeaders()
    });
  }

  /**
   * Activate a user
   */
  activateUser(userId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${userId}/activate`, {}, {
      headers: this.getHeaders()
    });
  }

  /**
   * Delete a user
   */
  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${userId}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get bookings list
   */
  getBookings(page: number = 1, limit: number = 100, search?: string, status?: string, businessId?: string, dateFrom?: string, dateTo?: string): Observable<any> {
    const params: any = { page: page.toString(), limit: limit.toString() };
    if (search) params.search = search;
    if (status && status !== 'all') params.status = status;
    if (businessId) params.business_id = businessId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    return this.http.get(`${this.apiUrl}/bookings`, {
      headers: this.getHeaders(),
      params
    });
  }

  /**
   * Cancel a booking
   */
  cancelBooking(bookingId: string, reason?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/bookings/${bookingId}/cancel`, { reason }, {
      headers: this.getHeaders()
    });
  }

  /**
   * Confirm a booking
   */
  confirmBooking(bookingId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/bookings/${bookingId}/confirm`, {}, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get analytics data
   */
  getAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get report statistics
   */
  getReportStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports/stats`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Generate users report
   */
  generateUsersReport(format: string = 'json', dateFrom?: string, dateTo?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reports/users`, { format, dateFrom, dateTo }, {
      headers: this.getHeaders(),
      responseType: format === 'csv' ? 'text' as 'json' : 'json'
    });
  }

  /**
   * Generate businesses report
   */
  generateBusinessesReport(format: string = 'json', dateFrom?: string, dateTo?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reports/businesses`, { format, dateFrom, dateTo }, {
      headers: this.getHeaders(),
      responseType: format === 'csv' ? 'text' as 'json' : 'json'
    });
  }

  /**
   * Generate bookings report
   */
  generateBookingsReport(format: string = 'json', dateFrom?: string, dateTo?: string, status?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reports/bookings`, { format, dateFrom, dateTo, status }, {
      headers: this.getHeaders(),
      responseType: format === 'csv' ? 'text' as 'json' : 'json'
    });
  }

  /**
   * Generate financial report
   */
  generateFinancialReport(format: string = 'json', dateFrom?: string, dateTo?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reports/financial`, { format, dateFrom, dateTo }, {
      headers: this.getHeaders(),
      responseType: format === 'csv' ? 'text' as 'json' : 'json'
    });
  }

  /**
   * Generate analytics report
   */
  generateAnalyticsReport(format: string = 'json', dateFrom?: string, dateTo?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reports/analytics`, { format, dateFrom, dateTo }, {
      headers: this.getHeaders(),
      responseType: format === 'csv' ? 'text' as 'json' : 'json'
    });
  }

  /**
   * Generate activity report
   */
  generateActivityReport(format: string = 'json', dateFrom?: string, dateTo?: string, actionType?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reports/activity`, { format, dateFrom, dateTo, actionType }, {
      headers: this.getHeaders(),
      responseType: format === 'csv' ? 'text' as 'json' : 'json'
    });
  }

  /**
   * Get all settings
   */
  getSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/settings`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Update a setting
   */
  updateSetting(settingId: string, value: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/settings/${settingId}`, { value }, {
      headers: this.getHeaders()
    });
  }

  /**
   * Update platform settings
   */
  updateSettings(data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/settings`, data, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get all ads with optional filters
   */
  getAds(params?: { page?: number; limit?: number; search?: string; status?: string; placement?: string; advertiser_id?: string }): Observable<any> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.placement) queryParams.append('placement', params.placement);
    if (params?.advertiser_id) queryParams.append('advertiser_id', params.advertiser_id);

    const queryString = queryParams.toString();
    return this.http.get(`${this.apiUrl}/ads${queryString ? '?' + queryString : ''}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get all advertisers who have created ads
   */
  getAdvertisers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/ads/advertisers`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get ad statistics
   */
  getAdStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/ads/stats`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get a single ad by ID
   */
  getAd(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/ads/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Create a new ad
   */
  createAd(adData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/ads`, adData, {
      headers: this.getHeaders()
    });
  }

  /**
   * Update an ad
   */
  updateAd(id: string, adData: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/ads/${id}`, adData, {
      headers: this.getHeaders()
    });
  }

  /**
   * Delete an ad
   */
  deleteAd(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/ads/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get geographical distribution data
   */
  getGeographicalDistribution(): Observable<GeographicalDistribution> {
    return this.http.get<GeographicalDistribution>(`${this.apiUrl}/geographical-distribution`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get AI-powered analytics insights
   */
  getAIInsights(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/analytics/ai-insights`, {
      headers: this.getHeaders()
    });
  }
}

