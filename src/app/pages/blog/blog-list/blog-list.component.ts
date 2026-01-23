import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
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
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './blog-list.component.html',
  styleUrl: './blog-list.component.scss'
})
export class BlogListComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private refreshSubscription?: Subscription;

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

  ngOnDestroy(): void {
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
}

