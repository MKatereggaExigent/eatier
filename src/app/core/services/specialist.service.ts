import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SpecialistOverview {
  totalBookings: number;
  completedBookings: number;
  pendingRequests: number;
  upcomingBookings: number;
  totalEarnings: number;
  monthlyEarnings: number;
  totalReviews: number;
  averageRating: number;
  responseRate: number;
  repeatClientRate: number;
}

export interface SpecialistBooking {
  id: string;
  booking_reference: string;
  client_name: string;
  client_email: string;
  booking_date: string;
  guest_count: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'declined';
  event_type: string;
  event_city: string;
  contact_name: string;
  special_requests?: string;
  created_at: string;
}

export interface SpecialistReview {
  id: string;
  client_name: string;
  rating: number;
  comment: string;
  event_type: string;
  created_at: string;
}

export interface SpecialistEarning {
  id: string;
  client_name: string;
  event_type: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  payment_date?: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class SpecialistService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/specialist`;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Get specialist overview statistics
   */
  getOverview(): Observable<SpecialistOverview> {
    return this.http.get<SpecialistOverview>(`${this.apiUrl}/overview`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get specialist bookings
   */
  getBookings(status?: string, limit: number = 10): Observable<{ bookings: SpecialistBooking[] }> {
    const params: any = { limit: limit.toString() };
    if (status) {
      params.status = status;
    }
    return this.http.get<{ bookings: SpecialistBooking[] }>(`${this.apiUrl}/bookings`, {
      headers: this.getHeaders(),
      params
    });
  }

  /**
   * Get specialist reviews
   */
  getReviews(limit: number = 10): Observable<{ reviews: SpecialistReview[] }> {
    return this.http.get<{ reviews: SpecialistReview[] }>(`${this.apiUrl}/reviews`, {
      headers: this.getHeaders(),
      params: { limit: limit.toString() }
    });
  }

  /**
   * Get specialist earnings
   */
  getEarnings(limit: number = 10): Observable<{ earnings: SpecialistEarning[] }> {
    return this.http.get<{ earnings: SpecialistEarning[] }>(`${this.apiUrl}/earnings`, {
      headers: this.getHeaders(),
      params: { limit: limit.toString() }
    });
  }
}

