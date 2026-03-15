import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image_url?: string;
  avatar?: string;
  avatar_url?: string;
  role: string;
  follower_count?: number;
  review_count?: number;
  followed_at?: string;
}

export interface FollowersResponse {
  followers: UserProfile[];
  total: number;
  limit: number;
  offset: number;
}

export interface FollowingResponse {
  following: UserProfile[];
  total: number;
  limit: number;
  offset: number;
}

export interface DiscoverUsersResponse {
  users: UserProfile[];
}

@Injectable({
  providedIn: 'root'
})
export class SocialService {
  private apiUrl = `${environment.apiUrl}/social`;

  constructor(private http: HttpClient) {}

  /**
   * Follow a user
   */
  followUser(userId: string): Observable<{ message: string; follow: any }> {
    return this.http.post<{ message: string; follow: any }>(
      `${this.apiUrl}/follow/${userId}`,
      {}
    );
  }

  /**
   * Unfollow a user
   */
  unfollowUser(userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/follow/${userId}`
    );
  }

  /**
   * Get followers for a user
   */
  getFollowers(userId?: string, limit: number = 50, offset: number = 0): Observable<FollowersResponse> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());
    
    if (userId) {
      params = params.set('userId', userId);
    }

    return this.http.get<FollowersResponse>(`${this.apiUrl}/followers`, { params });
  }

  /**
   * Get users that a user is following
   */
  getFollowing(userId?: string, limit: number = 50, offset: number = 0): Observable<FollowingResponse> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());
    
    if (userId) {
      params = params.set('userId', userId);
    }

    return this.http.get<FollowingResponse>(`${this.apiUrl}/following`, { params });
  }

  /**
   * Discover users to follow
   */
  discoverUsers(limit: number = 10): Observable<DiscoverUsersResponse> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<DiscoverUsersResponse>(`${this.apiUrl}/discover`, { params });
  }

  /**
   * Get activity feed
   */
  getActivityFeed(limit: number = 20, offset: number = 0): Observable<any> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());
    
    return this.http.get(`${this.apiUrl}/activity-feed`, { params });
  }

  /**
   * Check if current user is following a specific user
   */
  isFollowing(userId: string): Observable<boolean> {
    return new Observable(observer => {
      this.getFollowing(undefined, 1000, 0).subscribe({
        next: (response) => {
          const isFollowing = response.following.some(
            user => (user.user_id || user.id) === userId
          );
          observer.next(isFollowing);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  /**
   * Get follower count for a user
   */
  getFollowerCount(userId?: string): Observable<number> {
    return new Observable(observer => {
      this.getFollowers(userId, 1, 0).subscribe({
        next: (response) => {
          observer.next(response.total);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  /**
   * Get following count for a user
   */
  getFollowingCount(userId?: string): Observable<number> {
    return new Observable(observer => {
      this.getFollowing(userId, 1, 0).subscribe({
        next: (response) => {
          observer.next(response.total);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }
}

