import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { SocialWidgetComponent } from '../../../shared/components/social-widget/social-widget.component';
import { MessagingWidgetComponent } from '../../../shared/components/messaging-widget/messaging-widget.component';

interface UserToFollow {
  id: string;
  // Support both snake_case (API response) and camelCase (legacy)
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  reviewCount?: number;
  review_count?: number;
  followerCount?: number;
  follower_count?: number;
  isFollowing: boolean;
  // Avatar fields
  profile_image_url?: string;
  avatar_url?: string;
  avatar?: string;
}

interface ActivityItem {
  id: string;
  actorName: string;
  activityType: string;
  contentType: string;
  contentPreview: string;
  businessName: string;
  createdAt: Date;
}

@Component({
  selector: 'app-business-social',
  standalone: true,
  imports: [CommonModule, SocialWidgetComponent, MessagingWidgetComponent],
  templateUrl: './business-social.component.html',
  styleUrls: ['./business-social.component.scss']
})
export class BusinessSocialComponent implements OnInit {
  private http = inject(HttpClient);

  loading = signal(true);
  activeTab = signal<'feed' | 'discover' | 'following' | 'followers'>('feed');

  activityFeed = signal<ActivityItem[]>([]);
  discoverUsers = signal<UserToFollow[]>([]);
  following = signal<UserToFollow[]>([]);
  followers = signal<UserToFollow[]>([]);

  followingInProgress = signal<Set<string>>(new Set());

  // Pagination
  activityPage = signal(1);
  activityLimit = 10;
  totalActivityPages = signal(1);

  ngOnInit(): void {
    this.loadActivityFeed();
    this.loadDiscoverUsers();
  }

  setActiveTab(tab: 'feed' | 'discover' | 'following' | 'followers'): void {
    this.activeTab.set(tab);
    if (tab === 'feed') this.loadActivityFeed();
    else if (tab === 'discover') this.loadDiscoverUsers();
    else if (tab === 'following') this.loadFollowing();
    else if (tab === 'followers') this.loadFollowers();
  }

  loadActivityFeed(): void {
    this.loading.set(true);
    const offset = (this.activityPage() - 1) * this.activityLimit;
    this.http.get<any>(`${environment.apiUrl}/social/feed?limit=${this.activityLimit}&offset=${offset}`).subscribe({
      next: (data) => {
        this.activityFeed.set(data.activities || []);
        const total = data.total || data.activities?.length || 0;
        this.totalActivityPages.set(Math.ceil(total / this.activityLimit) || 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  /**
   * Go to next activity page
   */
  nextActivityPage(): void {
    if (this.activityPage() < this.totalActivityPages()) {
      this.activityPage.update(p => p + 1);
      this.loadActivityFeed();
      // Scroll to top of activity feed
      document.querySelector('.activity-list')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Go to previous activity page
   */
  previousActivityPage(): void {
    if (this.activityPage() > 1) {
      this.activityPage.update(p => p - 1);
      this.loadActivityFeed();
      // Scroll to top of activity feed
      document.querySelector('.activity-list')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  loadDiscoverUsers(): void {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/social/discover`).subscribe({
      next: (data) => { this.discoverUsers.set(data.users || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  loadFollowing(): void {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/social/following`).subscribe({
      next: (data) => { this.following.set(data.following || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  loadFollowers(): void {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/social/followers`).subscribe({
      next: (data) => { this.followers.set(data.followers || []); this.loading.set(false); },
      error: () => this.loading.set(false)
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

  getActivityIcon(type: string): string {
    switch (type) {
      case 'review': return '⭐';
      case 'favorite': return '❤️';
      case 'booking': return '📅';
      case 'share': return '🔗';
      default: return '📋';
    }
  }

  getActivityText(activity: ActivityItem): string {
    switch (activity.activityType) {
      case 'review': return `reviewed ${activity.businessName}`;
      case 'favorite': return `saved ${activity.businessName} to favorites`;
      case 'booking': return `made a reservation at ${activity.businessName}`;
      case 'share': return `shared ${activity.businessName}`;
      default: return `interacted with ${activity.businessName}`;
    }
  }

  formatDate(date: Date): string {
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

  isFollowInProgress(userId: string): boolean {
    return this.followingInProgress().has(userId);
  }

  /**
   * Get user's full name
   */
  getUserFullName(user: UserToFollow): string {
    const firstName = user.first_name || user.firstName || '';
    const lastName = user.last_name || user.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown User';
  }

  /**
   * Get beautiful avatar URL for user
   */
  getUserAvatarUrl(user: UserToFollow): string {
    // If user has uploaded avatar, use it
    if (user.profile_image_url || user.avatar_url) {
      return user.profile_image_url || user.avatar_url || '';
    }

    // Otherwise use DiceBear beautiful default avatar
    const seed = user.id || this.getUserFullName(user);
    const encodedSeed = encodeURIComponent(seed);
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodedSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`;
  }
}

