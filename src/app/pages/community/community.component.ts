import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommunityService, CommunityPost as ServiceCommunityPost, FeaturedChef, TrendingTopic } from '../../core/services/community.service';

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
      content: ['', [Validators.required, Validators.minLength(10)]],
      images: [''],
      tags: ['']
    });
  }

  ngOnInit(): void {
    this.loadCommunityData();
  }

  loadCommunityData(): void {
    this.isLoading.set(true);

    // Load posts
    this.communityService.getPosts({ page: 1, limit: 10 }).subscribe({
      next: (response) => {
        this.posts.set(response.posts);
      },
      error: (error) => {
        console.error('Error loading posts:', error);
        // Fallback to mock data
        this.posts.set(this.mockPosts);
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
      const formValue = this.postForm.value;
      const postData = {
        content: formValue.content,
        images: formValue.images ? [formValue.images] : [],
        tags: formValue.tags ? formValue.tags.split(',').map((tag: string) => tag.trim()) : [],
        authorId: 'current-user-id' // In real app, get from auth service
      };

      this.communityService.createPost(postData).subscribe({
        next: (newPost) => {
          this.posts.update(posts => [newPost, ...posts]);
          this.postForm.reset();
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
            images: formValue.images ? [formValue.images] : [],
            likes: 0,
            comments: 0,
            shares: 0,
            createdAt: new Date(),
            isLiked: false,
            tags: formValue.tags ? formValue.tags.split(',').map((tag: string) => tag.trim()) : []
          };

          this.posts.update(posts => [newPost, ...posts]);
          this.postForm.reset();
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
}
