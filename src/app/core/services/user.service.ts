import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  country?: string;
  dateOfBirth?: string;
  gender?: string;
  isChef: boolean;
  profilePhoto?: string;
  backgroundPhoto?: string;
  bio?: string;
  experienceYears?: number;
  specialtyDishes?: string[];
  certifications?: string[];
  accountStatus: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserStats {
  totalReviews: number;
  totalBookings: number;
  totalFavorites: number;
  totalPhotos: number;
}

export interface UserActivity {
  id: string;
  type: 'review' | 'booking' | 'favorite' | 'photo';
  business_name?: string;
  action: string;
  created_at: string;
  rating?: number;
  status?: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  business_id: string;
  business_name: string;
  business_type?: string;
  business_rating?: number;
  business_address?: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // ===================================
  // USER PROFILE
  // ===================================

  getUserProfile(userId: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/users/${userId}`, {
      headers: this.getHeaders()
    });
  }

  updateUserProfile(userId: string, data: Partial<UserProfile>): Observable<{ message: string; user: UserProfile }> {
    return this.http.put<{ message: string; user: UserProfile }>(
      `${this.apiUrl}/users/${userId}`,
      data,
      { headers: this.getHeaders() }
    );
  }

  // ===================================
  // USER STATISTICS
  // ===================================

  getUserStats(userId: string): Observable<UserStats> {
    // This will aggregate data from reviews, bookings, favorites, etc.
    return this.http.get<UserStats>(`${this.apiUrl}/users/${userId}/stats`, {
      headers: this.getHeaders()
    });
  }

  // ===================================
  // USER ACTIVITY
  // ===================================

  getUserActivity(userId: string, params?: { limit?: number }): Observable<{ activities: UserActivity[] }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }

    return this.http.get<{ activities: UserActivity[] }>(
      `${this.apiUrl}/users/${userId}/activity?${queryParams.toString()}`,
      { headers: this.getHeaders() }
    );
  }

  // ===================================
  // FAVORITES
  // ===================================

  getUserFavorites(userId: string, params?: { page?: number; limit?: number }): Observable<{
    favorites: Favorite[];
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
      favorites: Favorite[];
      total: number;
      pagination: { page: number; limit: number; hasMore: boolean };
    }>(`${this.apiUrl}/users/${userId}/favorites?${queryParams.toString()}`, {
      headers: this.getHeaders()
    });
  }

  addFavorite(userId: string, businessId: string): Observable<{ message: string; favorite: Favorite }> {
    return this.http.post<{ message: string; favorite: Favorite }>(
      `${this.apiUrl}/users/${userId}/favorites`,
      { business_id: businessId },
      { headers: this.getHeaders() }
    );
  }

  removeFavorite(userId: string, favoriteId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/users/${userId}/favorites/${favoriteId}`,
      { headers: this.getHeaders() }
    );
  }

  // ===================================
  // USER REVIEWS
  // ===================================

  getUserReviews(userId: string, params?: { page?: number; limit?: number }): Observable<{
    reviews: any[];
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
      reviews: any[];
      total: number;
      pagination: { page: number; limit: number; hasMore: boolean };
    }>(`${this.apiUrl}/users/${userId}/reviews?${queryParams.toString()}`, {
      headers: this.getHeaders()
    });
  }

  // ===================================
  // USER BOOKINGS
  // ===================================

  getUserBookings(userId: string, params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Observable<{
    bookings: any[];
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
      bookings: any[];
      total: number;
      pagination: { page: number; limit: number; hasMore: boolean };
    }>(`${this.apiUrl}/users/${userId}/bookings?${queryParams.toString()}`, {
      headers: this.getHeaders()
    });
  }

  // ===================================
  // RECOMMENDED BUSINESSES
  // ===================================

  getRecommendedBusinesses(userId: string, params?: { limit?: number }): Observable<{
    businesses: any[];
  }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }

    return this.http.get<{ businesses: any[] }>(
      `${this.apiUrl}/users/${userId}/recommendations?${queryParams.toString()}`,
      { headers: this.getHeaders() }
    );
  }
}

