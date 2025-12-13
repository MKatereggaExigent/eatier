import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SpecialistListItem {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  profilePhoto: string | null;
  bio: string | null;
  averageRating: number;
  reviewCount: number;
  completedBookings: number;
  services: string[];
  specialties: string[];
  minPrice: number;
  maxPrice: number;
  cuisines: string[];
  location: { country?: string } | null;
}

export interface SpecialistService {
  id: string;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  pricePerPerson: number;
  minGuests: number;
  maxGuests: number;
  durationHours: number;
}

export interface SpecialistReviewPublic {
  id: string;
  rating: number;
  comment: string;
  eventType: string;
  createdAt: string;
  clientName: string;
}

export interface SpecialistDetail {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  profilePhoto: string | null;
  bio: string | null;
  memberSince: string;
  averageRating: number;
  reviewCount: number;
  completedBookings: number;
  services: SpecialistService[];
  reviews: SpecialistReviewPublic[];
}

export interface SpecialistListResponse {
  specialists: SpecialistListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface BookingRequest {
  serviceId?: string;
  bookingDate: string;
  guestCount: number;
  eventType: string;
  eventCity: string;
  eventAddress?: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  specialRequests?: string;
}

export interface BookingResponse {
  message: string;
  booking: {
    id: string;
    bookingReference: string;
    status: string;
    totalPrice: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PublicSpecialistService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/public/specialists`;

  /**
   * Get list of specialists (public - no auth required)
   */
  getSpecialists(params?: {
    specialty?: string;
    country?: string;
    minRating?: number;
    minPrice?: number;
    maxPrice?: number;
    cuisine?: string;
    limit?: number;
    offset?: number;
  }): Observable<SpecialistListResponse> {
    const queryParams: any = {};
    if (params?.specialty) queryParams.specialty = params.specialty;
    if (params?.country) queryParams.country = params.country;
    if (params?.minRating) queryParams.minRating = params.minRating.toString();
    if (params?.minPrice) queryParams.minPrice = params.minPrice.toString();
    if (params?.maxPrice) queryParams.maxPrice = params.maxPrice.toString();
    if (params?.cuisine) queryParams.cuisine = params.cuisine;
    if (params?.limit) queryParams.limit = params.limit.toString();
    if (params?.offset) queryParams.offset = params.offset.toString();

    return this.http.get<SpecialistListResponse>(this.apiUrl, { params: queryParams });
  }

  /**
   * Get specialist details by ID (public - no auth required)
   */
  getSpecialistById(id: string): Observable<SpecialistDetail> {
    return this.http.get<SpecialistDetail>(`${this.apiUrl}/${id}`);
  }

  /**
   * Book a specialist (requires authentication)
   */
  bookSpecialist(specialistId: string, booking: BookingRequest): Observable<BookingResponse> {
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    return this.http.post<BookingResponse>(`${this.apiUrl}/${specialistId}/book`, booking, { headers });
  }
}

