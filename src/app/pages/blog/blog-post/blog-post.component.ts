import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../../environments/environment';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  category: string;
  tags: string[];
  is_featured: boolean;
  view_count: number;
  like_count: number;
  published_at: string;
  author_name: string;
  author_avatar: string;
  author_bio: string;
  user_liked: boolean;
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string;
  category: string;
  published_at: string;
  author_name: string;
}

@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog-post.component.html',
  styleUrl: './blog-post.component.scss'
})
export class BlogPostComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  
  post = signal<BlogPost | null>(null);
  relatedPosts = signal<RelatedPost[]>([]);
  
  loading = signal(true);
  error = signal<string | null>(null);
  liked = signal(false);
  likeCount = signal(0);
  
  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['slug']) {
        this.loadPost(params['slug']);
      }
    });
  }
  
  loadPost(slug: string): void {
    this.loading.set(true);
    this.error.set(null);
    
    this.http.get<any>(`${environment.apiUrl}/blog/${slug}`).subscribe({
      next: (response) => {
        this.post.set(response.post);
        this.liked.set(response.post.user_liked);
        this.likeCount.set(response.post.like_count);
        this.loading.set(false);
        this.loadRelatedPosts(slug);
      },
      error: (err) => {
        console.error('Error loading blog post:', err);
        this.error.set(err.status === 404 ? 'Article not found' : 'Failed to load article');
        this.loading.set(false);
      }
    });
  }
  
  loadRelatedPosts(slug: string): void {
    this.http.get<any>(`${environment.apiUrl}/blog/related/${slug}`).subscribe({
      next: (response) => {
        this.relatedPosts.set(response.posts);
      }
    });
  }
  
  getSafeContent(): SafeHtml {
    const content = this.post()?.content || '';
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }
  
  toggleLike(): void {
    const currentPost = this.post();
    if (!currentPost) return;
    
    this.http.post<any>(`${environment.apiUrl}/blog/${currentPost.slug}/like`, {}).subscribe({
      next: (response) => {
        this.liked.set(response.liked);
        this.likeCount.set(response.like_count);
      },
      error: (err) => {
        if (err.status === 401) {
          // TODO: Redirect to login or show login modal
          alert('Please login to like articles');
        }
      }
    });
  }
  
  sharePost(platform: string): void {
    const post = this.post();
    if (!post) return;
    
    const url = window.location.href;
    const text = `${post.title} - Itiyum Blog`;
    
    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(post.title)}`,
      copy: url
    };
    
    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    } else {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  }
  
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  getReadingTime(): number {
    const content = this.post()?.content || '';
    const wordsPerMinute = 200;
    const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  }
}

