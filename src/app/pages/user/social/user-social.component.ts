import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Star, Users, Heart, MessageCircle, Share2, Search, UserPlus, MessageSquare, BookOpen, GraduationCap, Handshake, Calendar, User, Camera, Send, ThumbsUp, RefreshCw, MessageCircle as MessageCircleIcon } from 'lucide-angular';
import { environment } from '../../../../environments/environment';
import { SocialWidgetComponent } from '../../../shared/components/social-widget/social-widget.component';
import { MessagingWidgetComponent } from '../../../shared/components/messaging-widget/messaging-widget.component';
import { PublicStatsService } from '../../../core/services/public-stats.service';
import { PostsService, Post, PostComment } from '../../../core/services/posts.service';
import { StoriesService, StoryUser, Story } from '../../../core/services/stories.service';
import { MessagingService } from '../../../core/services/messaging.service';

interface UserToFollow {
  id: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  reviewCount?: number;
  review_count?: number;
  followerCount?: number;
  follower_count?: number;
  isFollowing: boolean;
}

interface ActivityItem {
  id: string;
  actorName: string;
  activityType: string;
  contentType: string;
  contentPreview: string;
  businessName: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  user: { id: string; firstName: string; lastName: string; avatar: string };
}

@Component({
  selector: 'app-user-social',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SocialWidgetComponent, MessagingWidgetComponent, RouterModule, FormsModule],
  templateUrl: './user-social.component.html',
  styleUrls: ['./user-social.component.scss']
})
export class UserSocialComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private publicStatsService = inject(PublicStatsService);
  private postsService = inject(PostsService);
  private storiesService = inject(StoriesService);
  private messagingService = inject(MessagingService);

  readonly Star = Star;
  readonly Users = Users;
  readonly User = User;
  readonly Heart = Heart;
  readonly MessageCircle = MessageCircle;
  readonly Share2 = Share2;
  readonly Search = Search;
  readonly UserPlus = UserPlus;
  readonly MessageSquare = MessageSquare;
  readonly BookOpen = BookOpen;
  readonly GraduationCap = GraduationCap;
  readonly Handshake = Handshake;
  readonly Calendar = Calendar;
  readonly Camera = Camera;
  readonly Send = Send;
  readonly ThumbsUp = ThumbsUp;
  readonly RefreshCw = RefreshCw;
  readonly MessageCircleIcon = MessageCircleIcon;

  loading = signal(true);
  discoverLoading = signal(false);
  followingLoading = signal(false);
  followersLoading = signal(false);
  activeTab = signal<'feed' | 'discover' | 'following' | 'followers'>('feed');

  // Feed pagination
  feedOffset = signal(0);
  feedLimit = 20;
  feedHasMore = signal(true);
  feedRefreshing = signal(false);
  feedLoadingMore = signal(false);

  // Posts
  posts = signal<Post[]>([]);
  activities = signal<ActivityItem[]>([]);
  storyUsers = signal<StoryUser[]>([]);
  discoverUsers = signal<UserToFollow[]>([]);
  following = signal<UserToFollow[]>([]);
  followers = signal<UserToFollow[]>([]);
  followingInProgress = signal<Set<string>>(new Set());

  // Post creation
  newPostContent = signal('');
  newPostImages = signal<string[]>([]);
  isCreatingPost = signal(false);
  postError = signal('');

  // Story viewer
  viewingStoryUser = signal<StoryUser | null>(null);
  currentStoryIndex = signal(0);

  // Comments
  commentsVisible: Record<string, boolean> = {};
  comments: Record<string, PostComment[]> = {};
  newComment: Record<string, string> = {};
  commentLoading: Record<string, boolean> = {};
  replyToComment: Record<string, string | null> = {}; // postId -> commentId being replied to
  replyContent: Record<string, string> = {}; // commentId -> reply text
  replyLoading: Record<string, boolean> = {}; // commentId -> loading state

  // Activity comments
  activityCommentsVisible: Record<string, boolean> = {};

  stats = signal<Array<{ value: string; label: string }>>([
    { value: '0', label: 'Active Users' },
    { value: '0', label: 'Connections' },
    { value: '0', label: 'Reviews' },
    { value: '0', label: 'Messages' }
  ]);

  ngOnInit(): void {
    this.loadStatistics();
    this.refreshFeed();
    this.loadDiscoverUsers();
    this.loadStories();
  }

  loadStatistics(): void {
    this.publicStatsService.getStatistics().subscribe({
      next: (data) => {
        this.stats.set([
          { value: this.formatNumber(data.activeUsers), label: 'Active Users' },
          { value: this.formatNumber(data.activeUsers), label: 'Connections' },
          { value: this.formatNumber(data.reviews), label: 'Reviews' },
          { value: this.formatNumber(data.reviews), label: 'Messages' }
        ]);
      }
    });
  }

  formatNumber(num: number): string {
    if (num === 0) return '0';
    if (num < 1000) return num.toString();
    if (num < 10000) return `${(num / 1000).toFixed(1)}K+`;
    if (num < 1000000) return `${Math.floor(num / 1000)}K+`;
    return `${(num / 1000000).toFixed(1)}M+`;
  }

  setActiveTab(tab: 'feed' | 'discover' | 'following' | 'followers'): void {
    this.activeTab.set(tab);
    if (tab === 'feed') { this.refreshFeed(); }
    else if (tab === 'discover') { this.loadDiscoverUsers(); }
    else if (tab === 'following') { this.loadFollowing(); }
    else if (tab === 'followers') { this.loadFollowers(); }
  }

  loadFeed(reset = true): void {
    if (reset) {
      this.loading.set(true);
      this.feedOffset.set(0);
      this.feedHasMore.set(true);
    }
    const offset = this.feedOffset();
    this.postsService.getFeed(this.feedLimit, offset).subscribe({
      next: (data) => {
        const posts = data.posts || [];
        if (reset) {
          this.posts.set(posts);
        } else {
          this.posts.update(current => [...current, ...posts]);
        }
        this.feedHasMore.set(posts.length >= this.feedLimit);
        this.loading.set(false);
        this.feedRefreshing.set(false);
        this.feedLoadingMore.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.feedRefreshing.set(false);
        this.feedLoadingMore.set(false);
      }
    });
  }

  refreshFeed(): void {
    if (this.feedRefreshing()) return;
    this.feedRefreshing.set(true);
    this.loadFeed(true);
  }

  loadMorePosts(): void {
    if (this.feedLoadingMore() || !this.feedHasMore()) return;
    this.feedLoadingMore.set(true);
    this.feedOffset.update(o => o + this.feedLimit);
    this.loadFeed(false);
  }

  loadStories(): void {
    this.storiesService.getFeed().subscribe({
      next: (data) => this.storyUsers.set(data.users || [])
    });
  }

  loadDiscoverUsers(): void {
    this.discoverLoading.set(true);
    this.http.get<any>(`${environment.apiUrl}/social/discover`).subscribe({
      next: (data) => { this.discoverUsers.set(data.users || []); this.discoverLoading.set(false); },
      error: () => this.discoverLoading.set(false)
    });
  }

  loadFollowing(): void {
    this.followingLoading.set(true);
    this.http.get<any>(`${environment.apiUrl}/social/following`).subscribe({
      next: (data) => { this.following.set(data.following || []); this.followingLoading.set(false); },
      error: () => this.followingLoading.set(false)
    });
  }

  loadFollowers(): void {
    this.followersLoading.set(true);
    this.http.get<any>(`${environment.apiUrl}/social/followers`).subscribe({
      next: (data) => { this.followers.set(data.followers || []); this.followersLoading.set(false); },
      error: () => this.followersLoading.set(false)
    });
  }

  toggleFollow(userId: string, isCurrentlyFollowing: boolean): void {
    const inProgress = new Set(this.followingInProgress());
    inProgress.add(userId);
    this.followingInProgress.set(inProgress);

    const request = isCurrentlyFollowing
      ? this.http.delete(`${environment.apiUrl}/social/follow/${userId}`)
      : this.http.post(`${environment.apiUrl}/social/follow/${userId}`, {});

    request.subscribe({
      next: () => {
        inProgress.delete(userId);
        this.followingInProgress.set(new Set(inProgress));
        this.updateFollowStatus(userId, !isCurrentlyFollowing);
      },
      error: () => {
        inProgress.delete(userId);
        this.followingInProgress.set(new Set(inProgress));
      }
    });
  }

  updateFollowStatus(userId: string, isFollowing: boolean): void {
    this.discoverUsers.update(users => users.map(u => u.id === userId ? { ...u, isFollowing } : u));
    this.following.update(users => users.map(u => u.id === userId ? { ...u, isFollowing } : u));
    this.followers.update(users => users.map(u => u.id === userId ? { ...u, isFollowing } : u));
  }

  // ===== POST CREATION =====
  onImageSelected(event: any): void {
    const files = event.target.files;
    if (!files) return;
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.newPostImages.update(imgs => [...imgs, e.target.result]);
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(index: number): void {
    this.newPostImages.update(imgs => imgs.filter((_, i) => i !== index));
  }

  createPost(): void {
    const content = this.newPostContent().trim();
    const images = this.newPostImages();
    if (!content && images.length === 0) return;
    this.isCreatingPost.set(true);
    this.postError.set('');
    this.postsService.createPost(content, images).subscribe({
      next: (post) => {
        this.posts.update(p => [post, ...p]);
        this.newPostContent.set('');
        this.newPostImages.set([]);
        this.isCreatingPost.set(false);
      },
      error: (err) => {
        this.isCreatingPost.set(false);
        this.postError.set(err?.error?.error || 'Failed to create post. Please try again.');
      }
    });
  }

  // ===== POST LIKES =====
  togglePostLike(post: Post): void {
    this.postsService.toggleLike(post.id).subscribe({
      next: (res) => {
        this.posts.update(posts => posts.map(p =>
          p.id === post.id ? { ...p, is_liked: res.isLiked, like_count: res.likesCount } : p
        ));
      }
    });
  }

  // ===== POST COMMENTS =====
  toggleComments(postId: string): void {
    if (this.commentsVisible[postId]) {
      this.commentsVisible[postId] = false;
      return;
    }
    this.commentsVisible[postId] = true;
    this.loadComments(postId);
  }

  loadComments(postId: string): void {
    if (this.comments[postId]) return;
    this.postsService.getComments(postId).subscribe({
      next: (data) => this.comments[postId] = data.comments || []
    });
  }

  addComment(postId: string): void {
    const content = this.newComment[postId]?.trim();
    if (!content) return;
    this.commentLoading[postId] = true;
    this.postsService.addComment(postId, content).subscribe({
      next: () => {
        this.newComment[postId] = '';
        this.comments[postId] = [];
        this.loadComments(postId);
        this.posts.update(posts => posts.map(p =>
          p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p
        ));
        this.commentLoading[postId] = false;
      },
      error: () => this.commentLoading[postId] = false
    });
  }

  toggleCommentLike(commentId: string): void {
    this.postsService.toggleCommentLike(commentId).subscribe({
      next: (res) => {
        for (const postId of Object.keys(this.comments)) {
          this.comments[postId] = this.comments[postId].map(c =>
            c.id === commentId ? { ...c, is_liked: res.isLiked, like_count: res.likesCount } : c
          );
        }
      }
    });
  }

  setReplyToComment(postId: string, commentId: string | null): void {
    this.replyToComment[postId] = commentId;
  }

  addReply(postId: string, parentCommentId: string): void {
    const content = this.replyContent[parentCommentId]?.trim();
    if (!content) return;
    this.replyLoading[parentCommentId] = true;
    this.postsService.addComment(postId, content, parentCommentId).subscribe({
      next: () => {
        this.replyContent[parentCommentId] = '';
        this.replyToComment[postId] = null;
        this.comments[postId] = [];
        this.loadComments(postId);
        this.replyLoading[parentCommentId] = false;
      },
      error: () => this.replyLoading[parentCommentId] = false
    });
  }

  getTopLevelComments(postId: string): PostComment[] {
    return (this.comments[postId] || []).filter(c => !c.parent_id);
  }

  getCommentReplies(postId: string, parentId: string): PostComment[] {
    return (this.comments[postId] || []).filter(c => c.parent_id === parentId);
  }

  // ===== ACTIVITY LIKES =====
  toggleActivityLike(activity: ActivityItem): void {
    this.http.post<any>(`${environment.apiUrl}/social/activities/${activity.id}/like`, {}).subscribe({
      next: (res) => {
        this.activities.update(acts => acts.map(a =>
          a.id === activity.id ? { ...a, isLiked: res.isLiked, likeCount: res.likesCount } : a
        ));
      }
    });
  }

  toggleActivityComments(activityId: string): void {
    this.activityCommentsVisible[activityId] = !this.activityCommentsVisible[activityId];
  }

  shareActivity(activity: ActivityItem): void {
    this.http.post(`${environment.apiUrl}/social/share`, {
      shareType: 'activity',
      referenceId: activity.id,
      platform: 'internal'
    }).subscribe();
  }

  // ===== STORIES =====
  openStoryViewer(storyUser: StoryUser): void {
    this.viewingStoryUser.set(storyUser);
    this.currentStoryIndex.set(0);
    if (storyUser.stories.length > 0) {
      this.storiesService.markViewed(storyUser.stories[0].id).subscribe();
    }
  }

  closeStoryViewer(): void {
    this.viewingStoryUser.set(null);
    this.currentStoryIndex.set(0);
  }

  nextStory(): void {
    const user = this.viewingStoryUser();
    if (!user) return;
    const nextIndex = this.currentStoryIndex() + 1;
    if (nextIndex < user.stories.length) {
      this.currentStoryIndex.set(nextIndex);
      this.storiesService.markViewed(user.stories[nextIndex].id).subscribe();
    } else {
      this.closeStoryViewer();
    }
  }

  prevStory(): void {
    const prevIndex = this.currentStoryIndex() - 1;
    if (prevIndex >= 0) {
      this.currentStoryIndex.set(prevIndex);
    }
  }

  // ===== ACTIVITY FEED LOADING (for activity tab) =====
  loadActivityFeed(): void {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/social/feed`).subscribe({
      next: (data) => { this.activities.set(data.activities || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  isFollowInProgress(userId: string): boolean {
    return this.followingInProgress().has(userId);
  }

  startChat(userId: string): void {
    this.messagingService.sendChatRequest(userId).subscribe({
      next: (res) => {
        this.router.navigate(['/dashboard/user/messages']);
      },
      error: () => {}
    });
  }

  getActorAvatarUrl(name: string): string {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`;
  }

  getUserAvatarUrl(user: UserToFollow): string {
    const seed = user.id || `${user.first_name || ''}${user.last_name || ''}`;
    return this.getActorAvatarUrl(seed);
  }

  getUserFullName(user: UserToFollow): string {
    const first = user.first_name || user.firstName || '';
    const last = user.last_name || user.lastName || '';
    return `${first} ${last}`.trim() || 'Unknown User';
  }

  formatDate(date: string): string {
    const now = new Date();
    const d = new Date(date);
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }
}
