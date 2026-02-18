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

// Portfolio interfaces
export interface PortfolioImage {
  id: string;
  url: string;
  title: string;
  description?: string;
  category?: string;
  event_type?: string;
  is_main: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PortfolioVideo {
  id: string;
  url: string;
  thumbnail_url?: string;
  title: string;
  description?: string;
  duration_seconds: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PortfolioTestimonial {
  id: string;
  client_name: string;
  client_avatar_url?: string;
  rating: number;
  review: string;
  event_type?: string;
  event_date?: string;
  is_public: boolean;
  is_featured: boolean;
  is_verified: boolean;
  booking_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioSettings {
  id?: string;
  portfolio_title?: string;
  portfolio_description?: string;
  show_contact_info: boolean;
  allow_downloads: boolean;
  watermark_images: boolean;
  theme: string;
}

// Service interfaces
export interface SpecialistServiceItem {
  id: string;
  serviceName: string;
  serviceType: string;
  description?: string;
  basePrice: number;
  pricePerPerson?: number;
  minGuests: number;
  maxGuests?: number;
  durationHours?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ServiceTypeOption {
  value: string;
  label: string;
}

export interface CuisineTypeOption {
  value: string;
  label: string;
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

  // ============================================
  // PORTFOLIO METHODS
  // ============================================

  /**
   * Get portfolio images
   */
  getPortfolioImages(): Observable<{ images: PortfolioImage[] }> {
    return this.http.get<{ images: PortfolioImage[] }>(`${this.apiUrl}/portfolio/images`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Add portfolio image
   */
  addPortfolioImage(data: { url: string; title: string; description?: string; category?: string; eventType?: string; isMain?: boolean }): Observable<{ image: PortfolioImage }> {
    return this.http.post<{ image: PortfolioImage }>(`${this.apiUrl}/portfolio/images`, data, {
      headers: this.getHeaders()
    });
  }

  /**
   * Update portfolio image
   */
  updatePortfolioImage(id: string, data: { title?: string; description?: string; category?: string; eventType?: string; isMain?: boolean }): Observable<{ image: PortfolioImage }> {
    return this.http.put<{ image: PortfolioImage }>(`${this.apiUrl}/portfolio/images/${id}`, data, {
      headers: this.getHeaders()
    });
  }

  /**
   * Delete portfolio image
   */
  deletePortfolioImage(id: string): Observable<{ success: boolean; deletedId: string }> {
    return this.http.delete<{ success: boolean; deletedId: string }>(`${this.apiUrl}/portfolio/images/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get portfolio videos
   */
  getPortfolioVideos(): Observable<{ videos: PortfolioVideo[] }> {
    return this.http.get<{ videos: PortfolioVideo[] }>(`${this.apiUrl}/portfolio/videos`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Add portfolio video
   */
  addPortfolioVideo(data: { url: string; title: string; description?: string; thumbnailUrl?: string; durationSeconds?: number }): Observable<{ video: PortfolioVideo }> {
    return this.http.post<{ video: PortfolioVideo }>(`${this.apiUrl}/portfolio/videos`, data, {
      headers: this.getHeaders()
    });
  }

  /**
   * Update portfolio video
   */
  updatePortfolioVideo(id: string, data: { title?: string; description?: string; thumbnailUrl?: string; durationSeconds?: number }): Observable<{ video: PortfolioVideo }> {
    return this.http.put<{ video: PortfolioVideo }>(`${this.apiUrl}/portfolio/videos/${id}`, data, {
      headers: this.getHeaders()
    });
  }

  /**
   * Delete portfolio video
   */
  deletePortfolioVideo(id: string): Observable<{ success: boolean; deletedId: string }> {
    return this.http.delete<{ success: boolean; deletedId: string }>(`${this.apiUrl}/portfolio/videos/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get testimonials
   */
  getTestimonials(): Observable<{ testimonials: PortfolioTestimonial[] }> {
    return this.http.get<{ testimonials: PortfolioTestimonial[] }>(`${this.apiUrl}/portfolio/testimonials`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Update testimonial visibility (specialists can only moderate - not edit content)
   * Testimonials are created by clients after completed bookings
   */
  updateTestimonial(id: string, data: { isPublic?: boolean; isFeatured?: boolean }): Observable<{ testimonial: PortfolioTestimonial }> {
    return this.http.put<{ testimonial: PortfolioTestimonial }>(`${this.apiUrl}/portfolio/testimonials/${id}`, data, {
      headers: this.getHeaders()
    });
  }

  /**
   * Delete testimonial
   */
  deleteTestimonial(id: string): Observable<{ success: boolean; deletedId: string }> {
    return this.http.delete<{ success: boolean; deletedId: string }>(`${this.apiUrl}/portfolio/testimonials/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get portfolio settings
   */
  getPortfolioSettings(): Observable<{ settings: PortfolioSettings }> {
    return this.http.get<{ settings: PortfolioSettings }>(`${this.apiUrl}/portfolio/settings`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Update portfolio settings
   */
  updatePortfolioSettings(data: { portfolioTitle?: string; portfolioDescription?: string; showContactInfo?: boolean; allowDownloads?: boolean; watermarkImages?: boolean; theme?: string }): Observable<{ settings: PortfolioSettings }> {
    return this.http.put<{ settings: PortfolioSettings }>(`${this.apiUrl}/portfolio/settings`, data, {
      headers: this.getHeaders()
    });
  }

  // ============================================
  // SERVICE MANAGEMENT METHODS
  // ============================================

  /**
   * Get all services for the logged-in specialist
   */
  getServices(): Observable<{ services: SpecialistServiceItem[] }> {
    return this.http.get<{ services: SpecialistServiceItem[] }>(`${this.apiUrl}/services`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Create a new service
   */
  createService(data: {
    serviceName: string;
    serviceType: string;
    description?: string;
    basePrice: number;
    pricePerPerson?: number;
    minGuests?: number;
    maxGuests?: number;
    durationHours?: number;
  }): Observable<{ message: string; service: SpecialistServiceItem }> {
    return this.http.post<{ message: string; service: SpecialistServiceItem }>(`${this.apiUrl}/services`, data, {
      headers: this.getHeaders()
    });
  }

  /**
   * Update an existing service
   */
  updateService(id: string, data: {
    serviceName?: string;
    serviceType?: string;
    description?: string;
    basePrice?: number;
    pricePerPerson?: number;
    minGuests?: number;
    maxGuests?: number;
    durationHours?: number;
    isActive?: boolean;
  }): Observable<{ message: string; service: SpecialistServiceItem }> {
    return this.http.put<{ message: string; service: SpecialistServiceItem }>(`${this.apiUrl}/services/${id}`, data, {
      headers: this.getHeaders()
    });
  }

  /**
   * Delete a service
   */
  deleteService(id: string): Observable<{ message: string; deletedId: string }> {
    return this.http.delete<{ message: string; deletedId: string }>(`${this.apiUrl}/services/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get available service types
   */
  getServiceTypes(): Observable<{ serviceTypes: ServiceTypeOption[] }> {
    return this.http.get<{ serviceTypes: ServiceTypeOption[] }>(`${this.apiUrl}/service-types`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get available cuisine types
   */
  getCuisineTypes(): Observable<{ cuisineTypes: CuisineTypeOption[] }> {
    return this.http.get<{ cuisineTypes: CuisineTypeOption[] }>(`${this.apiUrl}/cuisine-types`, {
      headers: this.getHeaders()
    });
  }
}

