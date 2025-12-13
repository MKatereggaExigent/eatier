import { CommunityService, FeaturedChef, CommunityPost as ServiceCommunityPost, TrendingTopic } from '../../core/services/community.service';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../core/services/auth.service';
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
  private authService = inject(AuthService);

  // Auth state
  currentUser = this.authService.currentUser;
  isAuthenticated = this.authService.isAuthenticated;

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
        this.posts.set([]);
        this.totalPosts.set(0);
        this.totalPages.set(1);
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
        this.trendingTopics.set([]);
      }
    });

    // Load featured chefs
    this.communityService.getFeaturedChefs().subscribe({
      next: (chefs) => {
        this.featuredChefs.set(chefs);
      },
      error: (error) => {
        console.error('Error loading featured chefs:', error);
        this.featuredChefs.set([]);
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
    // Check if user is logged in
    const user = this.currentUser();
    if (!user || !user.id) {
      this.postSuccessMessage.set('❌ Please log in to create a post.');
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
          this.postSuccessMessage.set('✅ Post created successfully!');

          // Switch back to feed tab to show the new post
          this.activeTab.set('feed');

          // Clear success message after 3 seconds
          setTimeout(() => this.postSuccessMessage.set(''), 3000);
        },
        error: (error) => {
          console.error('Error creating post:', error);
          this.isSubmittingPost.set(false);
          this.postSuccessMessage.set('❌ Failed to create post. Please try again.');

          // Clear error message after 5 seconds
          setTimeout(() => this.postSuccessMessage.set(''), 5000);
        }
      });
    }
  }

  formatDate(date: Date | string): string {
    const now = new Date();
    const dateObj = date instanceof Date ? date : new Date(date);

    if (isNaN(dateObj.getTime())) {
      return 'Unknown';
    }

    const diffInHours = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60));

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
      // Reset input so same file can be selected again
      input.value = '';
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
