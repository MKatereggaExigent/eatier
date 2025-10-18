import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  item_name: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
  dietary_info?: string[];
  is_available: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Booking {
  id: string;
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

  getMyBusiness(): Observable<{ business: Business }> {
    return this.http.get<{ business: Business }>(`${this.apiUrl}/my-business`, {
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

  toggleMenuItemAvailability(itemId: string, isAvailable: boolean): Observable<{ message: string; item: MenuItem }> {
    return this.http.patch<{ message: string; item: MenuItem }>(`${this.apiUrl}/menu/${itemId}/availability`, 
      { is_available: isAvailable }, 
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
}

