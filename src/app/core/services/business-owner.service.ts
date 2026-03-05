import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BusinessSubscription {
  id: string;
  plan: 'trial' | 'free' | 'basic' | 'premium' | 'enterprise';
  status: 'trial' | 'active' | 'expired' | 'cancelled' | 'inactive';
  startDate: string;
  endDate?: string;
  price: number;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  features?: Record<string, unknown>;
  trialDaysLeft?: number;
}

export interface DigitalCardCustomization {
  primaryColor: string;
  secondaryColor: string;
  logoPosition: 'top' | 'center' | 'bottom';
  includeQR: boolean;
  includeContact: boolean;
  includeSocial: boolean;
}

export interface UserSession {
  id: string;
  device_name?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  ip_address?: string;
  location?: string;
  is_active: boolean;
  last_activity: string;
  created_at: string;
}

export interface AccountActivity {
  id: string;
  action: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  location?: string;
  status: string;
  created_at: string;
}

export interface NotificationSettings {
  messages: boolean;
  updates: boolean;
  customerAlerts: boolean;
  marketingEmails: boolean;
  systemNotifications: boolean;
  emailFrequency: 'immediate' | 'daily' | 'weekly';
}

export interface AccountOverview {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    avatarUrl?: string;
    accountStatus: string;
    twoFactorEnabled: boolean;
    createdAt: string;
    lastLoginAt?: string;
  };
  business: {
    id: string;
    name: string;
    email: string;
    phone: string;
    logo_url?: string;
  } | null;
  stats: {
    recentActivityCount: number;
    activeSessionsCount: number;
  };
}

export interface TwoFactorStatus {
  enabled: boolean;
  method: 'email' | 'mobile' | null;
  phoneVerified: boolean;
}

export interface Business {
  id: string;
  owner_id: string;
  business_name: string;
  business_type: string;
  email: string;
  phone: string;
  country: string;
  address: string;
  sustainability_ethos?: string;
  opens_at?: string;
  closes_at?: string;
  facilities?: string[];
  account_status: string;
  total_bookings?: number;
  total_reviews?: number;
  average_rating?: number;
  total_menu_items?: number;
  digital_card_customization?: DigitalCardCustomization;
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  id?: string;
  business_id?: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface BusinessPhoto {
  id?: string;
  business_id?: string;
  photo_url: string;
  caption?: string;
  photo_type: 'general' | 'interior' | 'exterior' | 'food' | 'team' | 'menu';
  is_primary: boolean;
  display_order?: number;
  created_at?: string;
}

export interface MenuItem {
  id?: string;
  tenant_id?: string;
  business_id?: string;
  title: string;
  description?: string;
  price: number;
  category?: string;
  background_image?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Booking {
  id: string;
  booking_reference?: string;
  tenant_id: string;
  user_id: string;
  business_id: string;
  booking_date: string;
  booking_time: string;
  party_size: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  special_requests?: string;
  total_amount?: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  tenant_id: string;
  user_id: string;
  business_id: string;
  rating: number;
  comment?: string;
  images?: string[];
  helpful_count: number;
  not_helpful_count: number;
  response_from_owner?: string;
  response_date?: string;
  status: 'published' | 'hidden' | 'flagged' | 'deleted';
  customer_name?: string;
  customer_email?: string;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class BusinessOwnerService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/business-owner`;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // ===================================
  // BUSINESS PROFILE MANAGEMENT
  // ===================================

  getMyBusiness(): Observable<{ business: Business; subscription: BusinessSubscription | null }> {
    return this.http.get<{ business: Business; subscription: BusinessSubscription | null }>(`${this.apiUrl}/my-business`, {
      headers: this.getHeaders()
    });
  }

  updateMyBusiness(data: Partial<Business>): Observable<{ message: string; business: Business }> {
    return this.http.put<{ message: string; business: Business }>(`${this.apiUrl}/my-business`, data, {
      headers: this.getHeaders()
    });
  }

  // ===================================
  // BUSINESS HOURS MANAGEMENT
  // ===================================

  getBusinessHours(): Observable<{ hours: BusinessHours[] }> {
    return this.http.get<{ hours: BusinessHours[] }>(`${this.apiUrl}/hours`, {
      headers: this.getHeaders()
    });
  }

  updateBusinessHours(hours: BusinessHours[]): Observable<{ message: string; hours: BusinessHours[] }> {
    return this.http.put<{ message: string; hours: BusinessHours[] }>(`${this.apiUrl}/hours`, { hours }, {
      headers: this.getHeaders()
    });
  }

  // ===================================
  // BUSINESS PHOTOS MANAGEMENT
  // ===================================

  getBusinessPhotos(): Observable<{ photos: BusinessPhoto[] }> {
    return this.http.get<{ photos: BusinessPhoto[] }>(`${this.apiUrl}/photos`, {
      headers: this.getHeaders()
    });
  }

  addBusinessPhoto(photo: BusinessPhoto): Observable<{ message: string; photo: BusinessPhoto }> {
    return this.http.post<{ message: string; photo: BusinessPhoto }>(`${this.apiUrl}/photos`, photo, {
      headers: this.getHeaders()
    });
  }

  deleteBusinessPhoto(photoId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/photos/${photoId}`, {
      headers: this.getHeaders()
    });
  }

  // ===================================
  // MENU MANAGEMENT
  // ===================================

  getMenu(): Observable<{ menu: MenuItem[] }> {
    return this.http.get<{ menu: MenuItem[] }>(`${this.apiUrl}/menu`, {
      headers: this.getHeaders()
    });
  }

  createMenuItem(item: MenuItem): Observable<{ message: string; item: MenuItem }> {
    return this.http.post<{ message: string; item: MenuItem }>(`${this.apiUrl}/menu`, item, {
      headers: this.getHeaders()
    });
  }

  updateMenuItem(itemId: string, item: Partial<MenuItem>): Observable<{ message: string; item: MenuItem }> {
    return this.http.put<{ message: string; item: MenuItem }>(`${this.apiUrl}/menu/${itemId}`, item, {
      headers: this.getHeaders()
    });
  }

  deleteMenuItem(itemId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/menu/${itemId}`, {
      headers: this.getHeaders()
    });
  }

  toggleMenuItemAvailability(itemId: string, isActive: boolean): Observable<{ message: string; item: MenuItem }> {
    return this.http.patch<{ message: string; item: MenuItem }>(`${this.apiUrl}/menu/${itemId}/availability`,
      { is_active: isActive },
      { headers: this.getHeaders() }
    );
  }

  // ===================================
  // BOOKINGS MANAGEMENT
  // ===================================

  getBookings(params?: {
    status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Observable<{
    bookings: Booking[];
    total: number;
    pagination: { page: number; limit: number; hasMore: boolean };
  }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    return this.http.get<{
      bookings: Booking[];
      total: number;
      pagination: { page: number; limit: number; hasMore: boolean };
    }>(`${this.apiUrl}/bookings?${queryParams.toString()}`, {
      headers: this.getHeaders()
    });
  }

  getBookingDetails(bookingId: string): Observable<{ booking: Booking }> {
    return this.http.get<{ booking: Booking }>(`${this.apiUrl}/bookings/${bookingId}`, {
      headers: this.getHeaders()
    });
  }

  updateBookingStatus(bookingId: string, status: string): Observable<{ message: string; booking: Booking }> {
    return this.http.patch<{ message: string; booking: Booking }>(
      `${this.apiUrl}/bookings/${bookingId}/status`,
      { status },
      { headers: this.getHeaders() }
    );
  }

  deleteBooking(bookingId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/bookings/${bookingId}`,
      { headers: this.getHeaders() }
    );
  }

  sendBookingMessage(bookingId: string, message: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/bookings/${bookingId}/message`,
      { message },
      { headers: this.getHeaders() }
    );
  }

  // ===================================
  // REVIEWS MANAGEMENT
  // ===================================

  getReviews(params?: {
    rating?: number;
    page?: number;
    limit?: number;
  }): Observable<{
    reviews: Review[];
    total: number;
    pagination: { page: number; limit: number; hasMore: boolean };
  }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    return this.http.get<{
      reviews: Review[];
      total: number;
      pagination: { page: number; limit: number; hasMore: boolean };
    }>(`${this.apiUrl}/reviews?${queryParams.toString()}`, {
      headers: this.getHeaders()
    });
  }

  respondToReview(reviewId: string, response: string): Observable<{ message: string; review: Review }> {
    return this.http.post<{ message: string; review: Review }>(
      `${this.apiUrl}/reviews/${reviewId}/response`,
      { response },
      { headers: this.getHeaders() }
    );
  }

  // ===================================
  // DIGITAL CARD CUSTOMIZATION
  // ===================================

  updateDigitalCardCustomization(customization: DigitalCardCustomization): Observable<{ message: string; customization: DigitalCardCustomization }> {
    return this.http.put<{ message: string; customization: DigitalCardCustomization }>(
      `${this.apiUrl}/digital-card-customization`,
      customization,
      { headers: this.getHeaders() }
    );
  }

  getDigitalCardCustomization(): Observable<{ customization: DigitalCardCustomization | null }> {
    return this.http.get<{ customization: DigitalCardCustomization | null }>(
      `${this.apiUrl}/digital-card-customization`,
      { headers: this.getHeaders() }
    );
  }

  // ===================================
  // ACCOUNTS CENTRE - SECURITY
  // ===================================

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/change-password`,
      { currentPassword, newPassword },
      { headers: this.getHeaders() }
    );
  }

  enable2FA(method: 'email' | 'mobile'): Observable<{ message: string; method: string; backupCodes: string[] }> {
    return this.http.post<{ message: string; method: string; backupCodes: string[] }>(
      `${this.apiUrl}/2fa/enable`,
      { method },
      { headers: this.getHeaders() }
    );
  }

  disable2FA(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/2fa/disable`,
      {},
      { headers: this.getHeaders() }
    );
  }

  get2FAStatus(): Observable<TwoFactorStatus> {
    return this.http.get<TwoFactorStatus>(
      `${this.apiUrl}/2fa/status`,
      { headers: this.getHeaders() }
    );
  }

  getSessions(): Observable<{ sessions: UserSession[] }> {
    return this.http.get<{ sessions: UserSession[] }>(
      `${this.apiUrl}/sessions`,
      { headers: this.getHeaders() }
    );
  }

  revokeSession(sessionId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/sessions/${sessionId}`,
      { headers: this.getHeaders() }
    );
  }

  // ===================================
  // ACCOUNTS CENTRE - ACTIVITY
  // ===================================

  getAccountActivity(limit: number = 50, offset: number = 0): Observable<{
    activities: AccountActivity[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return this.http.get<{
      activities: AccountActivity[];
      total: number;
      limit: number;
      offset: number;
    }>(`${this.apiUrl}/activity?limit=${limit}&offset=${offset}`, {
      headers: this.getHeaders()
    });
  }

  // ===================================
  // ACCOUNTS CENTRE - NOTIFICATIONS
  // ===================================

  getNotificationSettings(): Observable<NotificationSettings> {
    return this.http.get<NotificationSettings>(
      `${this.apiUrl}/notification-settings`,
      { headers: this.getHeaders() }
    );
  }

  updateNotificationSettings(settings: NotificationSettings): Observable<{
    message: string;
    settings: NotificationSettings;
  }> {
    return this.http.put<{
      message: string;
      settings: NotificationSettings;
    }>(
      `${this.apiUrl}/notification-settings`,
      settings,
      { headers: this.getHeaders() }
    );
  }

  // ===================================
  // ACCOUNTS CENTRE - OVERVIEW
  // ===================================

  getAccountOverview(): Observable<AccountOverview> {
    return this.http.get<AccountOverview>(
      `${this.apiUrl}/account-overview`,
      { headers: this.getHeaders() }
    );
  }
}

