import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { SocialWidgetComponent } from '../../../shared/components/social-widget/social-widget.component';
import { MessagingWidgetComponent } from '../../../shared/components/messaging-widget/messaging-widget.component';
import { MessagingService } from '../../../core/services/messaging.service';

interface UserToFollow {
  id: string;
  firstName: string;
  lastName: string;
  reviewCount: number;
  followerCount: number;
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
  selector: 'app-specialist-social',
  standalone: true,
  imports: [CommonModule, SocialWidgetComponent, MessagingWidgetComponent],
  templateUrl: './specialist-social.component.html',
  styleUrls: ['./specialist-social.component.scss']
})
export class SpecialistSocialComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private messagingService = inject(MessagingService);

  loading = signal(true);
  activeTab = signal<'feed' | 'discover' | 'following' | 'followers'>('feed');

  activityFeed = signal<ActivityItem[]>([]);
  discoverUsers = signal<UserToFollow[]>([]);
  following = signal<UserToFollow[]>([]);
  followers = signal<UserToFollow[]>([]);

  followingInProgress = signal<Set<string>>(new Set());
  startingChatWith = signal<string | null>(null); // Track which user we're starting a chat with

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
    // Load only top 10 activities with pagination
    this.http.get<any>(`${environment.apiUrl}/social/feed?limit=10&offset=0`).subscribe({
      next: (data) => { this.activityFeed.set(data.activities || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  loadDiscoverUsers(): void {
    this.loading.set(true);
    // Load with pagination (10 users at a time)
    this.http.get<any>(`${environment.apiUrl}/social/discover?limit=10`).subscribe({
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
   * Start a chat with a user
   */
  startChat(userId: string): void {
    console.log('🔍 startChat called with userId:', userId, 'Type:', typeof userId);

    if (!userId) {
      console.error('❌ userId is undefined or null!');
      alert('Error: User ID is missing');
      return;
    }

    this.startingChatWith.set(userId);

    // Send chat request
    console.log('📤 Sending chat request to userId:', userId);
    this.messagingService.sendChatRequest(userId, 'Hi! I would like to connect with you.').subscribe({
      next: (response) => {
        this.startingChatWith.set(null);
        console.log('✅ Chat request sent successfully:', response);
        // Navigate to messages page
        this.router.navigate(['/messages']);
      },
      error: (err) => {
        console.error('❌ Error starting chat:', err);
        console.error('❌ Error details:', {
          status: err.status,
          statusText: err.statusText,
          error: err.error,
          message: err.message
        });
        this.startingChatWith.set(null);

        // Show specific error message
        const errorMessage = err.error?.error || err.error?.message || err.message || 'Failed to start chat. Please try again.';
        alert(errorMessage);
      }
    });
  }

  /**
   * Check if we're starting a chat with this user
   */
  isStartingChat(userId: string): boolean {
    return this.startingChatWith() === userId;
  }
}

