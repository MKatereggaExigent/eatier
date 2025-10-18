import { CommunityService, FeaturedChef, CommunityPost as ServiceCommunityPost, TrendingTopic } from '../../core/services/community.service';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CommonModule } from '@angular/common';
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

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.scss']
})
export class CommunityComponent implements OnInit {
  private fb = inject(FormBuilder);
  private communityService = inject(CommunityService);

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

  // Mock data
  mockPosts: CommunityPost[] = [
    {
      id: '1',
      authorId: 'chef-1',
      authorName: 'Chef Marco Rossi',
      authorAvatar: 'https://images.unsplash.com/photo-1583394293214-28a5b0a8e8b8?w=100&h=100&fit=crop&crop=face',
      authorType: 'chef',
      content: 'Just finished creating a new pasta dish with locally sourced ingredients! The secret is in the fresh basil and homemade sauce. What do you think? 🍝',
      images: [
        'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=600&h=400&fit=crop'
      ],
      likes: 127,
      comments: 23,
      shares: 8,
      createdAt: new Date('2024-01-20T10:30:00'),
      isLiked: false,
      tags: ['pasta', 'italian', 'fresh', 'local']
    },
    {
      id: '2',
      authorId: 'business-1',
      authorName: 'Bella Italia Restaurant',
      authorAvatar: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100&h=100&fit=crop',
      authorType: 'business',
      content: 'We\'re excited to announce our new sustainable packaging initiative! All our takeout orders now come in 100% biodegradable containers. Small steps towards a greener future! 🌱',
      images: [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop'
      ],
      likes: 89,
      comments: 15,
      shares: 12,
      createdAt: new Date('2024-01-19T15:45:00'),
      isLiked: true,
      tags: ['sustainability', 'eco-friendly', 'packaging', 'green']
    },
    {
      id: '3',
      authorId: 'chef-2',
      authorName: 'Chef Sarah Kim',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108755-2616c6d4e6e8?w=100&h=100&fit=crop&crop=face',
      authorType: 'chef',
      content: 'Teaching a cooking class this weekend! We\'ll be making traditional Korean BBQ with a modern twist. Limited spots available - who\'s interested? 🥢',
      likes: 156,
      comments: 34,
      shares: 19,
      createdAt: new Date('2024-01-18T09:15:00'),
      isLiked: false,
      tags: ['cooking-class', 'korean', 'bbq', 'workshop']
    },
    {
      id: '4',
      authorId: 'user-1',
      authorName: 'Food Lover Mike',
      authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      authorType: 'user',
      content: 'Had the most amazing brunch at @BellaItalia today! The eggs benedict was perfection. Highly recommend to anyone in the area! 🍳',
      images: [
        'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600&h=400&fit=crop'
      ],
      likes: 45,
      comments: 8,
      shares: 3,
      createdAt: new Date('2024-01-17T11:20:00'),
      isLiked: true,
      tags: ['brunch', 'eggs-benedict', 'review', 'recommendation']
    }
  ];

  mockTrendingTopics = [
    '#SustainableCooking',
    '#LocalIngredients',
    '#PlantBased',
    '#FoodWaste',
    '#CookingTips',
    '#SeasonalMenu',
    '#FarmToTable',
    '#VeganRecipes'
  ];

  mockFeaturedChefs = [
    {
      id: 'chef-1',
      name: 'Chef Marco Rossi',
      avatar: 'https://images.unsplash.com/photo-1583394293214-28a5b0a8e8b8?w=100&h=100&fit=crop&crop=face',
      specialty: 'Italian Cuisine',
      followers: 12500,
      isFollowing: false
    },
    {
      id: 'chef-2',
      name: 'Chef Sarah Kim',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616c6d4e6e8?w=100&h=100&fit=crop&crop=face',
      specialty: 'Korean Fusion',
      followers: 8900,
      isFollowing: true
    },
    {
      id: 'chef-3',
      name: 'Chef David Chen',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      specialty: 'Modern Asian',
      followers: 15200,
      isFollowing: false
    }
  ];

  constructor() {
    this.postForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
      images: [''],
      tags: ['']
    });
  }

  ngOnInit(): void {
    this.loadCommunityData();
  }

  loadCommunityData(page: number = 1): void {
    this.isLoading.set(true);
    this.currentPage.set(page);

    // Load posts with pagination
    this.communityService.getPosts({ page, limit: this.pageSize() }).subscribe({
      next: (response) => {
        this.posts.set(response.posts);

        // Update pagination info from response
        const total = (response as any).total || response.posts.length;
        this.totalPosts.set(total);
        this.totalPages.set(Math.ceil(total / this.pageSize()));
        this.isLoading.set(false);

        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (error) => {
        console.error('Error loading posts:', error);
        // Fallback to mock data
        this.posts.set(this.mockPosts);
        this.totalPosts.set(this.mockPosts.length);
        this.totalPages.set(Math.ceil(this.mockPosts.length / this.pageSize()));
        this.isLoading.set(false);
      }
    });

    // Load trending topics
    this.communityService.getTrendingTopics().subscribe({
      next: (topics) => {
        this.trendingTopics.set(topics);
      },
      error: (error) => {
        console.error('Error loading trending topics:', error);
        // Fallback to mock data
        this.trendingTopics.set(this.mockTrendingTopics.map(topic => ({ name: topic, count: Math.floor(Math.random() * 1000) + 100 })));
      }
    });

    // Load featured chefs
    this.communityService.getFeaturedChefs().subscribe({
      next: (chefs) => {
        this.featuredChefs.set(chefs);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading featured chefs:', error);
        // Fallback to mock data
        this.featuredChefs.set(this.mockFeaturedChefs);
        this.isLoading.set(false);
      }
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
  }

  toggleLike(post: ServiceCommunityPost): void {
    // For now, use mock user ID - in real app, get from auth service
    const userId = 'current-user-id';

    this.communityService.togglePostLike(post.id, userId).subscribe({
      next: (response) => {
        const updatedPosts = this.posts().map(p => {
          if (p.id === post.id) {
            return {
              ...p,
              isLiked: response.isLiked,
              likes: response.likesCount
            };
          }
          return p;
        });
        this.posts.set(updatedPosts);
      },
      error: (error) => {
        console.error('Error toggling like:', error);
        // Fallback to local update
        const updatedPosts = this.posts().map(p => {
          if (p.id === post.id) {
            return {
              ...p,
              isLiked: !p.isLiked,
              likes: p.isLiked ? p.likes - 1 : p.likes + 1
            };
          }
          return p;
        });
        this.posts.set(updatedPosts);
      }
    });
  }

  sharePost(post: CommunityPost): void {
    // Mock share functionality
    if (navigator.share) {
      navigator.share({
        title: `Post by ${post.authorName}`,
        text: post.content,
        url: window.location.href
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(`${post.content} - ${window.location.href}`);
      alert('Post link copied to clipboard!');
    }

    // Update share count
    const updatedPosts = this.posts().map(p => {
      if (p.id === post.id) {
        return { ...p, shares: p.shares + 1 };
      }
      return p;
    });
    this.posts.set(updatedPosts);
  }

  followChef(chef: FeaturedChef): void {
    // For now, use mock user ID - in real app, get from auth service
    const userId = 'current-user-id';

    this.communityService.toggleChefFollow(chef.id, userId).subscribe({
      next: (response) => {
        const updatedChefs = this.featuredChefs().map(c => {
          if (c.id === chef.id) {
            return {
              ...c,
              isFollowing: response.isFollowing,
              followers: response.followersCount
            };
          }
          return c;
        });
        this.featuredChefs.set(updatedChefs);
      },
      error: (error) => {
        console.error('Error toggling chef follow:', error);
        // Fallback to local update
        const updatedChefs = this.featuredChefs().map(c => {
          if (c.id === chef.id) {
            return {
              ...c,
              isFollowing: !c.isFollowing,
              followers: c.isFollowing ? c.followers - 1 : c.followers + 1
            };
          }
          return c;
        });
        this.featuredChefs.set(updatedChefs);
      }
    });
  }

  onCreatePost(): void {
    if (this.postForm.valid) {
      this.isSubmittingPost.set(true);
      this.postSuccessMessage.set('');

      const formValue = this.postForm.value;
      const postData = {
        content: formValue.content,
        images: this.selectedImages().length > 0 ? this.selectedImages() : (formValue.images ? [formValue.images] : []),
        tags: formValue.tags ? formValue.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : [],
        authorId: 'current-user-id' // In real app, get from auth service
      };

      this.communityService.createPost(postData).subscribe({
        next: (newPost) => {
          this.posts.update(posts => [newPost, ...posts]);
          this.postForm.reset();
          this.selectedImages.set([]);
          this.isSubmittingPost.set(false);
          this.postSuccessMessage.set('✅ Post created successfully!');

          // Switch back to feed tab to show the new post
          this.activeTab.set('feed');

          // Clear success message after 3 seconds
          setTimeout(() => this.postSuccessMessage.set(''), 3000);
        },
        error: (error) => {
          console.error('Error creating post:', error);
          // Fallback to local creation
          const newPost: ServiceCommunityPost = {
            id: Date.now().toString(),
            authorId: 'current-user',
            authorName: 'You',
            authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
            authorType: 'user',
            content: formValue.content,
            images: this.selectedImages().length > 0 ? this.selectedImages() : (formValue.images ? [formValue.images] : []),
            likes: 0,
            comments: 0,
            shares: 0,
            createdAt: new Date(),
            isLiked: false,
            tags: formValue.tags ? formValue.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : []
          };

          this.posts.update(posts => [newPost, ...posts]);
          this.postForm.reset();
          this.selectedImages.set([]);
          this.isSubmittingPost.set(false);
          this.postSuccessMessage.set('✅ Post created successfully!');

          // Switch back to feed tab to show the new post
          this.activeTab.set('feed');

          // Clear success message after 3 seconds
          setTimeout(() => this.postSuccessMessage.set(''), 3000);
        }
      });
    }
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  }

  getAuthorTypeIcon(type: string): string {
    switch (type) {
      case 'chef': return '👨‍🍳';
      case 'business': return '🏢';
      default: return '👤';
    }
  }

  getAuthorTypeBadge(type: string): string {
    switch (type) {
      case 'chef': return 'Chef';
      case 'business': return 'Business';
      default: return 'Food Lover';
    }
  }

  // Image handling
  addImageUrl(): void {
    const imageUrl = this.postForm.get('images')?.value;
    if (imageUrl && imageUrl.trim()) {
      this.selectedImages.update(images => [...images, imageUrl.trim()]);
      this.postForm.patchValue({ images: '' });
    }
  }

  removeImage(index: number): void {
    this.selectedImages.update(images => images.filter((_, i) => i !== index));
  }

  // Character counter
  getCharacterCount(): number {
    return this.postForm.get('content')?.value?.length || 0;
  }

  getRemainingCharacters(): number {
    const maxLength = 1000; // Maximum characters allowed
    return maxLength - this.getCharacterCount();
  }

  isCharacterLimitExceeded(): boolean {
    return this.getRemainingCharacters() < 0;
  }

  // Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.loadCommunityData(page);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current > 3) {
        pages.push(-1); // Ellipsis
      }

      // Show pages around current
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push(-1); // Ellipsis
      }

      // Always show last page
      pages.push(total);
    }

    return pages;
  }
}
