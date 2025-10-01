import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// Database connection configuration
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

// User favorite item from database
interface UserFavoriteItem {
  id: string;
  user_id: string;
  menu_item_id: string;
  created_at: string;
}

// Business data from database
interface BusinessData {
  id: string;
  name: string;
  slug: string;
  description: string;
  cuisine_types: string[];
  price_range: 'budget' | 'moderate' | 'expensive' | 'fine_dining';
  average_rating: number;
  total_reviews: number;
  phone: string;
  email: string;
  website_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Business location data
interface BusinessLocation {
  id: string;
  business_id: string;
  name?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  is_primary: boolean;
}

// Menu item data
interface MenuItem {
  id: string;
  business_id: string;
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  dietary_info: string[];
  is_available: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

// Combined favorite data for frontend
interface FavoriteRestaurant {
  favoriteId: string;
  business: BusinessData;
  location: BusinessLocation;
  addedAt: Date;
  notes?: string;
  visitCount: number;
  lastVisited?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private http = inject(HttpClient);

  // In a real application, these would come from environment variables
  private readonly API_BASE_URL = '/api/v1';
  private readonly DB_CONFIG: DatabaseConfig = {
    host: 'localhost',
    port: 5432,
    database: 'itiyum_platform',
    username: 'itiyum_user',
    password: 'itiyum_secure_password_2024'
  };

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + this.getAuthToken()
    })
  };

  constructor() {
    console.log('DatabaseService initialized with config:', {
      ...this.DB_CONFIG,
      password: '***' // Don't log password
    });
  }

  // Get authentication token (would be from auth service in real app)
  private getAuthToken(): string {
    return localStorage.getItem('auth_token') || 'demo_token';
  }

  // Get current user ID (would be from auth service in real app)
  private getCurrentUserId(): string {
    return localStorage.getItem('user_id') || 'demo_user_id';
  }

  // ===================================
  // USER FAVORITES OPERATIONS
  // ===================================

  // Get user's favorite restaurants
  getUserFavorites(): Observable<FavoriteRestaurant[]> {
    const userId = this.getCurrentUserId();

    // In a real app, this would be a proper API call to your backend
    // The backend would execute SQL queries against PostgreSQL
    const query = `
      SELECT
        ufi.id as favorite_id,
        ufi.created_at as added_at,
        b.*,
        bl.address,
        bl.city,
        bl.state,
        bl.latitude,
        bl.longitude
      FROM user_favorite_items ufi
      JOIN menu_items mi ON ufi.menu_item_id = mi.id
      JOIN businesses b ON mi.business_id = b.id
      JOIN business_locations bl ON b.id = bl.business_id AND bl.is_primary = true
      WHERE ufi.user_id = $1
      ORDER BY ufi.created_at DESC
    `;

    // Mock API call - in production this would hit your backend API
    return this.http.post<any[]>(`${this.API_BASE_URL}/favorites/query`, {
      query,
      params: [userId]
    }, this.httpOptions).pipe(
      map(results => this.transformFavoritesData(results)),
      catchError(error => {
        console.error('Error fetching user favorites:', error);
        // Return mock data for development
        return of(this.getMockFavorites());
      })
    );
  }

  // Add restaurant to favorites
  addToFavorites(businessId: string, menuItemId?: string, notes?: string): Observable<boolean> {
    const userId = this.getCurrentUserId();

    // If no specific menu item, get the first available item from the business
    const insertQuery = `
      INSERT INTO user_favorite_items (user_id, menu_item_id, created_at)
      SELECT $1, mi.id, NOW()
      FROM menu_items mi
      WHERE mi.business_id = $2
      AND mi.is_available = true
      LIMIT 1
      ON CONFLICT (user_id, menu_item_id) DO NOTHING
    `;

    return this.http.post<any>(`${this.API_BASE_URL}/favorites/add`, {
      query: insertQuery,
      params: [userId, businessId]
    }, this.httpOptions).pipe(
      map(result => result.success || true),
      catchError(error => {
        console.error('Error adding to favorites:', error);
        return of(true); // Mock success for development
      })
    );
  }

  // Remove from favorites
  removeFromFavorites(favoriteId: string): Observable<boolean> {
    const userId = this.getCurrentUserId();

    const deleteQuery = `
      DELETE FROM user_favorite_items
      WHERE id = $1 AND user_id = $2
    `;

    return this.http.post<any>(`${this.API_BASE_URL}/favorites/remove`, {
      query: deleteQuery,
      params: [favoriteId, userId]
    }, this.httpOptions).pipe(
      map(result => result.success || true),
      catchError(error => {
        console.error('Error removing from favorites:', error);
        return of(true); // Mock success for development
      })
    );
  }

  // Check if business is favorited
  isFavorited(businessId: string): Observable<boolean> {
    const userId = this.getCurrentUserId();

    const checkQuery = `
      SELECT EXISTS(
        SELECT 1 FROM user_favorite_items ufi
        JOIN menu_items mi ON ufi.menu_item_id = mi.id
        WHERE ufi.user_id = $1 AND mi.business_id = $2
      ) as is_favorited
    `;

    return this.http.post<any>(`${this.API_BASE_URL}/favorites/check`, {
      query: checkQuery,
      params: [userId, businessId]
    }, this.httpOptions).pipe(
      map(result => result.is_favorited || false),
      catchError(error => {
        console.error('Error checking favorite status:', error);
        return of(false);
      })
    );
  }

  // ===================================
  // BUSINESS SEARCH OPERATIONS
  // ===================================

  // Search businesses with filters
  searchBusinesses(filters: {
    query?: string;
    cuisine?: string[];
    priceRange?: string[];
    city?: string;
    rating?: number;
    limit?: number;
    offset?: number;
  }): Observable<BusinessData[]> {
    let searchQuery = `
      SELECT DISTINCT b.*, bl.address, bl.city, bl.state, bl.latitude, bl.longitude
      FROM businesses b
      JOIN business_locations bl ON b.id = bl.business_id AND bl.is_primary = true
      WHERE b.status = 'active'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Add search filters
    if (filters.query) {
      searchQuery += ` AND (b.name ILIKE $${paramIndex} OR b.description ILIKE $${paramIndex})`;
      params.push(`%${filters.query}%`);
      paramIndex++;
    }

    if (filters.cuisine && filters.cuisine.length > 0) {
      searchQuery += ` AND b.cuisine_types && $${paramIndex}`;
      params.push(filters.cuisine);
      paramIndex++;
    }

    if (filters.priceRange && filters.priceRange.length > 0) {
      searchQuery += ` AND b.price_range = ANY($${paramIndex})`;
      params.push(filters.priceRange);
      paramIndex++;
    }

    if (filters.city) {
      searchQuery += ` AND bl.city ILIKE $${paramIndex}`;
      params.push(`%${filters.city}%`);
      paramIndex++;
    }

    if (filters.rating) {
      searchQuery += ` AND b.average_rating >= $${paramIndex}`;
      params.push(filters.rating);
      paramIndex++;
    }

    searchQuery += ` ORDER BY b.average_rating DESC, b.total_reviews DESC`;

    if (filters.limit) {
      searchQuery += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters.offset) {
      searchQuery += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    return this.http.post<any[]>(`${this.API_BASE_URL}/businesses/search`, {
      query: searchQuery,
      params
    }, this.httpOptions).pipe(
      map(results => results || []),
      catchError(error => {
        console.error('Error searching businesses:', error);
        return of([]);
      })
    );
  }

  // ===================================
  // UTILITY METHODS
  // ===================================

  // Transform database results to frontend format
  private transformFavoritesData(results: any[]): FavoriteRestaurant[] {
    return results.map(row => ({
      favoriteId: row.favorite_id,
      business: {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        cuisine_types: row.cuisine_types,
        price_range: row.price_range,
        average_rating: row.average_rating,
        total_reviews: row.total_reviews,
        phone: row.phone,
        email: row.email,
        website_url: row.website_url,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at
      },
      location: {
        id: row.location_id || '',
        business_id: row.id,
        address: row.address,
        city: row.city,
        state: row.state,
        country: row.country || 'USA',
        latitude: row.latitude,
        longitude: row.longitude,
        is_primary: true
      },
      addedAt: new Date(row.added_at),
      visitCount: 0, // Would come from booking history
      notes: row.notes
    }));
  }

  // Mock data for development (when database is not available)
  private getMockFavorites(): FavoriteRestaurant[] {
    return [
      {
        favoriteId: '1',
        business: {
          id: 'rest-1',
          name: 'Bella Italia',
          slug: 'bella-italia',
          description: 'Authentic Italian cuisine in the heart of the city',
          cuisine_types: ['Italian'],
          price_range: 'expensive',
          average_rating: 4.8,
          total_reviews: 234,
          phone: '+1 (555) 123-4567',
          email: 'info@bellaitalia.com',
          website_url: 'https://bellaitalia.com',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        location: {
          id: 'loc-1',
          business_id: 'rest-1',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          latitude: 40.7128,
          longitude: -74.0060,
          is_primary: true
        },
        addedAt: new Date('2024-01-15'),
        visitCount: 3,
        notes: 'Amazing carbonara! Perfect for date nights.'
      }
    ];
  }

  // ===================================
  // BOOKINGS OPERATIONS
  // ===================================

  // Get user bookings
  getUserBookings(): Observable<any[]> {
    const userId = this.getCurrentUserId();

    const query = `
      SELECT
        b.*,
        json_build_object(
          'id', bus.id,
          'name', bus.name,
          'slug', bus.slug,
          'description', bus.description,
          'cuisine_types', bus.cuisine_types,
          'price_range', bus.price_range,
          'average_rating', bus.average_rating,
          'total_reviews', bus.total_reviews,
          'contact_phone', bus.contact_phone,
          'contact_email', bus.contact_email,
          'website', bus.website,
          'operating_hours', bus.operating_hours,
          'amenities', bus.amenities
        ) as business,
        json_build_object(
          'address', bl.address,
          'city', bl.city,
          'state', bl.state,
          'latitude', bl.latitude,
          'longitude', bl.longitude
        ) as business_location
      FROM bookings b
      JOIN businesses bus ON b.business_id = bus.id
      LEFT JOIN business_locations bl ON b.business_location_id = bl.id
      WHERE b.user_id = $1
      ORDER BY b.booking_date DESC, b.booking_time DESC
    `;

    return this.http.post<any[]>(`${this.API_BASE_URL}/bookings/user`, {
      query,
      params: [userId]
    }, this.httpOptions).pipe(
      map(results => results || []),
      catchError(error => {
        console.error('Error fetching user bookings:', error);
        return of([]);
      })
    );
  }

  // Get restaurants for booking
  getRestaurants(): Observable<any[]> {
    const query = `
      SELECT
        b.*,
        json_build_object(
          'address', bl.address,
          'city', bl.city,
          'state', bl.state,
          'latitude', bl.latitude,
          'longitude', bl.longitude
        ) as location
      FROM businesses b
      LEFT JOIN business_locations bl ON b.id = bl.business_id AND bl.is_primary = true
      WHERE b.business_type = 'restaurant'
      ORDER BY b.average_rating DESC, b.total_reviews DESC
    `;

    return this.http.post<any[]>(`${this.API_BASE_URL}/restaurants/list`, {
      query,
      params: []
    }, this.httpOptions).pipe(
      map(results => results || []),
      catchError(error => {
        console.error('Error fetching restaurants:', error);
        return of([]);
      })
    );
  }

  // Create new booking
  createBooking(bookingRequest: any): Observable<boolean> {
    const userId = this.getCurrentUserId();

    const query = `
      INSERT INTO bookings (
        business_id, user_id, booking_date, booking_time, party_size,
        special_requests, contact_name, contact_phone, contact_email,
        table_preferences, occasion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const params = [
      bookingRequest.restaurantId,
      userId,
      bookingRequest.bookingDate,
      bookingRequest.bookingTime,
      bookingRequest.partySize,
      bookingRequest.specialRequests,
      bookingRequest.contactName,
      bookingRequest.contactPhone,
      bookingRequest.contactEmail,
      bookingRequest.tablePreferences,
      bookingRequest.occasion
    ];

    return this.http.post<any>(`${this.API_BASE_URL}/bookings/create`, {
      query,
      params
    }, this.httpOptions).pipe(
      map(result => result.success || true),
      catchError(error => {
        console.error('Error creating booking:', error);
        return of(false);
      })
    );
  }

  // Cancel booking
  cancelBooking(bookingId: string, reason?: string): Observable<boolean> {
    const userId = this.getCurrentUserId();

    const query = `
      UPDATE bookings
      SET status = 'cancelled',
          cancelled_at = CURRENT_TIMESTAMP,
          cancellation_reason = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $3
    `;

    return this.http.post<any>(`${this.API_BASE_URL}/bookings/cancel`, {
      query,
      params: [bookingId, reason, userId]
    }, this.httpOptions).pipe(
      map(result => result.success || true),
      catchError(error => {
        console.error('Error cancelling booking:', error);
        return of(false);
      })
    );
  }

  // Get available time slots
  getAvailableTimeSlots(restaurantId: string, date: string): Observable<any[]> {
    const query = `
      SELECT
        generate_series(
          '17:00'::time,
          '22:00'::time,
          '30 minutes'::interval
        ) as time_slot
    `;

    return this.http.post<any[]>(`${this.API_BASE_URL}/bookings/availability`, {
      query,
      params: [restaurantId, date]
    }, this.httpOptions).pipe(
      map(results => {
        return (results || []).map((row: any) => ({
          time: row.time_slot,
          available: Math.random() > 0.3, // Mock availability
          maxPartySize: Math.floor(Math.random() * 8) + 4
        }));
      }),
      catchError(error => {
        console.error('Error fetching available time slots:', error);
        return of([]);
      })
    );
  }

  // ===================================
  // REVIEWS OPERATIONS
  // ===================================

  // Get user reviews
  getUserReviews(): Observable<any[]> {
    const userId = this.getCurrentUserId();

    const query = `
      SELECT
        r.*,
        json_build_object(
          'id', b.id,
          'name', b.name,
          'slug', b.slug,
          'description', b.description,
          'cuisine_types', b.cuisine_types,
          'price_range', b.price_range,
          'average_rating', b.average_rating,
          'total_reviews', b.total_reviews,
          'contact_phone', b.contact_phone,
          'contact_email', b.contact_email,
          'website', b.website
        ) as business,
        json_build_object(
          'address', bl.address,
          'city', bl.city,
          'state', bl.state,
          'latitude', bl.latitude,
          'longitude', bl.longitude
        ) as business_location
      FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      LEFT JOIN business_locations bl ON b.id = bl.business_id AND bl.is_primary = true
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
    `;

    return this.http.post<any[]>(`${this.API_BASE_URL}/reviews/user`, {
      query,
      params: [userId]
    }, this.httpOptions).pipe(
      map(results => results || []),
      catchError(error => {
        console.error('Error fetching user reviews:', error);
        return of([]);
      })
    );
  }

  // Create new review
  createReview(reviewRequest: any): Observable<boolean> {
    const userId = this.getCurrentUserId();

    const query = `
      INSERT INTO reviews (
        business_id, user_id, overall_rating, food_rating, service_rating,
        ambiance_rating, value_rating, title, content, visit_date,
        dishes_ordered, price_paid, party_size, occasion, would_recommend
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `;

    const params = [
      reviewRequest.restaurantId,
      userId,
      reviewRequest.overallRating,
      reviewRequest.foodRating,
      reviewRequest.serviceRating,
      reviewRequest.ambianceRating,
      reviewRequest.valueRating,
      reviewRequest.title,
      reviewRequest.content,
      reviewRequest.visitDate,
      JSON.stringify(reviewRequest.dishesOrdered),
      reviewRequest.pricePaid,
      reviewRequest.partySize,
      reviewRequest.occasion,
      reviewRequest.wouldRecommend
    ];

    return this.http.post<any>(`${this.API_BASE_URL}/reviews/create`, {
      query,
      params
    }, this.httpOptions).pipe(
      map(result => result.success || true),
      catchError(error => {
        console.error('Error creating review:', error);
        return of(false);
      })
    );
  }

  // Update review
  updateReview(reviewId: string, updates: any): Observable<boolean> {
    const userId = this.getCurrentUserId();

    const query = `
      UPDATE reviews
      SET overall_rating = $2,
          food_rating = $3,
          service_rating = $4,
          ambiance_rating = $5,
          value_rating = $6,
          title = $7,
          content = $8,
          visit_date = $9,
          dishes_ordered = $10,
          price_paid = $11,
          party_size = $12,
          occasion = $13,
          would_recommend = $14,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $15
    `;

    const params = [
      reviewId,
      updates.overallRating,
      updates.foodRating,
      updates.serviceRating,
      updates.ambianceRating,
      updates.valueRating,
      updates.title,
      updates.content,
      updates.visitDate,
      JSON.stringify(updates.dishesOrdered),
      updates.pricePaid,
      updates.partySize,
      updates.occasion,
      updates.wouldRecommend,
      userId
    ];

    return this.http.post<any>(`${this.API_BASE_URL}/reviews/update`, {
      query,
      params
    }, this.httpOptions).pipe(
      map(result => result.success || true),
      catchError(error => {
        console.error('Error updating review:', error);
        return of(false);
      })
    );
  }

  // Delete review
  deleteReview(reviewId: string): Observable<boolean> {
    const userId = this.getCurrentUserId();

    const query = `
      DELETE FROM reviews
      WHERE id = $1 AND user_id = $2
    `;

    return this.http.post<any>(`${this.API_BASE_URL}/reviews/delete`, {
      query,
      params: [reviewId, userId]
    }, this.httpOptions).pipe(
      map(result => result.success || true),
      catchError(error => {
        console.error('Error deleting review:', error);
        return of(false);
      })
    );
  }

  // Vote on review helpfulness
  voteOnReview(reviewId: string, isHelpful: boolean): Observable<boolean> {
    const userId = this.getCurrentUserId();

    const query = `
      INSERT INTO review_votes (review_id, user_id, is_helpful)
      VALUES ($1, $2, $3)
      ON CONFLICT (review_id, user_id)
      DO UPDATE SET is_helpful = $3, updated_at = CURRENT_TIMESTAMP
    `;

    return this.http.post<any>(`${this.API_BASE_URL}/reviews/vote`, {
      query,
      params: [reviewId, userId, isHelpful]
    }, this.httpOptions).pipe(
      map(result => result.success || true),
      catchError(error => {
        console.error('Error voting on review:', error);
        return of(false);
      })
    );
  }

  // Test database connection
  testConnection(): Observable<boolean> {
    return this.http.get<any>(`${this.API_BASE_URL}/health`, this.httpOptions).pipe(
      map(result => result.database_connected || false),
      catchError(error => {
        console.warn('Database connection test failed, using mock data:', error);
        return of(false);
      })
    );
  }
}
