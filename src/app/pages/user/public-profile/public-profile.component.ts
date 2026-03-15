import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { SocialService } from '../../../core/services/social.service';
import { MessagingService } from '../../../core/services/messaging.service';
import { AuthService } from '../../../core/services/auth.service';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  role: string;
  bio?: string;
  location?: string;
  follower_count?: number;
  following_count?: number;
  review_count?: number;
}

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-profile.component.html',
  styleUrls: ['./public-profile.component.scss']
})
export class PublicProfileComponent implements OnInit {
  profile = signal<UserProfile | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  isFollowing = signal<boolean>(false);
  isOwnProfile = signal<boolean>(false);
  currentUser = this.authService.currentUser;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private socialService: SocialService,
    private messagingService: MessagingService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.loadProfile(userId);
      this.checkIfFollowing(userId);
      this.checkIfOwnProfile(userId);
    }
  }

  loadProfile(userId: string): void {
    this.loading.set(true);
    this.http.get<UserProfile>(`${environment.apiUrl}/users/${userId}/profile`).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading profile:', err);
        this.error.set('Profile not found');
        this.loading.set(false);
      }
    });
  }

  checkIfFollowing(userId: string): void {
    if (!this.currentUser()) return;
    
    this.socialService.isFollowing(userId).subscribe({
      next: (following) => this.isFollowing.set(following),
      error: (err) => console.error('Error checking follow status:', err)
    });
  }

  checkIfOwnProfile(userId: string): void {
    const current = this.currentUser();
    if (current && current.id === userId) {
      this.isOwnProfile.set(true);
    }
  }

  toggleFollow(): void {
    const profile = this.profile();
    if (!profile) return;

    if (this.isFollowing()) {
      this.socialService.unfollowUser(profile.id).subscribe({
        next: () => this.isFollowing.set(false),
        error: (err) => console.error('Error unfollowing:', err)
      });
    } else {
      this.socialService.followUser(profile.id).subscribe({
        next: () => this.isFollowing.set(true),
        error: (err) => console.error('Error following:', err)
      });
    }
  }

  sendMessage(): void {
    const profile = this.profile();
    if (!profile) return;

    this.messagingService.sendChatRequest(profile.id, 'Hi! I would like to connect with you.').subscribe({
      next: () => {
        alert('Chat request sent!');
        this.router.navigate(['/messages']);
      },
      error: (err) => {
        console.error('Error sending chat request:', err);
        alert('Failed to send chat request');
      }
    });
  }

  getUserAvatar(): string {
    return this.profile()?.avatar_url || '/assets/images/default-avatar.png';
  }

  getUserName(): string {
    const profile = this.profile();
    if (!profile) return 'Unknown User';
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email;
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  editProfile(): void {
    this.router.navigate(['/dashboard/user/profile']);
  }
}

