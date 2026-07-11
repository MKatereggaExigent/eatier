import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InlineAdComponent } from '../../../shared/components/ads/inline-ad/inline-ad.component';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule, Search, BarChart3, BookOpen, Eye, Heart, Clock, ChefHat, Newspaper, Lightbulb, Star, Rocket, TrendingUp, Cpu, Leaf, Smartphone, Briefcase, Package, ArrowUp, ArrowDown, Users, DollarSign } from 'lucide-angular';
import { environment } from '../../../../environments/environment';
import { interval, Subscription } from 'rxjs';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string;
  category: string;
  tags: string[];
  is_featured: boolean;
  view_count: number;
  like_count: number;
  published_at: string;
  author_name: string;
  author_avatar: string;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  post_count: number;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  category: string;
  tags: string[];
  is_breaking: boolean;
  priority: number;
  published_at: string;
}

interface IndustryTrend {
  id: string;
  trend_name: string;
  trend_type: string;
  description: string;
  current_value: number;
  previous_value: number;
  percentage_change: number;
  unit: string;
  icon: string;
}

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule, InlineAdComponent],
  templateUrl: './blog-list.component.html',
  styleUrl: './blog-list.component.scss'
})
export class BlogListComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private refreshSubscription?: Subscription;
  private carouselInterval: any;

  // Lucide Icons
  readonly Search = Search;
  readonly BarChart3 = BarChart3;
  readonly BookOpen = BookOpen;
  readonly Eye = Eye;
  readonly Heart = Heart;
  readonly Clock = Clock;
  readonly ChefHat = ChefHat;
  readonly Newspaper = Newspaper;
  readonly Lightbulb = Lightbulb;
  readonly Star = Star;
  readonly Rocket = Rocket;
  readonly TrendingUp = TrendingUp;
  readonly Cpu = Cpu;
  readonly Leaf = Leaf;
  readonly Smartphone = Smartphone;
  readonly Briefcase = Briefcase;
  readonly Package = Package;
  readonly ArrowUp = ArrowUp;
  readonly ArrowDown = ArrowDown;
  readonly Users = Users;
  readonly DollarSign = DollarSign;

  // Carousel
  currentSlide = signal<number>(0);

  carouselSlides = [
    {
      image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1600&h=900&fit=crop',
      overlay: 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.5) 50%, rgba(15,23,42,0.4) 100%)'
    },
    {
      image: 'https://images.unsplash.com/photo-1504711434969-e33886168d2c?w=1600&h=900&fit=crop',
      overlay: 'linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(15,23,42,0.45) 50%, rgba(15,23,42,0.35) 100%)'
    },
    {
      image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1600&h=900&fit=crop',
      overlay: 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.5) 50%, rgba(15,23,42,0.4) 100%)'
    },
    {
      image: 'https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=1600&h=900&fit=crop',
      overlay: 'linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(15,23,42,0.45) 50%, rgba(15,23,42,0.35) 100%)'
    },
    {
      image: 'https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=1600&h=900&fit=crop',
      overlay: 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.5) 50%, rgba(15,23,42,0.4) 100%)'
    }
  ];

  posts = signal<BlogPost[]>([]);
  featuredPosts = signal<BlogPost[]>([]);
  categories = signal<BlogCategory[]>([]);

  // Real-time news feed
  newsItems = signal<NewsItem[]>([]);
  industryTrends = signal<IndustryTrend[]>([]);
  newsLoading = signal(false);
  currentNewsIndex = signal(0);

  loading = signal(true);
  error = signal<string | null>(null);

  // Filters
  selectedCategory = signal<string>('');
  searchQuery = signal('');

  // Pagination
  currentPage = signal(1);
  totalPages = signal(1);
  totalPosts = signal(0);
  
  ngOnInit(): void {
    this.startCarousel();

    // Check for category in route params
    this.route.queryParams.subscribe(params => {
      if (params['category']) {
        this.selectedCategory.set(params['category']);
      }
      this.loadPosts();
    });

    this.loadCategories();
    this.loadFeaturedPosts();

    // Load real-time industry news feed
    this.loadIndustryNews();
    this.loadIndustryTrends();

    // Auto-refresh news every 5 minutes
    this.refreshSubscription = interval(300000).subscribe(() => {
      this.loadIndustryNews();
    });

    // Rotate news ticker every 5 seconds
    interval(5000).subscribe(() => {
      if (this.newsItems().length > 0) {
        this.currentNewsIndex.set((this.currentNewsIndex() + 1) % this.newsItems().length);
      }
    });
  }

  startCarousel(): void {
    this.carouselInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  stopCarousel(): void {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  nextSlide(): void {
    this.currentSlide.update(current =>
      current === this.carouselSlides.length - 1 ? 0 : current + 1
    );
  }

  prevSlide(): void {
    this.currentSlide.update(current =>
      current === 0 ? this.carouselSlides.length - 1 : current - 1
    );
  }

  goToSlide(index: number): void {
    this.currentSlide.set(index);
  }

  ngOnDestroy(): void {
    this.stopCarousel();
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadIndustryNews(): void {
    this.newsLoading.set(true);
    this.http.get<any>(`${environment.apiUrl}/industry-news`, {
      params: { limit: '10' }
    }).subscribe({
      next: (response) => {
        this.newsItems.set(response.news || []);
        this.newsLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading industry news:', err);
        this.newsLoading.set(false);
      }
    });
  }

  loadIndustryTrends(): void {
    this.http.get<any>(`${environment.apiUrl}/industry-news/trends`).subscribe({
      next: (response) => {
        this.industryTrends.set(response.trends || []);
      },
      error: (err) => {
        console.error('Error loading industry trends:', err);
      }
    });
  }

  trackNewsClick(newsId: string, url: string): void {
    this.http.post(`${environment.apiUrl}/industry-news/${newsId}/click`, {}).subscribe();
    window.open(url, '_blank');
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
  
  loadPosts(): void {
    this.loading.set(true);
    this.error.set(null);
    
    const params: any = {
      page: this.currentPage(),
      limit: 9
    };
    
    if (this.selectedCategory()) {
      params.category = this.selectedCategory();
    }
    
    if (this.searchQuery()) {
      params.search = this.searchQuery();
    }
    
    this.http.get<any>(`${environment.apiUrl}/blog`, { params }).subscribe({
      next: (response) => {
        this.posts.set(response.posts);
        this.totalPages.set(response.pagination.totalPages);
        this.totalPosts.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading blog posts:', err);
        this.error.set('Failed to load blog posts');
        this.loading.set(false);
      }
    });
  }
  
  loadFeaturedPosts(): void {
    this.http.get<any>(`${environment.apiUrl}/blog`, { 
      params: { featured: 'true', limit: 3 } 
    }).subscribe({
      next: (response) => {
        this.featuredPosts.set(response.posts);
      }
    });
  }
  
  loadCategories(): void {
    this.http.get<any>(`${environment.apiUrl}/blog/categories`).subscribe({
      next: (response) => {
        this.categories.set(response.categories);
      }
    });
  }
  
  onCategoryChange(category: string): void {
    this.selectedCategory.set(category);
    this.currentPage.set(1);
    this.loadPosts();
  }
  
  onSearch(): void {
    this.currentPage.set(1);
    this.loadPosts();
  }
  
  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadPosts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  getReadingTime(excerpt: string): number {
    const wordsPerMinute = 200;
    const words = (excerpt || '').split(/\s+/).length * 5; // Estimate full content
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  }

  onImageError(event: Event): void {
    // Hide the broken image - the CSS gradient background will show instead
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  // Helper method to get category icon
  getCategoryIcon(categoryName: string) {
    switch (categoryName?.toLowerCase()) {
      case 'food & recipes':
      case 'food and recipes':
        return this.ChefHat;
      case 'restaurant news':
        return this.Newspaper;
      case 'tips & guides':
      case 'tips and guides':
        return this.Lightbulb;
      case 'success stories':
        return this.Star;
      case 'platform updates':
        return this.Rocket;
      case 'industry trends':
        return this.TrendingUp;
      case 'technology':
        return this.Cpu;
      case 'sustainability':
        return this.Leaf;
      case 'marketing':
        return this.Smartphone;
      case 'business growth':
        return this.Briefcase;
      default:
        return this.BookOpen;
    }
  }

  // Helper method to get trend icon
  getTrendIcon(trendType: string) {
    switch (trendType?.toLowerCase()) {
      case 'food delivery':
      case 'delivery':
        return this.Package;
      case 'ai':
      case 'technology':
      case 'ai adoption':
        return this.Cpu;
      case 'sustainability':
      case 'green':
        return this.Leaf;
      case 'revenue':
      case 'sales':
      case 'check size':
        return this.DollarSign;
      case 'staff':
      case 'turnover':
      case 'workforce':
        return this.Users;
      default:
        return this.TrendingUp;
    }
  }
}

