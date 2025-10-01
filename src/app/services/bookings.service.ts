import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { DatabaseService } from './database.service';

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
  private http = inject(HttpClient);
  private databaseService = inject(DatabaseService);
  private apiUrl = '/api/bookings';

  // State management
  private bookingsSubject = new BehaviorSubject<Booking[]>([]);
  private restaurantsSubject = new BehaviorSubject<Restaurant[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  bookings$ = this.bookingsSubject.asObservable();
  restaurants$ = this.restaurantsSubject.asObservable();
  isLoading$ = this.isLoadingSubject.asObservable();

  constructor() {
    // Initialize with mock data and test database connection
    this.initializeBookings();
  }

  private initializeBookings(): void {
    this.databaseService.testConnection().subscribe({
      next: (connected) => {
        if (connected) {
          console.log('Database connected, loading bookings from database');
          this.loadBookingsFromDatabase();
          this.loadRestaurantsFromDatabase();
        } else {
          console.log('Database not available, using mock data');
          this.bookingsSubject.next(this.mockBookings);
          this.restaurantsSubject.next(this.mockRestaurants);
        }
      },
      error: () => {
        console.log('Database connection failed, using mock data');
        this.bookingsSubject.next(this.mockBookings);
        this.restaurantsSubject.next(this.mockRestaurants);
      }
    });
  }

  // Database methods
  private loadBookingsFromDatabase(): void {
    this.databaseService.getUserBookings().subscribe({
      next: (dbBookings) => {
        const bookings = this.transformDatabaseBookings(dbBookings);
        this.bookingsSubject.next(bookings);
      },
      error: (error) => {
        console.error('Error loading bookings from database:', error);
        this.bookingsSubject.next(this.mockBookings);
      }
    });
  }

  private loadRestaurantsFromDatabase(): void {
    this.databaseService.getRestaurants().subscribe({
      next: (dbRestaurants) => {
        const restaurants = this.transformDatabaseRestaurants(dbRestaurants);
        this.restaurantsSubject.next(restaurants);
      },
      error: (error) => {
        console.error('Error loading restaurants from database:', error);
        this.restaurantsSubject.next(this.mockRestaurants);
      }
    });
  }

  private transformDatabaseBookings(dbBookings: any[]): Booking[] {
    return dbBookings.map(dbBooking => ({
      id: dbBooking.id,
      bookingReference: dbBooking.booking_reference,
      restaurantId: dbBooking.business_id,
      restaurant: {
        id: dbBooking.business.id,
        name: dbBooking.business.name,
        slug: dbBooking.business.slug,
        description: dbBooking.business.description || '',
        cuisineTypes: dbBooking.business.cuisine_types || [],
        priceRange: dbBooking.business.price_range || 'moderate',
        averageRating: dbBooking.business.average_rating || 0,
        totalReviews: dbBooking.business.total_reviews || 0,
        imageUrl: `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop`,
        address: dbBooking.business_location?.address || '',
        city: dbBooking.business_location?.city || '',
        state: dbBooking.business_location?.state || '',
        phone: dbBooking.business.contact_phone || '',
        email: dbBooking.business.contact_email || '',
        website: dbBooking.business.website,
        operatingHours: dbBooking.business.operating_hours || {},
        amenities: dbBooking.business.amenities || [],
        acceptsReservations: true,
        maxPartySize: 12,
        advanceBookingDays: 30
      },
      userId: dbBooking.user_id,
      bookingDate: new Date(dbBooking.booking_date),
      bookingTime: dbBooking.booking_time,
      partySize: dbBooking.party_size,
      status: dbBooking.status,
      specialRequests: dbBooking.special_requests,
      contactName: dbBooking.contact_name,
      contactPhone: dbBooking.contact_phone,
      contactEmail: dbBooking.contact_email,
      tablePreferences: dbBooking.table_preferences,
      occasion: dbBooking.occasion,
      confirmedAt: dbBooking.confirmed_at ? new Date(dbBooking.confirmed_at) : undefined,
      cancelledAt: dbBooking.cancelled_at ? new Date(dbBooking.cancelled_at) : undefined,
      cancellationReason: dbBooking.cancellation_reason,
      createdAt: new Date(dbBooking.created_at),
      updatedAt: new Date(dbBooking.updated_at)
    }));
  }

  private transformDatabaseRestaurants(dbRestaurants: any[]): Restaurant[] {
    return dbRestaurants.map(dbRestaurant => ({
      id: dbRestaurant.id,
      name: dbRestaurant.name,
      slug: dbRestaurant.slug,
      description: dbRestaurant.description || '',
      cuisineTypes: dbRestaurant.cuisine_types || [],
      priceRange: dbRestaurant.price_range || 'moderate',
      averageRating: dbRestaurant.average_rating || 0,
      totalReviews: dbRestaurant.total_reviews || 0,
      imageUrl: `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop`,
      address: dbRestaurant.location?.address || '',
      city: dbRestaurant.location?.city || '',
      state: dbRestaurant.location?.state || '',
      phone: dbRestaurant.contact_phone || '',
      email: dbRestaurant.contact_email || '',
      website: dbRestaurant.website,
      operatingHours: dbRestaurant.operating_hours || {},
      amenities: dbRestaurant.amenities || [],
      acceptsReservations: dbRestaurant.accepts_reservations !== false,
      maxPartySize: dbRestaurant.max_party_size || 12,
      advanceBookingDays: dbRestaurant.advance_booking_days || 30
    }));
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
    return this.databaseService.createBooking(bookingRequest).pipe(
      switchMap(success => {
        if (success) {
          // Reload bookings to get updated list
          this.loadBookingsFromDatabase();
          return this.getBookings().pipe(
            map(bookings => {
              const newBooking = bookings.find(b =>
                b.restaurantId === bookingRequest.restaurantId &&
                b.bookingDate.toISOString().split('T')[0] === bookingRequest.bookingDate &&
                b.bookingTime === bookingRequest.bookingTime
              );
              return newBooking || this.createMockBooking(bookingRequest);
            })
          );
        } else {
          return of(this.createMockBooking(bookingRequest));
        }
      }),
      catchError(error => {
        console.error('Error creating booking:', error);
        return of(this.createMockBooking(bookingRequest));
      })
    );
  }

  // Cancel booking
  cancelBooking(bookingId: string, reason?: string): Observable<boolean> {
    return this.databaseService.cancelBooking(bookingId, reason).pipe(
      tap(success => {
        if (success) {
          this.loadBookingsFromDatabase();
        } else {
          // Update mock data
          const currentBookings = this.bookingsSubject.value;
          const updatedBookings = currentBookings.map(booking =>
            booking.id === bookingId
              ? { ...booking, status: 'cancelled' as const, cancelledAt: new Date(), cancellationReason: reason }
              : booking
          );
          this.bookingsSubject.next(updatedBookings);
        }
      }),
      catchError(error => {
        console.error('Error cancelling booking:', error);
        return of(false);
      })
    );
  }

  // Get available time slots for a restaurant on a specific date
  getAvailableTimeSlots(restaurantId: string, date: string): Observable<AvailableTimeSlot[]> {
    return this.databaseService.getAvailableTimeSlots(restaurantId, date).pipe(
      catchError(error => {
        console.error('Error getting available time slots:', error);
        return of(this.getMockAvailableTimeSlots());
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

  private createMockBooking(request: BookingRequest): Booking {
    const restaurant = this.mockRestaurants.find(r => r.id === request.restaurantId) || this.mockRestaurants[0];

    return {
      id: Date.now().toString(),
      bookingReference: 'BK' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      restaurantId: request.restaurantId,
      restaurant,
      userId: 'current-user',
      bookingDate: new Date(request.bookingDate),
      bookingTime: request.bookingTime,
      partySize: request.partySize,
      status: 'pending',
      specialRequests: request.specialRequests,
      contactName: request.contactName,
      contactPhone: request.contactPhone,
      contactEmail: request.contactEmail,
      tablePreferences: request.tablePreferences,
      occasion: request.occasion,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private getMockAvailableTimeSlots(): AvailableTimeSlot[] {
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

  // Mock data for development
  private mockRestaurants: Restaurant[] = [
    {
      id: 'rest-1',
      name: 'The Golden Spoon',
      slug: 'the-golden-spoon',
      description: 'Fine dining experience with contemporary American cuisine',
      cuisineTypes: ['American', 'Contemporary'],
      priceRange: 'expensive',
      averageRating: 4.8,
      totalReviews: 342,
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      phone: '(555) 123-4567',
      email: 'reservations@goldenspoon.com',
      website: 'https://goldenspoon.com',
      operatingHours: {
        monday: { open: '17:00', close: '22:00' },
        tuesday: { open: '17:00', close: '22:00' },
        wednesday: { open: '17:00', close: '22:00' },
        thursday: { open: '17:00', close: '22:00' },
        friday: { open: '17:00', close: '23:00' },
        saturday: { open: '17:00', close: '23:00' },
        sunday: { closed: true }
      },
      amenities: ['Valet Parking', 'Private Dining', 'Wine Cellar', 'Outdoor Seating'],
      acceptsReservations: true,
      maxPartySize: 12,
      advanceBookingDays: 60
    }
  ];

  private mockBookings: Booking[] = [
    {
      id: 'booking-1',
      bookingReference: 'BK123ABC',
      restaurantId: 'rest-1',
      restaurant: this.mockRestaurants[0],
      userId: 'user-1',
      bookingDate: new Date('2024-02-15'),
      bookingTime: '19:00',
      partySize: 4,
      status: 'confirmed',
      specialRequests: 'Window table preferred, celebrating anniversary',
      contactName: 'John Smith',
      contactPhone: '(555) 123-4567',
      contactEmail: 'john.smith@email.com',
      tablePreferences: 'Window seating',
      occasion: 'Anniversary',
      confirmedAt: new Date('2024-01-20'),
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20')
    }
  ];
}
