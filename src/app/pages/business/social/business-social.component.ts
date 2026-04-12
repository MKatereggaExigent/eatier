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
    this.http.get<any>(`${environment.apiUrl}/social/feed`).subscribe({
      next: (data) => { this.activityFeed.set(data.activities || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
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
}

