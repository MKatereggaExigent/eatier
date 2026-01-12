import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, tap, of, debounceTime, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SearchResult {
  id: string;
  type: 'business' | 'menu_item' | 'user' | 'post';
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  link: string;
  icon: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  searchResults = signal<SearchResult[]>([]);
  isSearching = signal<boolean>(false);
  hasResults = signal<boolean>(false);

  constructor() {}

  search(query: string, limit: number = 10): Observable<SearchResponse> {
    if (!query || query.trim().length < 2) {
      this.searchResults.set([]);
      this.hasResults.set(false);
      return of({ results: [], total: 0, hasMore: false });
    }

    this.isSearching.set(true);

    return this.http.get<SearchResponse>(`${this.apiUrl}/search`, {
      params: { q: query.trim(), limit: limit.toString() }
    }).pipe(
      tap(response => {
        this.searchResults.set(response.results);
        this.hasResults.set(response.results.length > 0);
        this.isSearching.set(false);
      }),
      catchError(error => {
        console.error('Search error:', error);
        this.isSearching.set(false);
        // Return mock results for demo
        const mockResults = this.getMockResults(query);
        this.searchResults.set(mockResults);
        this.hasResults.set(mockResults.length > 0);
        return of({ results: mockResults, total: mockResults.length, hasMore: false });
      })
    );
  }

  clearSearch(): void {
    this.searchResults.set([]);
    this.hasResults.set(false);
  }

  private getMockResults(query: string): SearchResult[] {
    const q = query.toLowerCase();
    const allResults: SearchResult[] = [
      {
        id: '1',
        type: 'business',
        title: 'The Savory Kitchen',
        subtitle: 'Italian Cuisine',
        description: 'Authentic Italian restaurant with homemade pasta and wood-fired pizzas',
        imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&h=100&fit=crop',
        link: '/business/1',
        icon: '🍝'
      },
      {
        id: '2',
        type: 'business',
        title: 'Urban Brew Cafe',
        subtitle: 'Coffee & Breakfast',
        description: 'Cozy cafe serving artisan coffee and fresh breakfast',
        imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=100&h=100&fit=crop',
        link: '/business/2',
        icon: '☕'
      },
      {
        id: '3',
        type: 'business',
        title: 'Spice Route',
        subtitle: 'Indian Cuisine',
        description: 'Traditional Indian curries and tandoori specialties',
        imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=100&h=100&fit=crop',
        link: '/business/3',
        icon: '🌶️'
      },
      {
        id: '4',
        type: 'business',
        title: 'Ocean Fresh Seafood',
        subtitle: 'Seafood Restaurant',
        description: 'Fresh catch daily, sustainable seafood dining',
        imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=100&h=100&fit=crop',
        link: '/business/4',
        icon: '🦞'
      },
      {
        id: '5',
        type: 'menu_item',
        title: 'Margherita Pizza',
        subtitle: 'The Savory Kitchen',
        description: 'Fresh mozzarella, basil, tomato sauce',
        link: '/business/1/menu',
        icon: '🍕'
      },
      {
        id: '6',
        type: 'menu_item',
        title: 'Butter Chicken',
        subtitle: 'Spice Route',
        description: 'Creamy tomato curry with tender chicken',
        link: '/business/3/menu',
        icon: '🍛'
      },
      {
        id: '7',
        type: 'menu_item',
        title: 'Grilled Salmon',
        subtitle: 'Ocean Fresh Seafood',
        description: 'Atlantic salmon with seasonal vegetables',
        link: '/business/4/menu',
        icon: '🐟'
      },
      {
        id: '8',
        type: 'post',
        title: 'Best Coffee Spots in Downtown',
        subtitle: 'Community Post',
        description: 'A curated list of the best coffee shops...',
        link: '/community/post/1',
        icon: '📝'
      }
    ];

    // Filter results based on query
    return allResults.filter(result =>
      result.title.toLowerCase().includes(q) ||
      result.subtitle?.toLowerCase().includes(q) ||
      result.description?.toLowerCase().includes(q)
    ).slice(0, 8);
  }
}
