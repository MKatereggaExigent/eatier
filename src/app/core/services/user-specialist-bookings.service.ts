import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SpecialistInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
}

export interface ServiceInfo {
  name: string;
  description: string;
  basePrice: number;
}

export interface SpecialistBooking {
  id: string;
  bookingReference: string;
  bookingDate: string;
  guestCount: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  eventType: string;
  eventCity: string;
  eventAddress: string;
  specialRequests: string;
  paymentStatus: string;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  hasTestimonial: boolean;
  createdAt: string;
  updatedAt: string;
  specialist: SpecialistInfo;
  service: ServiceInfo | null;
}

export interface ReviewableBooking {
  id: string;
  bookingReference: string;
  bookingDate: string;
  eventType: string;
  completedAt: string;
  specialist: {
    id: string;
    fullName: string;
  };
  serviceName: string;
}

export interface BookingsResponse {
  bookings: SpecialistBooking[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface TestimonialRequest {
  rating: number;
  review: string;
  eventType?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserSpecialistBookingsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/user/specialist-bookings`;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Get all specialist bookings for the current user
   */
  getBookings(params?: { status?: string; limit?: number; offset?: number }): Observable<BookingsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    
    const url = queryParams.toString() ? `${this.apiUrl}?${queryParams}` : this.apiUrl;
    return this.http.get<BookingsResponse>(url, { headers: this.getHeaders() });
  }

  /**
   * Get a specific booking by ID
   */
  getBooking(id: string): Observable<{ booking: SpecialistBooking }> {
    return this.http.get<{ booking: SpecialistBooking }>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get bookings that are eligible for testimonials (completed, no review yet)
   */
  getReviewableBookings(): Observable<{ bookings: ReviewableBooking[] }> {
    return this.http.get<{ bookings: ReviewableBooking[] }>(`${this.apiUrl}/status/reviewable`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Cancel a pending booking
   */
  cancelBooking(id: string, reason?: string): Observable<{ message: string; booking: any }> {
    return this.http.post<{ message: string; booking: any }>(
      `${this.apiUrl}/${id}/cancel`,
      { reason },
      { headers: this.getHeaders() }
    );
  }

  /**
   * Submit a testimonial for a completed booking
   */
  submitTestimonial(bookingId: string, data: TestimonialRequest): Observable<{ message: string; testimonial: any }> {
    return this.http.post<{ message: string; testimonial: any }>(
      `${this.apiUrl}/${bookingId}/testimonial`,
      data,
      { headers: this.getHeaders() }
    );
  }
}

