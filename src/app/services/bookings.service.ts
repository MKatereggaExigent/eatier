import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { ApiService } from '../core/services/api.service';
import { HttpClient } from '@angular/common/http';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string;
  cuisineTypes: string[];
  priceRange: string;
  averageRating: number;
  totalReviews: number;
  imageUrl: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  website?: string;
  operatingHours: { [key: string]: { open: string; close: string } | { closed: true } };
  amenities: string[];
  acceptsReservations: boolean;
  maxPartySize: number;
  advanceBookingDays: number;
}

export interface Booking {
  id: string;
  bookingReference: string;
  restaurantId: string;
  restaurant: Restaurant;
  userId: string;
  bookingDate: Date;
  bookingTime: string;
  partySize: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  specialRequests?: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  tablePreferences?: string;
  occasion?: string;
  confirmedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingRequest {
  restaurantId: string;
  bookingDate: string; // YYYY-MM-DD format
  bookingTime: string; // HH:MM format
  partySize: number;
  specialRequests?: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  tablePreferences?: string;
  occasion?: string;
  bookingTier?: 'basic' | 'standard' | 'premium' | 'priority'; // NEW
}

export interface BookingTier {
  tier: 'basic' | 'standard' | 'premium' | 'priority';
  tier_name: string;
  tier_description: string;
  tier_color: string;
  tier_icon: string;
  benefits: string[];
  priority_level: number;
  allows_cancellation: boolean;
  allows_modification: boolean;
  gets_confirmation_priority: boolean;
  gets_table_preference: boolean;
  gets_special_requests: boolean;
}

export interface BusinessCapacitySettings {
  total_capacity: number;
  tables_count: number;
  slot_duration_minutes: number;
  basic_tier_price: number;
  standard_tier_price: number;
  premium_tier_price: number;
  priority_tier_price: number;
  enable_tier_system: boolean;
}

export interface TimeSlot {
  id: string;
  slot_date: string;
  slot_time: string;
  slot_end_time: string;
  total_capacity: number;
  basic_capacity: number;
  standard_capacity: number;
  premium_capacity: number;
  priority_capacity: number;
  basic_booked: number;
  standard_booked: number;
  premium_booked: number;
  priority_booked: number;
  total_booked: number;
  is_available: boolean;
  is_blocked: boolean;
  block_reason?: string;
  tier_capacity?: number;
  tier_booked?: number;
  tier_available?: number;
  is_tier_available?: boolean;
}

export interface BookingStats {
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  favoriteRestaurants: Restaurant[];
  recentBookings: Booking[];
  monthlyBookings: { month: string; count: number }[];
}

export interface AvailableTimeSlot {
  time: string;
  available: boolean;
  maxPartySize?: number;
  currentBookings?: number;
}

@Injectable({
  providedIn: 'root'
})
export class BookingsService {
  private apiService = inject(ApiService);

  // State management
  private bookingsSubject = new BehaviorSubject<Booking[]>([]);
  private restaurantsSubject = new BehaviorSubject<Restaurant[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  bookings$ = this.bookingsSubject.asObservable();
  restaurants$ = this.restaurantsSubject.asObservable();
  isLoading$ = this.isLoadingSubject.asObservable();

  constructor() {
    // Load initial data from API
    this.loadUserBookings();
    this.loadRestaurants();
  }

  private loadUserBookings(): void {
    const userId = localStorage.getItem('user_id') || 'temp-user';
    this.isLoadingSubject.next(true);

    this.apiService.get<any>(`bookings/user/${userId}`).subscribe({
      next: (response) => {
        const bookings = response.bookings.map((booking: any) => this.transformBooking(booking));
        this.bookingsSubject.next(bookings);
        this.isLoadingSubject.next(false);
      },
      error: (error) => {
        console.error('Error loading bookings:', error);
        this.bookingsSubject.next([]);
        this.isLoadingSubject.next(false);
      }
    });
  }

  private loadRestaurants(): void {
    this.apiService.get<any>('businesses').subscribe({
      next: (response) => {
        // Handle both array and object responses
        const businessesArray = Array.isArray(response) ? response : (response.businesses || []);
        const restaurants = businessesArray.map((business: any) => this.transformBusinessToRestaurant(business));
        this.restaurantsSubject.next(restaurants);
      },
      error: (error) => {
        console.error('Error loading restaurants:', error);
        this.restaurantsSubject.next([]);
      }
    });
  }

  // Transformation methods
  private transformBooking(booking: any): Booking {
    const businessName = booking.business_name || 'Unknown Restaurant';
    return {
      id: booking.id,
      bookingReference: booking.booking_reference,
      restaurantId: booking.business_id,
      restaurant: {
        id: booking.business_id,
        name: businessName,
        slug: businessName.toLowerCase().replace(/\s+/g, '-'),
        description: '',
        cuisineTypes: [],
        priceRange: 'moderate',
        averageRating: 0,
        totalReviews: 0,
        imageUrl: `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop`,
        address: '',
        city: '',
        state: '',
        phone: booking.business_phone || '',
        email: booking.business_email || '',
        website: '',
        operatingHours: {},
        amenities: [],
        acceptsReservations: true,
        maxPartySize: 12,
        advanceBookingDays: 30
      },
      userId: booking.user_id,
      bookingDate: new Date(booking.booking_date),
      bookingTime: booking.booking_time,
      partySize: booking.party_size,
      status: booking.status,
      specialRequests: booking.special_requests,
      contactName: booking.contact_name,
      contactPhone: booking.contact_phone,
      contactEmail: booking.contact_email,
      tablePreferences: booking.table_preferences,
      occasion: booking.occasion,
      confirmedAt: booking.confirmed_at ? new Date(booking.confirmed_at) : undefined,
      cancelledAt: booking.cancelled_at ? new Date(booking.cancelled_at) : undefined,
      cancellationReason: booking.cancellation_reason,
      createdAt: new Date(booking.created_at),
      updatedAt: new Date(booking.updated_at)
    };
  }

  private transformBusinessToRestaurant(business: any): Restaurant {
    const businessName = business.business_name || business.name || 'Unknown Business';
    return {
      id: business.id,
      name: businessName,
      slug: businessName.toLowerCase().replace(/\s+/g, '-'),
      description: business.bio || '',
      cuisineTypes: [],
      priceRange: 'moderate',
      averageRating: 0,
      totalReviews: 0,
      imageUrl: business.profile_photos?.[0] || `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop`,
      address: business.address || '',
      city: '',
      state: '',
      phone: business.phone || '',
      email: business.email || '',
      website: '',
      operatingHours: {
        monday: { open: business.opens_at || '09:00', close: business.closes_at || '22:00' },
        tuesday: { open: business.opens_at || '09:00', close: business.closes_at || '22:00' },
        wednesday: { open: business.opens_at || '09:00', close: business.closes_at || '22:00' },
        thursday: { open: business.opens_at || '09:00', close: business.closes_at || '22:00' },
        friday: { open: business.opens_at || '09:00', close: business.closes_at || '22:00' },
        saturday: { open: business.opens_at || '09:00', close: business.closes_at || '22:00' },
        sunday: { open: business.opens_at || '09:00', close: business.closes_at || '22:00' }
      },
      amenities: business.facilities || [],
      acceptsReservations: true,
      maxPartySize: 12,
      advanceBookingDays: 30
    };
  }

  // Public API methods
  getBookings(): Observable<Booking[]> {
    return this.bookings$;
  }

  getRestaurants(): Observable<Restaurant[]> {
    return this.restaurants$;
  }

  getBookingById(id: string): Observable<Booking | null> {
    return this.bookings$.pipe(
      map(bookings => bookings.find(booking => booking.id === id) || null)
    );
  }

  getRestaurantById(id: string): Observable<Restaurant | null> {
    return this.restaurants$.pipe(
      map(restaurants => restaurants.find(restaurant => restaurant.id === id) || null)
    );
  }

  // Create new booking
  createBooking(bookingRequest: BookingRequest): Observable<Booking> {
    const userId = localStorage.getItem('user_id') || 'temp-user';

    const payload = {
      businessId: bookingRequest.restaurantId,
      userId,
      bookingDate: bookingRequest.bookingDate,
      bookingTime: bookingRequest.bookingTime,
      partySize: bookingRequest.partySize,
      specialRequests: bookingRequest.specialRequests,
      contactName: bookingRequest.contactName,
      contactPhone: bookingRequest.contactPhone,
      contactEmail: bookingRequest.contactEmail,
      tablePreferences: bookingRequest.tablePreferences,
      occasion: bookingRequest.occasion,
      bookingTier: bookingRequest.bookingTier || 'basic' // NEW
    };

    return this.apiService.post<any>('bookings', payload).pipe(
      map(response => this.transformBooking(response)),
      tap(booking => {
        // Update local state
        const currentBookings = this.bookingsSubject.value;
        this.bookingsSubject.next([...currentBookings, booking]);
      }),
      catchError(error => {
        console.error('Error creating booking:', error);
        throw error;
      })
    );
  }

  // Cancel booking
  cancelBooking(bookingId: string, reason?: string): Observable<boolean> {
    return this.apiService.patch<any>(`bookings/${bookingId}/status`, {
      status: 'cancelled',
      cancellationReason: reason
    }).pipe(
      map(() => true),
      tap(() => {
        // Update local state
        const currentBookings = this.bookingsSubject.value;
        const updatedBookings = currentBookings.map(booking =>
          booking.id === bookingId
            ? { ...booking, status: 'cancelled' as const, cancelledAt: new Date(), cancellationReason: reason }
            : booking
        );
        this.bookingsSubject.next(updatedBookings);
      }),
      catchError(error => {
        console.error('Error cancelling booking:', error);
        return of(false);
      })
    );
  }

  // Get available time slots for a restaurant on a specific date
  getAvailableTimeSlots(restaurantId: string, date: string, tier: string = 'basic'): Observable<AvailableTimeSlot[]> {
    return this.apiService.get<any>(`bookings/slots/${restaurantId}?date=${date}&tier=${tier}`).pipe(
      map(response => {
        return response.slots.map((slot: any) => ({
          time: slot.slot_time,
          available: slot.is_available,
          maxPartySize: slot.max_capacity,
          currentBookings: slot.current_bookings
        }));
      }),
      catchError(error => {
        console.error('Error fetching available time slots:', error);
        // Fallback to mock data if API fails
        return of(this.generateAvailableTimeSlots());
      })
    );
  }

  // Get booking statistics
  getBookingStats(): Observable<BookingStats> {
    return this.bookings$.pipe(
      map(bookings => this.calculateBookingStats(bookings))
    );
  }

  private calculateBookingStats(bookings: Booking[]): BookingStats {
    const now = new Date();
    const upcomingBookings = bookings.filter(b =>
      b.status !== 'cancelled' && new Date(b.bookingDate) >= now
    );
    const completedBookings = bookings.filter(b => b.status === 'completed');
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled');

    // Get favorite restaurants (most booked)
    const restaurantCounts = bookings.reduce((acc, booking) => {
      acc[booking.restaurantId] = (acc[booking.restaurantId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const favoriteRestaurants = Object.entries(restaurantCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([restaurantId]) => bookings.find(b => b.restaurantId === restaurantId)?.restaurant)
      .filter(Boolean) as Restaurant[];

    // Monthly bookings for the last 6 months
    const monthlyBookings = this.getMonthlyBookingStats(bookings);

    return {
      totalBookings: bookings.length,
      upcomingBookings: upcomingBookings.length,
      completedBookings: completedBookings.length,
      cancelledBookings: cancelledBookings.length,
      favoriteRestaurants,
      recentBookings: bookings.slice(0, 5),
      monthlyBookings
    };
  }

  private getMonthlyBookingStats(bookings: Booking[]): { month: string; count: number }[] {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const count = bookings.filter(booking =>
        booking.createdAt.toISOString().slice(0, 7) === monthKey
      ).length;

      months.push({ month: monthName, count });
    }

    return months;
  }

  private generateAvailableTimeSlots(): AvailableTimeSlot[] {
    const slots = [];
    for (let hour = 17; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({
          time,
          available: Math.random() > 0.3, // 70% availability
          maxPartySize: Math.floor(Math.random() * 8) + 4
        });
      }
    }
    return slots;
  }

  // NEW: Booking tier and availability methods

  // Get all booking tiers with benefits
  getBookingTiers(): Observable<BookingTier[]> {
    return this.apiService.get<any>('booking-availability/tiers').pipe(
      map(response => response.tiers),
      catchError(error => {
        console.error('Error fetching booking tiers:', error);
        return of([]);
      })
    );
  }

  // Get business capacity settings
  getBusinessCapacitySettings(businessId: string): Observable<BusinessCapacitySettings> {
    return this.apiService.get<any>(`booking-availability/business/${businessId}/settings`).pipe(
      map(response => response.settings),
      catchError(error => {
        console.error('Error fetching business settings:', error);
        return of({
          total_capacity: 50,
          tables_count: 10,
          slot_duration_minutes: 90,
          basic_tier_price: 0.00,
          standard_tier_price: 5.00,
          premium_tier_price: 15.00,
          priority_tier_price: 25.00,
          enable_tier_system: true
        });
      })
    );
  }

  // Get available time slots for a business on a specific date
  getAvailableSlots(businessId: string, date: string, tier: string = 'basic'): Observable<TimeSlot[]> {
    return this.apiService.get<any>(`booking-availability/business/${businessId}/slots`, {
      params: { date, tier }
    }).pipe(
      map(response => response.slots),
      catchError(error => {
        console.error('Error fetching available slots:', error);
        return of([]);
      })
    );
  }

  // Check if a specific slot is available
  checkSlotAvailability(
    businessId: string,
    date: string,
    time: string,
    tier: string = 'basic',
    partySize: number = 1
  ): Observable<{ is_available: boolean; slot: TimeSlot | null }> {
    return this.apiService.post<any>('booking-availability/check', {
      businessId,
      date,
      time,
      tier,
      partySize
    }).pipe(
      catchError(error => {
        console.error('Error checking slot availability:', error);
        return of({ is_available: false, slot: null });
      })
    );
  }

  // Add to waitlist
  addToWaitlist(
    businessId: string,
    userId: string,
    preferredDate: string,
    preferredTime: string,
    partySize: number,
    tier: string,
    contactName: string,
    contactPhone: string,
    contactEmail: string
  ): Observable<any> {
    return this.apiService.post<any>('booking-availability/waitlist', {
      businessId,
      userId,
      preferredDate,
      preferredTime,
      partySize,
      tier,
      contactName,
      contactPhone,
      contactEmail
    }).pipe(
      catchError(error => {
        console.error('Error adding to waitlist:', error);
        throw error;
      })
    );
  }

  // All data now comes from the backend API


}
