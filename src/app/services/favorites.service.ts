import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { DatabaseService } from './database.service';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string;
  cuisineTypes: string[];
  priceRange: 'budget' | 'moderate' | 'expensive' | 'fine_dining';
  averageRating: number;
  totalReviews: number;
  imageUrl: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  website?: string;
  isOpen: boolean;
  distance?: number;
  estimatedDeliveryTime?: number;
  tags: string[];
  features: string[];
  addedToFavoritesAt: Date;
}

export interface FavoriteItem {
  id: string;
  userId: string;
  restaurantId: string;
  restaurant: Restaurant;
  notes?: string;
  addedAt: Date;
  lastVisited?: Date;
  visitCount: number;
  tags: string[];
}

export interface FavoritesStats {
  totalFavorites: number;
  cuisineBreakdown: { cuisine: string; count: number }[];
  priceRangeBreakdown: { range: string; count: number }[];
  averageRating: number;
  mostVisited: Restaurant | null;
  recentlyAdded: FavoriteItem[];
}

export interface FavoriteCollection {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  coverImageUrl?: string;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private http = inject(HttpClient);
  private databaseService = inject(DatabaseService);
  private apiUrl = '/api/favorites'; // This would be your backend API endpoint

  // State management
  private favoritesSubject = new BehaviorSubject<FavoriteItem[]>([]);
  private collectionsSubject = new BehaviorSubject<FavoriteCollection[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  favorites$ = this.favoritesSubject.asObservable();
  collections$ = this.collectionsSubject.asObservable();
  isLoading$ = this.isLoadingSubject.asObservable();

  // Mock data for development (replace with actual API calls)
  private mockFavorites: FavoriteItem[] = [
    {
      id: '1',
      userId: 'user-1',
      restaurantId: 'rest-1',
      restaurant: {
        id: 'rest-1',
        name: 'Bella Italia',
        slug: 'bella-italia',
        description: 'Authentic Italian cuisine in the heart of the city',
        cuisineTypes: ['Italian'],
        priceRange: 'expensive',
        averageRating: 4.8,
        totalReviews: 234,
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        phone: '+1 (555) 123-4567',
        website: 'https://bellaitalia.com',
        isOpen: true,
        distance: 0.8,
        estimatedDeliveryTime: 35,
        tags: ['romantic', 'date-night', 'pasta'],
        features: ['outdoor-seating', 'wine-bar', 'reservations'],
        addedToFavoritesAt: new Date('2024-01-15')
      },
      notes: 'Amazing carbonara! Perfect for date nights.',
      addedAt: new Date('2024-01-15'),
      lastVisited: new Date('2024-01-20'),
      visitCount: 3,
      tags: ['date-night', 'pasta']
    },
    {
      id: '2',
      userId: 'user-1',
      restaurantId: 'rest-2',
      restaurant: {
        id: 'rest-2',
        name: 'Sushi Zen',
        slug: 'sushi-zen',
        description: 'Fresh sushi and Japanese cuisine',
        cuisineTypes: ['Japanese'],
        priceRange: 'expensive',
        averageRating: 4.9,
        totalReviews: 189,
        imageUrl: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop',
        address: '456 Oak Avenue',
        city: 'New York',
        state: 'NY',
        phone: '+1 (555) 987-6543',
        isOpen: true,
        distance: 1.2,
        estimatedDeliveryTime: 25,
        tags: ['fresh', 'premium', 'sushi'],
        features: ['sushi-bar', 'sake-selection', 'omakase'],
        addedToFavoritesAt: new Date('2024-01-10')
      },
      notes: 'Best omakase in the city!',
      addedAt: new Date('2024-01-10'),
      lastVisited: new Date('2024-01-18'),
      visitCount: 2,
      tags: ['sushi', 'premium']
    },
    {
      id: '3',
      userId: 'user-1',
      restaurantId: 'rest-3',
      restaurant: {
        id: 'rest-3',
        name: 'The Burger Joint',
        slug: 'the-burger-joint',
        description: 'Gourmet burgers and craft beer',
        cuisineTypes: ['American'],
        priceRange: 'moderate',
        averageRating: 4.5,
        totalReviews: 456,
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
        address: '789 Burger Lane',
        city: 'New York',
        state: 'NY',
        phone: '+1 (555) 456-7890',
        isOpen: true,
        distance: 0.5,
        estimatedDeliveryTime: 20,
        tags: ['casual', 'burgers', 'craft-beer'],
        features: ['outdoor-seating', 'craft-beer', 'takeout'],
        addedToFavoritesAt: new Date('2024-01-08')
      },
      notes: 'Great for casual dining with friends.',
      addedAt: new Date('2024-01-08'),
      lastVisited: new Date('2024-01-22'),
      visitCount: 5,
      tags: ['casual', 'friends']
    }
  ];

  private mockCollections: FavoriteCollection[] = [
    {
      id: '1',
      name: 'Date Night Spots',
      description: 'Perfect restaurants for romantic evenings',
      isPublic: false,
      coverImageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      itemCount: 5,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15')
    },
    {
      id: '2',
      name: 'Quick Lunch',
      description: 'Fast and delicious lunch options',
      isPublic: true,
      itemCount: 8,
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-20')
    }
  ];

  constructor() {
    // Test database connection and initialize
    this.databaseService.testConnection().subscribe({
      next: (connected) => {
        if (connected) {
          console.log('Database connected, using live data');
          this.loadFavoritesFromDatabase();
        } else {
          console.log('Database not available, using mock data');
          this.favoritesSubject.next(this.mockFavorites);
        }
      },
      error: () => {
        console.log('Database connection failed, using mock data');
        this.favoritesSubject.next(this.mockFavorites);
      }
    });

    this.collectionsSubject.next(this.mockCollections);
  }

  // Load favorites from database
  private loadFavoritesFromDatabase(): void {
    this.databaseService.getUserFavorites().subscribe({
      next: (dbFavorites) => {
        // Transform database format to frontend format
        const favorites: FavoriteItem[] = dbFavorites.map(dbFav => ({
          id: dbFav.favoriteId,
          userId: 'current-user', // Would come from auth service
          restaurantId: dbFav.business.id,
          restaurant: {
            id: dbFav.business.id,
            name: dbFav.business.name,
            slug: dbFav.business.slug,
            description: dbFav.business.description || '',
            cuisineTypes: dbFav.business.cuisine_types,
            priceRange: dbFav.business.price_range,
            averageRating: dbFav.business.average_rating,
            totalReviews: dbFav.business.total_reviews,
            imageUrl: `https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop`, // Mock image
            address: dbFav.location.address,
            city: dbFav.location.city,
            state: dbFav.location.state,
            phone: dbFav.business.phone,
            website: dbFav.business.website_url,
            isOpen: true, // Would be calculated based on business hours
            distance: this.calculateDistance(dbFav.location.latitude, dbFav.location.longitude),
            estimatedDeliveryTime: 30, // Mock value
            tags: ['restaurant'], // Would come from business tags
            features: ['reservations'], // Would come from business features
            addedToFavoritesAt: dbFav.addedAt
          },
          notes: dbFav.notes,
          addedAt: dbFav.addedAt,
          lastVisited: dbFav.lastVisited,
          visitCount: dbFav.visitCount,
          tags: ['favorite'] // Would come from user tags
        }));

        this.favoritesSubject.next(favorites);
      },
      error: (error) => {
        console.error('Error loading favorites from database:', error);
        this.favoritesSubject.next(this.mockFavorites);
      }
    });
  }

  // Calculate distance (mock implementation)
  private calculateDistance(lat?: number, lng?: number): number {
    // In a real app, this would calculate distance from user's location
    return Math.random() * 5; // Random distance between 0-5 miles
  }

  // Get user's favorite restaurants
  getFavorites(): Observable<FavoriteItem[]> {
    this.isLoadingSubject.next(true);

    // Try to get from database first, fallback to mock data
    return this.databaseService.getUserFavorites().pipe(
      map(dbFavorites => {
        // Transform database format to frontend format (same as in loadFavoritesFromDatabase)
        const favorites: FavoriteItem[] = dbFavorites.map(dbFav => ({
          id: dbFav.favoriteId,
          userId: 'current-user',
          restaurantId: dbFav.business.id,
          restaurant: {
            id: dbFav.business.id,
            name: dbFav.business.name,
            slug: dbFav.business.slug,
            description: dbFav.business.description || '',
            cuisineTypes: dbFav.business.cuisine_types,
            priceRange: dbFav.business.price_range,
            averageRating: dbFav.business.average_rating,
            totalReviews: dbFav.business.total_reviews,
            imageUrl: `https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop`,
            address: dbFav.location.address,
            city: dbFav.location.city,
            state: dbFav.location.state,
            phone: dbFav.business.phone,
            website: dbFav.business.website_url,
            isOpen: true,
            distance: this.calculateDistance(dbFav.location.latitude, dbFav.location.longitude),
            estimatedDeliveryTime: 30,
            tags: ['restaurant'],
            features: ['reservations'],
            addedToFavoritesAt: dbFav.addedAt
          },
          notes: dbFav.notes,
          addedAt: dbFav.addedAt,
          lastVisited: dbFav.lastVisited,
          visitCount: dbFav.visitCount,
          tags: ['favorite']
        }));

        this.isLoadingSubject.next(false);
        this.favoritesSubject.next(favorites);
        return favorites;
      }),
      catchError(error => {
        console.error('Error fetching favorites from database:', error);
        this.isLoadingSubject.next(false);
        // Fallback to mock data
        this.favoritesSubject.next(this.mockFavorites);
        return of(this.mockFavorites);
      })
    );
  }

  // Add restaurant to favorites
  addToFavorites(restaurantId: string, notes?: string): Observable<FavoriteItem> {
    // Try database first, fallback to mock
    return this.databaseService.addToFavorites(restaurantId, undefined, notes).pipe(
      switchMap(success => {
        if (success) {
          // Reload favorites to get updated list
          return this.getFavorites().pipe(
            map(favorites => {
              // Return the newly added favorite
              const newFavorite = favorites.find(fav => fav.restaurantId === restaurantId);
              return newFavorite || this.createMockFavorite(restaurantId, notes);
            })
          );
        } else {
          // Fallback to mock implementation
          return of(this.createMockFavorite(restaurantId, notes));
        }
      }),
      catchError(error => {
        console.error('Error adding to favorites:', error);
        return of(this.createMockFavorite(restaurantId, notes));
      })
    );
  }

  // Create mock favorite for fallback
  private createMockFavorite(restaurantId: string, notes?: string): FavoriteItem {
    const newFavorite: FavoriteItem = {
      id: Date.now().toString(),
      userId: 'user-1',
      restaurantId,
      restaurant: this.mockFavorites[0].restaurant, // Mock restaurant data
      notes,
      addedAt: new Date(),
      visitCount: 0,
      tags: []
    };

    const currentFavorites = this.favoritesSubject.value;
    this.favoritesSubject.next([...currentFavorites, newFavorite]);

    return newFavorite;
  }

  // Remove from favorites
  removeFromFavorites(favoriteId: string): Observable<boolean> {
    // Try database first, fallback to mock
    return this.databaseService.removeFromFavorites(favoriteId).pipe(
      map(success => {
        if (success) {
          // Update local state
          const currentFavorites = this.favoritesSubject.value;
          const updatedFavorites = currentFavorites.filter(fav => fav.id !== favoriteId);
          this.favoritesSubject.next(updatedFavorites);
        }
        return success;
      }),
      catchError(error => {
        console.error('Error removing from favorites:', error);
        // Fallback to mock implementation
        const currentFavorites = this.favoritesSubject.value;
        const updatedFavorites = currentFavorites.filter(fav => fav.id !== favoriteId);
        this.favoritesSubject.next(updatedFavorites);
        return of(true);
      })
    );
  }

  // Update favorite notes/tags
  updateFavorite(favoriteId: string, updates: Partial<FavoriteItem>): Observable<FavoriteItem> {
    // In a real app:
    // return this.http.patch<FavoriteItem>(`${this.apiUrl}/${favoriteId}`, updates);

    // Mock implementation
    const currentFavorites = this.favoritesSubject.value;
    const updatedFavorites = currentFavorites.map(fav =>
      fav.id === favoriteId ? { ...fav, ...updates } : fav
    );
    this.favoritesSubject.next(updatedFavorites);

    const updatedFavorite = updatedFavorites.find(fav => fav.id === favoriteId)!;
    return of(updatedFavorite);
  }

  // Get favorites statistics
  getFavoritesStats(): Observable<FavoritesStats> {
    return this.favorites$.pipe(
      map(favorites => {
        const cuisineMap = new Map<string, number>();
        const priceRangeMap = new Map<string, number>();
        let totalRating = 0;

        favorites.forEach(fav => {
          // Cuisine breakdown
          fav.restaurant.cuisineTypes.forEach(cuisine => {
            cuisineMap.set(cuisine, (cuisineMap.get(cuisine) || 0) + 1);
          });

          // Price range breakdown
          const priceRange = fav.restaurant.priceRange;
          priceRangeMap.set(priceRange, (priceRangeMap.get(priceRange) || 0) + 1);

          totalRating += fav.restaurant.averageRating;
        });

        const cuisineBreakdown = Array.from(cuisineMap.entries())
          .map(([cuisine, count]) => ({ cuisine, count }))
          .sort((a, b) => b.count - a.count);

        const priceRangeBreakdown = Array.from(priceRangeMap.entries())
          .map(([range, count]) => ({ range, count }))
          .sort((a, b) => b.count - a.count);

        const mostVisited = favorites.length > 0
          ? favorites.reduce((prev, current) =>
              current.visitCount > prev.visitCount ? current : prev
            ).restaurant
          : null;

        const recentlyAdded = favorites
          .sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime())
          .slice(0, 5);

        return {
          totalFavorites: favorites.length,
          cuisineBreakdown,
          priceRangeBreakdown,
          averageRating: favorites.length > 0 ? totalRating / favorites.length : 0,
          mostVisited,
          recentlyAdded
        };
      })
    );
  }

  // Get user's collections
  getCollections(): Observable<FavoriteCollection[]> {
    // In a real app:
    // return this.http.get<FavoriteCollection[]>(`${this.apiUrl}/collections`);

    return of(this.mockCollections);
  }

  // Create new collection
  createCollection(collection: Omit<FavoriteCollection, 'id' | 'createdAt' | 'updatedAt'>): Observable<FavoriteCollection> {
    // In a real app:
    // return this.http.post<FavoriteCollection>(`${this.apiUrl}/collections`, collection);

    const newCollection: FavoriteCollection = {
      ...collection,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const currentCollections = this.collectionsSubject.value;
    this.collectionsSubject.next([...currentCollections, newCollection]);

    return of(newCollection);
  }

  // Check if restaurant is favorited
  isFavorited(restaurantId: string): Observable<boolean> {
    // Try database first, fallback to local state
    return this.databaseService.isFavorited(restaurantId).pipe(
      catchError(error => {
        console.error('Error checking favorite status:', error);
        // Fallback to local state
        return this.favorites$.pipe(
          map(favorites => favorites.some(fav => fav.restaurant.id === restaurantId))
        );
      })
    );
  }
}
