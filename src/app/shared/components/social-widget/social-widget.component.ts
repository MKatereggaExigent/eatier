import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { SocialService, UserProfile } from '../../../core/services/social.service';
import { PresenceService, UserPresence } from '../../../core/services/presence.service';
import { PokesService } from '../../../core/services/pokes.service';
import { MessagingService } from '../../../core/services/messaging.service';
import { AuthService } from '../../../core/services/auth.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-social-widget',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './social-widget.component.html',
  styleUrls: ['./social-widget.component.scss']
})
export class SocialWidgetComponent implements OnInit, OnDestroy {
  followers = signal<UserProfile[]>([]);
  following = signal<UserProfile[]>([]);
  followerCount = signal<number>(0);
  followingCount = signal<number>(0);
  loading = signal<boolean>(true);
  activeTab = signal<'followers' | 'following' | 'online'>('followers');

  onlineUsers = signal<UserPresence[]>([]);
  pokingUserId = signal<string | null>(null);

  private presenceSubscription?: Subscription;

  constructor(
    private socialService: SocialService,
    private presenceService: PresenceService,
    private pokesService: PokesService,
    private messagingService: MessagingService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSocialData();
    this.loadOnlineUsers();

    // Refresh online users every 30 seconds
    this.presenceSubscription = interval(30000).subscribe(() => {
      this.loadOnlineUsers();
    });
  }

  ngOnDestroy(): void {
    if (this.presenceSubscription) {
      this.presenceSubscription.unsubscribe();
    }
  }

  loadSocialData(): void {
    this.loading.set(true);

    // Load followers
    this.socialService.getFollowers(undefined, 10, 0).subscribe({
      next: (response) => {
        this.followers.set(response.followers);
        this.followerCount.set(response.total);
      },
      error: (err) => console.error('Error loading followers:', err)
    });

    // Load following
    this.socialService.getFollowing(undefined, 10, 0).subscribe({
      next: (response) => {
        this.following.set(response.following);
        this.followingCount.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading following:', err);
        this.loading.set(false);
      }
    });
  }

  loadOnlineUsers(): void {
    this.presenceService.getOnlineUsers().subscribe({
      next: (response) => {
        this.onlineUsers.set(response.online_users);
      },
      error: (err) => console.error('Error loading online users:', err)
    });
  }

  setActiveTab(tab: 'followers' | 'following' | 'online'): void {
    this.activeTab.set(tab);
    if (tab === 'online') {
      this.loadOnlineUsers();
    }
  }

  unfollowUser(userId: string): void {
    this.socialService.unfollowUser(userId).subscribe({
      next: () => {
        // Remove from following list
        const updated = this.following().filter(u => (u.user_id || u.id) !== userId);
        this.following.set(updated);
        this.followingCount.set(this.followingCount() - 1);
      },
      error: (err) => console.error('Error unfollowing user:', err)
    });
  }

  // Removed duplicate - using the enhanced versions below (lines 199-211)

  formatRole(role: string): string {
    const roleMap: { [key: string]: string } = {
      'normal_user': 'Normal User',
      'food_enthusiast': 'Food Enthusiast',
      'business_owner': 'Business Owner',
      'specialist': 'Specialist',
      'itiyum_admin': 'Itiyum Admin'
    };
    return roleMap[role] || role;
  }

  /**
   * Start a chat with a user
   */
  startChat(userId: string): void {
    console.log('🔍 Social Widget: startChat called with userId:', userId);

    if (!userId) {
      console.error('❌ userId is undefined or null!');
      alert('Error: User ID is missing. Please refresh and try again.');
      return;
    }

    // Verify UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('❌ Invalid UUID format for userId:', userId);
      alert('Error: Invalid user ID format. Please refresh the page.');
      return;
    }

    console.log('📤 Sending chat request to userId:', userId);

    this.messagingService.sendChatRequest(userId, 'Hi! I would like to connect.').subscribe({
      next: (response: any) => {
        console.log('✅ Chat request sent successfully:', response);

        // Show success message with auto-follow info
        if (response.autoFollowed) {
          alert('Chat request sent! You are now following this user.');
        }

        // Navigate to messages page based on user role
        this.router.navigate([this.getMessagesRoute()]);
      },
      error: (err) => {
        console.error('❌ Error starting chat:', err);
        console.error('❌ Error details:', {
          status: err.status,
          error: err.error,
          sentUserId: userId
        });

        const errorMessage = err.error?.error || err.error?.message || 'Failed to start chat';
        alert(`Error: ${errorMessage}. Please try again.`);
      }
    });
  }

  /**
   * Get the correct messages route based on user role
   */
  private getMessagesRoute(): string {
    const user = this.authService.currentUser();
    if (!user) return '/messages';

    switch (user.role) {
      case 'specialist':
        return '/dashboard/specialist/messages';
      case 'business_owner':
        return '/dashboard/business/messages';
      case 'food_enthusiast':
        return '/dashboard/food-enthusiast/messages';
      case 'normal_user':
        return '/dashboard/user/messages';
      case 'itiyum_admin':
        return '/admin/messages';
      default:
        return '/messages';
    }
  }

  /**
   * Send a poke to a user
   */
  pokeUser(userId: string): void {
    this.pokingUserId.set(userId);
    this.pokesService.sendPoke(userId, '👋 Hey there!').subscribe({
      next: () => {
        this.pokingUserId.set(null);
        alert('Poke sent!');
      },
      error: (err) => {
        console.error('Error sending poke:', err);
        this.pokingUserId.set(null);
      }
    });
  }

  /**
   * Get status color for presence indicator
   */
  getStatusColor(status: string): string {
    return this.presenceService.getStatusColor(status);
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    return this.presenceService.getStatusLabel(status);
  }

  /**
   * Get user's full name with fallback for snake_case and camelCase API responses
   */
  getUserName(user: UserProfile | any): string {
    if (!user) return 'Unknown User';
    const firstName = user.first_name || user.firstName || '';
    const lastName = user.last_name || user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user.email || 'Unknown User';
  }

  /**
   * Get user avatar URL with fallback to beautiful default avatars
   */
  getUserAvatar(user: UserProfile | any): string {
    if (!user) return this.getDefaultAvatar('default');

    // If user has uploaded avatar, use it
    if (user.profile_image_url || user.avatar || user.avatar_url || user.avatarUrl) {
      return user.profile_image_url || user.avatar || user.avatar_url || user.avatarUrl;
    }

    // Otherwise use beautiful default avatar based on user ID or name
    return this.getDefaultAvatar(user.id || user.email || this.getUserName(user));
  }

  /**
   * Get beautiful default avatar using DiceBear API
   * Creates unique, colorful avatars based on seed (user ID or name)
   */
  private getDefaultAvatar(seed: string): string {
    // DiceBear Avatars - Beautiful, unique, SVG avatars
    // Styles available: adventurer, avataaars, bottts, fun-emoji, identicon, initials, lorelei, micah, miniavs, personas
    const style = 'avataaars'; // Fun, colorful human-like avatars (similar to Apple Memoji)
    const encodedSeed = encodeURIComponent(seed);

    // Options for more variety and coolness
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodedSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`;
  }
}

