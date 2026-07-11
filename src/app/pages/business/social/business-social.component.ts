import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { SocialWidgetComponent } from '../../../shared/components/social-widget/social-widget.component';
import { MessagingWidgetComponent } from '../../../shared/components/messaging-widget/messaging-widget.component';
import { AvatarUploadComponent } from '../../../shared/components/avatar-upload/avatar-upload.component';
import { AvatarContextMenuDirective } from '../../../shared/directives/avatar-context-menu.directive';
import { MessagingService } from '../../../core/services/messaging.service';
import {
  LucideAngularModule, Heart, MessageCircle, Share2, Search, Bell, Camera, Send,
  UserCheck, MoreHorizontal, Users, MessageSquare, UserPlus, AtSign, Star, Image,
  Plus, Eye, CheckCircle, Clock, AlertTriangle, ChevronLeft, ChevronRight, UserMinus, FileText, Calendar
} from 'lucide-angular';

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
  imports: [CommonModule, SocialWidgetComponent, MessagingWidgetComponent, AvatarUploadComponent, AvatarContextMenuDirective, LucideAngularModule],
  templateUrl: './business-social.component.html',
  styleUrls: ['./business-social.component.scss']
})
export class BusinessSocialComponent implements OnInit {
  readonly Heart = Heart;
  readonly MessageCircle = MessageCircle;
  readonly Share2 = Share2;
  readonly Search = Search;
  readonly Bell = Bell;
  readonly Camera = Camera;
  readonly Send = Send;
  readonly UserCheck = UserCheck;
  readonly MoreHorizontal = MoreHorizontal;
  readonly Users = Users;
  readonly MessageSquare = MessageSquare;
  readonly UserPlus = UserPlus;
  readonly AtSign = AtSign;
  readonly Star = Star;
  readonly Image = Image;
  readonly Plus = Plus;
  readonly Eye = Eye;
  readonly CheckCircle = CheckCircle;
  readonly Clock = Clock;
  readonly AlertTriangle = AlertTriangle;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly UserMinus = UserMinus;
  readonly FileText = FileText;
  readonly Calendar = Calendar;

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

  activityPage = signal(1);
  activityLimit = 10;
  totalActivityPages = signal(1);

  showAvatarUpload = signal(false);

  searchQuery = signal('');
  showNotifications = signal(false);
  likedActivities = signal<Set<string>>(new Set());

  filteredDiscover = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.discoverUsers();
    return this.discoverUsers().filter(u => this.getUserFullName(u).toLowerCase().includes(q));
  });

  filteredFollowing = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.following();
    return this.following().filter(u => this.getUserFullName(u).toLowerCase().includes(q));
  });

  filteredFollowers = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.followers();
    return this.followers().filter(u => this.getUserFullName(u).toLowerCase().includes(q));
  });

  stories = computed(() => this.discoverUsers().slice(0, 8));

  private currentUserAvatarSeed = signal(`user_${Date.now()}`);

  ngOnInit(): void {
    this.loadActivityFeed();
    this.loadDiscoverUsers();
  }

  setActiveTab(tab: 'feed' | 'discover' | 'following' | 'followers'): void {
    this.activeTab.set(tab);
    this.searchQuery.set('');
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

  nextActivityPage(): void {
    if (this.activityPage() < this.totalActivityPages()) {
      this.activityPage.update(p => p + 1);
      this.loadActivityFeed();
      document.querySelector('.activity-list')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  previousActivityPage(): void {
    if (this.activityPage() > 1) {
      this.activityPage.update(p => p - 1);
      this.loadActivityFeed();
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
      case 'review': return 'star';
      case 'favorite': return 'heart';
      case 'booking': return 'calendar';
      case 'share': return 'share';
      default: return 'file-text';
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

  getUserFullName(user: UserToFollow): string {
    const firstName = user.first_name || user.firstName || '';
    const lastName = user.last_name || user.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown User';
  }

  getUserAvatarUrl(user: UserToFollow): string {
    if (user.profile_image_url || user.avatar_url) {
      return user.profile_image_url || user.avatar_url || '';
    }
    const seed = user.id || this.getUserFullName(user);
    const encodedSeed = encodeURIComponent(seed);
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodedSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`;
  }

  getCurrentUserAvatar(): string {
    const seed = encodeURIComponent(this.currentUserAvatarSeed());
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`;
  }

  openAvatarUpload(): void {
    this.showAvatarUpload.set(true);
  }

  onAvatarUploaded(avatarUrl: string): void {
    this.currentUserAvatarSeed.set(`user_${Date.now()}`);
    const currentTab = this.activeTab();
    if (currentTab === 'feed') this.loadActivityFeed();
    else if (currentTab === 'discover') this.loadDiscoverUsers();
    else if (currentTab === 'following') this.loadFollowing();
    else if (currentTab === 'followers') this.loadFollowers();
  }

  closeAvatarUpload(): void {
    this.showAvatarUpload.set(false);
  }

  enc(seed: string): string {
    return encodeURIComponent(seed);
  }

  toggleLike(activityId: string): void {
    const set = new Set(this.likedActivities());
    if (set.has(activityId)) {
      set.delete(activityId);
    } else {
      set.add(activityId);
    }
    this.likedActivities.set(set);
  }

  isLiked(activityId: string): boolean {
    return this.likedActivities().has(activityId);
  }

  shareActivity(activity: ActivityItem): void {
    this.http.post(`${environment.apiUrl}/social/share`, {
      shareType: 'activity',
      referenceId: activity.id,
      platform: 'internal'
    }).subscribe({
      next: () => {
        const btn = document.querySelector(`[data-share="${activity.id}"]`);
        if (btn) {
          btn.textContent = 'Shared!';
          setTimeout(() => { btn.textContent = ''; }, 2000);
        }
      }
    });
  }

  messageUser(userId: string, userName: string): void {
    if (!userId) {
      alert('Error: User ID is missing.');
      return;
    }
    this.messagingService.sendChatRequest(userId, `Hi ${userName}! I would like to connect.`).subscribe({
      next: () => this.router.navigate(['/dashboard/business/messages']),
      error: (err) => alert('Error: ' + (err.error?.error || 'Failed to start chat'))
    });
  }

  toggleNotifications(): void {
    this.showNotifications.update(v => !v);
  }

  closeNotifications(): void {
    this.showNotifications.set(false);
  }
}
