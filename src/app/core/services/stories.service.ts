import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StoryUser {
  user: { id: string; firstName: string; lastName: string; avatar: string };
  stories: Story[];
}

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string;
  expires_at: string;
  created_at: string;
  viewed: boolean;
  view_count: number;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

export interface StoryView {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  viewed_at: string;
}

@Injectable({ providedIn: 'root' })
export class StoriesService {
  private http = inject(HttpClient);

  getFeed(): Observable<{ users: StoryUser[] }> {
    return this.http.get<{ users: StoryUser[] }>(`${environment.apiUrl}/stories/feed`);
  }

  getUserStories(userId: string): Observable<{ stories: Story[] }> {
    return this.http.get<{ stories: Story[] }>(`${environment.apiUrl}/stories/user/${userId}`);
  }

  createStory(mediaUrl: string, mediaType: string, caption?: string): Observable<Story> {
    return this.http.post<Story>(`${environment.apiUrl}/stories`, { mediaUrl, mediaType, caption });
  }

  uploadStoryMedia(file: File): Observable<{ mediaUrl: string; mediaType: string }> {
    const formData = new FormData();
    formData.append('media', file);
    return this.http.post<{ mediaUrl: string; mediaType: string }>(`${environment.apiUrl}/stories/upload`, formData);
  }

  markViewed(storyId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/stories/${storyId}/view`, {});
  }

  getViews(storyId: string): Observable<{ views: StoryView[] }> {
    return this.http.get<{ views: StoryView[] }>(`${environment.apiUrl}/stories/${storyId}/views`);
  }

  deleteStory(storyId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/stories/${storyId}`);
  }
}
