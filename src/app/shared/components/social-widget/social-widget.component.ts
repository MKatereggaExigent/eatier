import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SocialService, UserProfile } from '../../../core/services/social.service';

@Component({
  selector: 'app-social-widget',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './social-widget.component.html',
  styleUrls: ['./social-widget.component.scss']
})
export class SocialWidgetComponent implements OnInit {
  followers = signal<UserProfile[]>([]);
  following = signal<UserProfile[]>([]);
  followerCount = signal<number>(0);
  followingCount = signal<number>(0);
  loading = signal<boolean>(true);
  activeTab = signal<'followers' | 'following'>('followers');

  constructor(private socialService: SocialService) {}

  ngOnInit(): void {
    this.loadSocialData();
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

  setActiveTab(tab: 'followers' | 'following'): void {
    this.activeTab.set(tab);
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

  getUserAvatar(user: UserProfile): string {
    return user.profile_image_url || user.avatar || user.avatar_url || '/assets/images/default-avatar.png';
  }

  getUserName(user: UserProfile): string {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
  }

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
}

