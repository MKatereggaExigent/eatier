import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Post {
  id: string;
  user_id: string;
  tenant_id: string;
  content: string;
  image_urls: string[];
  video_url: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  like_count: number;
  is_liked: boolean;
  replies?: PostComment[];
}

@Injectable({ providedIn: 'root' })
export class PostsService {
  private http = inject(HttpClient);

  getFeed(limit = 20, offset = 0): Observable<{ posts: Post[] }> {
    return this.http.get<{ posts: Post[] }>(`${environment.apiUrl}/posts/feed?limit=${limit}&offset=${offset}`);
  }

  getUserPosts(userId: string, limit = 20, offset = 0): Observable<{ posts: Post[] }> {
    return this.http.get<{ posts: Post[] }>(`${environment.apiUrl}/posts/user/${userId}?limit=${limit}&offset=${offset}`);
  }

  getPost(postId: string): Observable<Post> {
    return this.http.get<Post>(`${environment.apiUrl}/posts/${postId}`);
  }

  createPost(content: string, imageUrls?: string[], videoUrl?: string): Observable<Post> {
    return this.http.post<Post>(`${environment.apiUrl}/posts`, { content, imageUrls, videoUrl });
  }

  deletePost(postId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/posts/${postId}`);
  }

  toggleLike(postId: string): Observable<{ isLiked: boolean; likesCount: number }> {
    return this.http.post<{ isLiked: boolean; likesCount: number }>(`${environment.apiUrl}/posts/${postId}/like`, {});
  }

  getLikes(postId: string): Observable<{ likes: any[] }> {
    return this.http.get<{ likes: any[] }>(`${environment.apiUrl}/posts/${postId}/likes`);
  }

  addComment(postId: string, content: string, parentId?: string): Observable<PostComment> {
    return this.http.post<PostComment>(`${environment.apiUrl}/posts/${postId}/comments`, { content, parentId });
  }

  getComments(postId: string): Observable<{ comments: PostComment[] }> {
    return this.http.get<{ comments: PostComment[] }>(`${environment.apiUrl}/posts/${postId}/comments`);
  }

  toggleCommentLike(commentId: string): Observable<{ isLiked: boolean; likesCount: number }> {
    return this.http.post<{ isLiked: boolean; likesCount: number }>(`${environment.apiUrl}/posts/comments/${commentId}/like`, {});
  }

  deleteComment(commentId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/posts/comments/${commentId}`);
  }
}
