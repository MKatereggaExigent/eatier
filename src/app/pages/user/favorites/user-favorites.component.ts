import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Heart, UtensilsCrossed, Eye, Calendar, FileText, Edit, Trash2, SlidersHorizontal, Search, X, Folder, Plus, LayoutGrid, List, Star } from 'lucide-angular';
import { FavoritesService, FavoriteItem, FavoritesStats, FavoriteCollection, Restaurant } from '../../../services/favorites.service';
import { AuthService } from '../../../core/services/auth.service';

interface ViewMode {
  type: 'grid' | 'list';
  label: string;
  icon: any;
}

interface SortOption {
  value: string;
  label: string;
}

interface FilterOptions {
  cuisine: string;
  priceRange: string;
  rating: string;
  tags: string[];
  sortBy: string;
}

@Component({
  selector: 'app-user-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './user-favorites.component.html',
  styleUrls: ['./user-favorites.component.scss']
})
export class UserFavoritesComponent implements OnInit {
  private favoritesService = inject(FavoritesService);
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;

  // Lucide Icons
  readonly Heart = Heart;
  readonly UtensilsCrossed = UtensilsCrossed;
  readonly Eye = Eye;
  readonly Calendar = Calendar;
  readonly FileText = FileText;
  readonly Edit = Edit;
  readonly Trash2 = Trash2;
  readonly SlidersHorizontal = SlidersHorizontal;
  readonly Search = Search;
  readonly X = X;
  readonly Folder = Folder;
  readonly Plus = Plus;
  readonly LayoutGrid = LayoutGrid;
  readonly List = List;
  readonly Star = Star;

  // State management
  isLoading = signal(false);
  favorites = signal<FavoriteItem[]>([]);
  collections = signal<FavoriteCollection[]>([]);
  stats = signal<FavoritesStats | null>(null);
  selectedFavorite = signal<FavoriteItem | null>(null);

  // UI state
  viewMode = signal<ViewMode>({ type: 'grid', label: 'Grid View', icon: LayoutGrid });
  searchQuery = signal('');
  showFilters = signal(false);
  showNewCollectionModal = signal(false);
  showEditNotesModal = signal(false);
  showDeleteConfirm = signal(false);

  // Filter and sort options
  filters = signal<FilterOptions>({
    cuisine: 'all',
    priceRange: 'all',
    rating: 'all',
    tags: [],
    sortBy: 'recent'
  });

  // Available options
  viewModes: ViewMode[] = [
    { type: 'grid', label: 'Grid View', icon: LayoutGrid },
    { type: 'list', label: 'List View', icon: List }
  ];

  sortOptions: SortOption[] = [
    { value: 'recent', label: 'Recently Added' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'visits', label: 'Most Visited' },
    { value: 'distance', label: 'Nearest' }
  ];

  cuisineOptions = [
    'All Cuisines', 'Italian', 'Japanese', 'American', 'Mexican', 'Chinese',
    'French', 'Indian', 'Thai', 'Mediterranean', 'Korean'
  ];

  priceRangeOptions = [
    { value: 'all', label: 'All Price Ranges' },
    { value: 'budget', label: '$ Budget' },
    { value: 'moderate', label: '$$ Moderate' },
    { value: 'expensive', label: '$$$ Expensive' },
    { value: 'fine_dining', label: '$$$$ Fine Dining' }
  ];

  // Computed properties
  filteredFavorites = computed(() => {
    let filtered = this.favorites();
    const query = this.searchQuery().toLowerCase();
    const currentFilters = this.filters();

    // Search filter
    if (query) {
      filtered = filtered.filter(fav =>
        fav.restaurant.name.toLowerCase().includes(query) ||
        fav.restaurant.description.toLowerCase().includes(query) ||
        fav.restaurant.cuisineTypes.some(cuisine =>
          cuisine.toLowerCase().includes(query)
        ) ||
        fav.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Cuisine filter
    if (currentFilters.cuisine !== 'all') {
      filtered = filtered.filter(fav =>
        fav.restaurant.cuisineTypes.includes(currentFilters.cuisine)
      );
    }

    // Price range filter
    if (currentFilters.priceRange !== 'all') {
      filtered = filtered.filter(fav =>
        fav.restaurant.priceRange === currentFilters.priceRange
      );
    }

    // Rating filter
    if (currentFilters.rating !== 'all') {
      const minRating = parseInt(currentFilters.rating);
      filtered = filtered.filter(fav =>
        fav.restaurant.averageRating >= minRating
      );
    }

    // Sort
    switch (currentFilters.sortBy) {
      case 'name':
        filtered.sort((a, b) => a.restaurant.name.localeCompare(b.restaurant.name));
        break;
      case 'rating':
        filtered.sort((a, b) => b.restaurant.averageRating - a.restaurant.averageRating);
        break;
      case 'visits':
        filtered.sort((a, b) => b.visitCount - a.visitCount);
        break;
      case 'distance':
        filtered.sort((a, b) => ((a.restaurant as any).distance || 0) - ((b.restaurant as any).distance || 0));
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
        break;
    }

    return filtered;
  });

  hasActiveFilters = computed(() => {
    const currentFilters = this.filters();
    return currentFilters.cuisine !== 'all' ||
           currentFilters.priceRange !== 'all' ||
           currentFilters.rating !== 'all' ||
           currentFilters.tags.length > 0 ||
           this.searchQuery().length > 0;
  });

  ngOnInit() {
    // Initialize favorites service for authenticated user
    this.favoritesService.initializeFavorites();

    this.loadFavorites();
    this.loadCollections();
    this.loadStats();
  }

  // Data loading methods
  loadFavorites(): void {
    this.isLoading.set(true);
    this.favoritesService.favorites$.subscribe({
      next: (favorites: any[]) => {
        this.favorites.set(favorites);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading favorites:', error);
        this.isLoading.set(false);
      }
    });
  }

  loadCollections(): void {
    this.favoritesService.getCollections().subscribe({
      next: (collections) => {
        this.collections.set(collections);
      },
      error: (error) => {
        console.error('Error loading collections:', error);
      }
    });
  }

  loadStats(): void {
    this.favoritesService.getFavoritesStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
      },
      error: (error) => {
        console.error('Error loading stats:', error);
      }
    });
  }

  // UI action methods
  toggleViewMode(): void {
    const current = this.viewMode();
    const newMode = current.type === 'grid' ? this.viewModes[1] : this.viewModes[0];
    this.viewMode.set(newMode);
  }

  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  clearFilters(): void {
    this.filters.set({
      cuisine: 'all',
      priceRange: 'all',
      rating: 'all',
      tags: [],
      sortBy: 'recent'
    });
    this.searchQuery.set('');
  }

  updateFilter(key: keyof FilterOptions, value: any): void {
    const currentFilters = this.filters();
    this.filters.set({ ...currentFilters, [key]: value });
  }

  // Favorite management methods
  removeFromFavorites(favorite: FavoriteItem): void {
    this.selectedFavorite.set(favorite);
    this.showDeleteConfirm.set(true);
  }

  confirmRemoveFavorite(): void {
    const favorite = this.selectedFavorite();
    if (favorite) {
      this.favoritesService.removeFromFavorites(favorite.id).subscribe({
        next: () => {
          this.loadFavorites();
          this.loadStats();
          this.showDeleteConfirm.set(false);
          this.selectedFavorite.set(null);
        },
        error: (error) => {
          console.error('Error removing favorite:', error);
        }
      });
    }
  }

  editNotes(favorite: FavoriteItem): void {
    this.selectedFavorite.set(favorite);
    this.showEditNotesModal.set(true);
  }

  updateNotes(notes: string): void {
    const favorite = this.selectedFavorite();
    if (favorite) {
      this.favoritesService.updateFavorite(favorite.id, { notes }).subscribe({
        next: () => {
          this.loadFavorites();
          this.showEditNotesModal.set(false);
          this.selectedFavorite.set(null);
        },
        error: (error) => {
          console.error('Error updating notes:', error);
        }
      });
    }
  }

  // Utility methods
  getPriceRangeDisplay(priceRange: string): string {
    const ranges = {
      'budget': 'R',
      'moderate': 'RR',
      'expensive': 'RRR',
      'fine_dining': 'RRRR'
    };
    return ranges[priceRange as keyof typeof ranges] || priceRange;
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  getStarArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i < Math.round(rating) ? 1 : 0);
  }

  // Modal methods
  closeModal(): void {
    this.showNewCollectionModal.set(false);
    this.showEditNotesModal.set(false);
    this.showDeleteConfirm.set(false);
    this.selectedFavorite.set(null);
  }

  // Navigation methods
  viewRestaurant(restaurant: Restaurant): void {
    // Navigate to restaurant detail page
    // this.router.navigate(['/restaurants', restaurant.slug]);
    console.log('Navigate to restaurant:', restaurant.slug);
  }

  makeReservation(restaurant: Restaurant): void {
    // Navigate to booking page
    console.log('Make reservation at:', restaurant.name);
  }
}
