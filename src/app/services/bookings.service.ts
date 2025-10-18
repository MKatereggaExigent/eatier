import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { ApiService } from '../core/services/api.service';

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
    this.apiService.get<any[]>('businesses').subscribe({
      next: (businesses) => {
        const restaurants = businesses.map(business => this.transformBusinessToRestaurant(business));
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
    return {
      id: booking.id,
      bookingReference: booking.booking_reference,
      restaurantId: booking.business_id,
      restaurant: {
        id: booking.business_id,
        name: booking.business_name,
        slug: booking.business_name.toLowerCase().replace(/\s+/g, '-'),
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
    return {
      id: business.id,
      name: business.business_name,
      slug: business.business_name.toLowerCase().replace(/\s+/g, '-'),
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
      occasion: bookingRequest.occasion
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
  getAvailableTimeSlots(restaurantId: string, date: string): Observable<AvailableTimeSlot[]> {
    // Generate mock time slots since we don't have a specific endpoint for this
    return of(this.generateAvailableTimeSlots());
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

  // All data now comes from the backend API


}
