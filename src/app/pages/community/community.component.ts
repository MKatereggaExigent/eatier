import { CommunityService, FeaturedChef, CommunityPost as ServiceCommunityPost, TrendingTopic } from '../../core/services/community.service';
import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, PenSquare, Heart, MessageCircle, Share2, Star, BarChart3, TrendingUp, Tag, Trash2, Clock, Home, Flame, ChefHat, Check, FileText, Camera, Lightbulb, Lock } from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { InlineAdComponent } from '../../shared/components/ads/inline-ad/inline-ad.component';
import { RouterModule } from '@angular/router';

interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorType: 'chef' | 'business' | 'user';
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  shares: number;
  createdAt: Date;
  isLiked: boolean;
  tags: string[];
}

interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  likes: number;
  createdAt: Date;
  isLiked: boolean;
}

interface CarouselSlide {
  image: string;
  overlay: string;
}

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, LucideAngularModule, InlineAdComponent],
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.scss']
})
export class CommunityComponent implements OnInit, OnDestroy {
  // Lucide Icons
  readonly PenSquare = PenSquare;
  readonly Heart = Heart;
  readonly MessageCircle = MessageCircle;
  readonly Share2 = Share2;
  readonly Star = Star;
  readonly BarChart3 = BarChart3;
  readonly TrendingUp = TrendingUp;
  readonly Tag = Tag;
  readonly Trash2 = Trash2;
  readonly Clock = Clock;
  readonly Home = Home;
  readonly Flame = Flame;
  readonly ChefHat = ChefHat;
  readonly Check = Check;
  readonly FileText = FileText;
  readonly Camera = Camera;
  readonly Lightbulb = Lightbulb;
  readonly Lock = Lock;
  private fb = inject(FormBuilder);
  private communityService = inject(CommunityService);
  private authService = inject(AuthService);

  // Auth state
  currentUser = this.authService.currentUser;
  isAuthenticated = this.authService.isAuthenticated;

  // Carousel
  currentSlide = signal<number>(0);
  private carouselInterval: any;

  carouselSlides: CarouselSlide[] = [
    {
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&h=900&fit=crop',
      overlay: 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.5) 50%, rgba(15,23,42,0.4) 100%)'
    },
    {
      image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=1600&h=900&fit=crop',
      overlay: 'linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(15,23,42,0.45) 50%, rgba(15,23,42,0.35) 100%)'
    },
    {
      image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=1600&h=900&fit=crop',
      overlay: 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.5) 50%, rgba(15,23,42,0.4) 100%)'
    },
    {
      image: 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1600&h=900&fit=crop',
      overlay: 'linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(15,23,42,0.45) 50%, rgba(15,23,42,0.35) 100%)'
    },
    {
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&h=900&fit=crop',
      overlay: 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.5) 50%, rgba(15,23,42,0.4) 100%)'
    }
  ];

  // State management
  posts = signal<ServiceCommunityPost[]>([]);
  trendingTopics = signal<TrendingTopic[]>([]);
  featuredChefs = signal<FeaturedChef[]>([]);
  isLoading = signal<boolean>(false);
  activeTab = signal<string>('feed');
  isSubmittingPost = signal<boolean>(false);
  postSuccessMessage = signal<string>('');
  selectedImages = signal<string[]>([]);

  // Pagination state
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  pageSize = signal<number>(10);
  totalPosts = signal<number>(0);

  // Forms
  postForm: FormGroup;

  // Expose Math to template
  Math = Math;

  constructor() {
    this.postForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
      images: [''],
      tags: ['']
    });
  }

  ngOnInit(): void {
    this.startCarousel();
    this.loadCommunityData();
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
  }

  loadCommunityData(page: number = 1): void {
    this.isLoading.set(true);
    this.currentPage.set(page);

    this.communityService.getPosts({ page, limit: this.pageSize() }).subscribe({
      next: (response) => {
        this.posts.set(response.posts);
        const total = (response as any).total || response.posts.length;
        this.totalPosts.set(total);
        this.totalPages.set(Math.ceil(total / this.pageSize()));
        this.isLoading.set(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (error) => {
        console.error('Error loading posts:', error);
        this.posts.set([]);
        this.totalPosts.set(0);
        this.totalPages.set(1);
        this.isLoading.set(false);
      }
    });

    this.communityService.getTrendingTopics().subscribe({
      next: (topics) => { this.trendingTopics.set(topics); },
      error: (error) => { console.error('Error loading trending topics:', error); this.trendingTopics.set([]); }
    });

    this.communityService.getFeaturedChefs().subscribe({
      next: (chefs) => { this.featuredChefs.set(chefs); },
      error: (error) => { console.error('Error loading featured chefs:', error); this.featuredChefs.set([]); }
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
  }

  toggleLike(post: ServiceCommunityPost): void {
    const userId = 'current-user-id';
    this.communityService.togglePostLike(post.id, userId).subscribe({
      next: (response) => {
        const updatedPosts = this.posts().map(p => {
          if (p.id === post.id) {
            return { ...p, isLiked: response.isLiked, likes: response.likesCount };
          }
          return p;
        });
        this.posts.set(updatedPosts);
      },
      error: (error) => {
        console.error('Error toggling like:', error);
        const updatedPosts = this.posts().map(p => {
          if (p.id === post.id) {
            return { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 };
          }
          return p;
        });
        this.posts.set(updatedPosts);
      }
    });
  }

  sharePost(post: CommunityPost): void {
    if (navigator.share) {
      navigator.share({ title: `Post by ${post.authorName}`, text: post.content, url: window.location.href });
    } else {
      navigator.clipboard.writeText(`${post.content} - ${window.location.href}`);
      alert('Post link copied to clipboard!');
    }
    const updatedPosts = this.posts().map(p => {
      if (p.id === post.id) { return { ...p, shares: p.shares + 1 }; }
      return p;
    });
    this.posts.set(updatedPosts);
  }

  followChef(chef: FeaturedChef): void {
    const userId = 'current-user-id';
    this.communityService.toggleChefFollow(chef.id, userId).subscribe({
      next: (response) => {
        const updatedChefs = this.featuredChefs().map(c => {
          if (c.id === chef.id) { return { ...c, isFollowing: response.isFollowing, followers: response.followersCount }; }
          return c;
        });
        this.featuredChefs.set(updatedChefs);
      },
      error: (error) => {
        console.error('Error toggling chef follow:', error);
        const updatedChefs = this.featuredChefs().map(c => {
          if (c.id === chef.id) { return { ...c, isFollowing: !c.isFollowing, followers: c.isFollowing ? c.followers - 1 : c.followers + 1 }; }
          return c;
        });
        this.featuredChefs.set(updatedChefs);
      }
    });
  }

  onCreatePost(): void {
    const user = this.currentUser();
    if (!user || !user.id) {
      this.postSuccessMessage.set('Please log in to create a post.');
      setTimeout(() => this.postSuccessMessage.set(''), 5000);
      return;
    }

    if (this.postForm.valid) {
      this.isSubmittingPost.set(true);
      this.postSuccessMessage.set('');

      const formValue = this.postForm.value;
      const postData = {
        content: formValue.content,
        images: this.selectedImages().length > 0 ? this.selectedImages() : (formValue.images ? [formValue.images] : []),
        tags: formValue.tags ? formValue.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : [],
        authorId: user.id
      };

      this.communityService.createPost(postData).subscribe({
        next: (newPost) => {
          this.posts.update(posts => [newPost, ...posts]);
          this.postForm.reset();
          this.selectedImages.set([]);
          this.isSubmittingPost.set(false);
          this.postSuccessMessage.set('Post created successfully!');
          this.activeTab.set('feed');
          setTimeout(() => this.postSuccessMessage.set(''), 3000);
        },
        error: (error) => {
          console.error('Error creating post:', error);
          this.isSubmittingPost.set(false);
          this.postSuccessMessage.set('Failed to create post. Please try again.');
          setTimeout(() => this.postSuccessMessage.set(''), 5000);
        }
      });
    }
  }

  formatDate(date: Date | string): string {
    const now = new Date();
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) { return 'Unknown'; }
    const diffInHours = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) { return 'Just now'; }
    else if (diffInHours < 24) { return `${diffInHours}h ago`; }
    else { const diffInDays = Math.floor(diffInHours / 24); return `${diffInDays}d ago`; }
  }

  getAuthorTypeBadge(type: string): string {
    switch (type) {
      case 'chef': return 'Chef';
      case 'business': return 'Business';
      default: return 'Food Lover';
    }
  }

  addImageUrl(): void {
    const imageUrl = this.postForm.get('images')?.value;
    if (imageUrl && imageUrl.trim()) {
      this.selectedImages.update(images => [...images, imageUrl.trim()]);
      this.postForm.patchValue({ images: '' });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e: ProgressEvent<FileReader>) => {
            if (e.target?.result) {
              this.selectedImages.update(images => [...images, e.target!.result as string]);
            }
          };
          reader.readAsDataURL(file);
        }
      });
      input.value = '';
    }
  }

  removeImage(index: number): void {
    this.selectedImages.update(images => images.filter((_, i) => i !== index));
  }

  getCharacterCount(): number {
    return this.postForm.get('content')?.value?.length || 0;
  }

  getRemainingCharacters(): number {
    return 1000 - this.getCharacterCount();
  }

  isCharacterLimitExceeded(): boolean {
    return this.getRemainingCharacters() < 0;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) { this.loadCommunityData(page); }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) { this.goToPage(this.currentPage() + 1); }
  }

  previousPage(): void {
    if (this.currentPage() > 1) { this.goToPage(this.currentPage() - 1); }
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    if (total <= 7) { for (let i = 1; i <= total; i++) { pages.push(i); } }
    else {
      pages.push(1);
      if (current > 3) { pages.push(-1); }
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) { pages.push(i); }
      if (current < total - 2) { pages.push(-1); }
      pages.push(total);
    }
    return pages;
  }
}