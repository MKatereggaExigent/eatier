import { Injectable, inject, signal } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
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
  isOpen?: boolean;
  distance?: number;
}

export interface FavoriteItem {
  id: string;
  businessId: string;
  restaurant: Restaurant;
  notes?: string;
  tags: string[];
  addedAt: Date;
  visitCount: number;
  lastVisited?: Date;
  isPublic: boolean;
  rating?: number;
}

export interface FavoriteCollection {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  favoriteIds: string[];
  createdAt: Date;
  updatedAt: Date;
  coverImageUrl?: string;
  itemCount?: number;
}

export interface FavoritesStats {
  totalFavorites: number;
  cuisineBreakdown: { cuisine: string; count: number }[];
  priceRangeBreakdown: { range: string; count: number }[];
  averageRating: number;
  mostVisited: Restaurant | null;
  recentlyAdded: FavoriteItem[];
}

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private apiService = inject(ApiService);

  // State management
  private favoritesSubject = new BehaviorSubject<FavoriteItem[]>([]);
  private collectionsSubject = new BehaviorSubject<FavoriteCollection[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  // Public observables
  favorites$ = this.favoritesSubject.asObservable();
  collections$ = this.collectionsSubject.asObservable();
  isLoading$ = this.isLoadingSubject.asObservable();

  constructor() {
    this.loadUserFavorites();
    this.loadUserCollections();
  }

  private loadUserFavorites(): void {
    const userId = localStorage.getItem('user_id') || 'temp-user';
    this.isLoadingSubject.next(true);

    this.apiService.get<any>(`favorites/${userId}`).subscribe({
      next: (response) => {
        const favorites = response.favorites?.map((fav: any) => this.transformFavorite(fav)) || [];
        this.favoritesSubject.next(favorites);
        this.isLoadingSubject.next(false);
      },
      error: (error) => {
        console.error('Error loading favorites:', error);
        this.favoritesSubject.next([]);
        this.isLoadingSubject.next(false);
      }
    });
  }

  private loadUserCollections(): void {
    const userId = localStorage.getItem('user_id') || 'temp-user';

    this.apiService.get<any>(`favorites/collections/${userId}`).subscribe({
      next: (response) => {
        const collections = response.collections?.map((col: any) => this.transformCollection(col)) || [];
        this.collectionsSubject.next(collections);
      },
      error: (error) => {
        console.error('Error loading collections:', error);
        this.collectionsSubject.next([]);
      }
    });
  }

  private transformFavorite(fav: any): FavoriteItem {
    return {
      id: fav.id,
      businessId: fav.business_id,
      restaurant: this.transformBusinessToRestaurant(fav.business),
      notes: fav.notes,
      tags: fav.tags || [],
      addedAt: new Date(fav.added_at),
      visitCount: fav.visit_count || 0,
      lastVisited: fav.last_visited ? new Date(fav.last_visited) : undefined,
      isPublic: fav.is_public || false,
      rating: fav.rating
    };
  }

  private transformCollection(col: any): FavoriteCollection {
    return {
      id: col.id,
      name: col.name,
      description: col.description,
      isPublic: col.is_public || false,
      favoriteIds: col.favorite_ids || [],
      createdAt: new Date(col.created_at),
      updatedAt: new Date(col.updated_at)
    };
  }

  private transformBusinessToRestaurant(business: any): Restaurant {
    return {
      id: business.id,
      name: business.name,
      slug: business.slug || business.name.toLowerCase().replace(/\s+/g, '-'),
      description: business.description || '',
      cuisineTypes: business.cuisine_types || [],
      priceRange: business.price_range || 'moderate',
      averageRating: business.average_rating || 0,
      totalReviews: business.total_reviews || 0,
      imageUrl: business.image_url || '',
      address: business.address || '',
      city: business.city || '',
      state: business.state || '',
      phone: business.phone || '',
      email: business.email || '',
      website: business.website
    };
  }

  addToFavorites(restaurantId: string, notes?: string, tags?: string[]): Observable<FavoriteItem> {
    const userId = localStorage.getItem('user_id') || 'temp-user';

    const payload = {
      userId,
      businessId: restaurantId,
      notes,
      tags
    };

    return this.apiService.post<any>('favorites', payload).pipe(
      map(response => this.transformFavorite(response)),
      tap(favorite => {
        const currentFavorites = this.favoritesSubject.value;
        this.favoritesSubject.next([...currentFavorites, favorite]);
      }),
      catchError(error => {
        console.error('Error adding to favorites:', error);
        throw error;
      })
    );
  }

  removeFromFavorites(favoriteId: string): Observable<boolean> {
    return this.apiService.delete(`favorites/${favoriteId}`).pipe(
      map(() => true),
      tap(() => {
        const currentFavorites = this.favoritesSubject.value;
        const updatedFavorites = currentFavorites.filter(fav => fav.id !== favoriteId);
        this.favoritesSubject.next(updatedFavorites);
      }),
      catchError(error => {
        console.error('Error removing from favorites:', error);
        return of(false);
      })
    );
  }

  updateFavoriteNotes(favoriteId: string, notes: string): Observable<boolean> {
    return this.apiService.patch(`favorites/${favoriteId}`, { notes }).pipe(
      map(() => true),
      tap(() => {
        const currentFavorites = this.favoritesSubject.value;
        const updatedFavorites = currentFavorites.map(fav =>
          fav.id === favoriteId ? { ...fav, notes } : fav
        );
        this.favoritesSubject.next(updatedFavorites);
      }),
      catchError(error => {
        console.error('Error updating favorite notes:', error);
        return of(false);
      })
    );
  }

  updateFavorite(favoriteId: string, updates: Partial<FavoriteItem>): Observable<FavoriteItem> {
    return this.apiService.patch(`favorites/${favoriteId}`, updates).pipe(
      map(response => this.transformFavorite(response)),
      tap(updatedFavorite => {
        const currentFavorites = this.favoritesSubject.value;
        const updatedFavorites = currentFavorites.map(fav =>
          fav.id === favoriteId ? updatedFavorite : fav
        );
        this.favoritesSubject.next(updatedFavorites);
      }),
      catchError(error => {
        console.error('Error updating favorite:', error);
        throw error;
      })
    );
  }

  createCollection(collection: Omit<FavoriteCollection, 'id' | 'createdAt' | 'updatedAt'>): Observable<FavoriteCollection> {
    const userId = localStorage.getItem('user_id') || 'temp-user';

    const payload = {
      userId,
      name: collection.name,
      description: collection.description,
      isPublic: collection.isPublic
    };

    return this.apiService.post<any>('favorites/collections', payload).pipe(
      map(response => this.transformCollection(response)),
      tap(newCollection => {
        const currentCollections = this.collectionsSubject.value;
        this.collectionsSubject.next([...currentCollections, newCollection]);
      }),
      catchError(error => {
        console.error('Error creating collection:', error);
        throw error;
      })
    );
  }

  isFavorite(restaurantId: string): boolean {
    const favorites = this.favoritesSubject.value;
    return favorites.some(fav => fav.businessId === restaurantId);
  }

  getFavoritesStats(): Observable<FavoritesStats> {
    return this.favorites$.pipe(
      map(favorites => {
        const cuisineMap = new Map<string, number>();
        const priceRangeMap = new Map<string, number>();
        let totalRating = 0;

        favorites.forEach(fav => {
          fav.restaurant.cuisineTypes.forEach(cuisine => {
            cuisineMap.set(cuisine, (cuisineMap.get(cuisine) || 0) + 1);
          });

          const priceRange = fav.restaurant.priceRange;
          priceRangeMap.set(priceRange, (priceRangeMap.get(priceRange) || 0) + 1);

          totalRating += fav.restaurant.averageRating;
        });

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
          cuisineBreakdown: Array.from(cuisineMap.entries()).map(([cuisine, count]) => ({ cuisine, count })),
          priceRangeBreakdown: Array.from(priceRangeMap.entries()).map(([range, count]) => ({ range, count })),
          averageRating: favorites.length > 0 ? totalRating / favorites.length : 0,
          mostVisited,
          recentlyAdded
        };
      })
    );
  }

  getCollections(): Observable<FavoriteCollection[]> {
    return this.collections$;
  }
}
