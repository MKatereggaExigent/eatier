import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorType: 'chef' | 'business' | 'user';
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  shares: number;
  createdAt: Date;
  isLiked: boolean;
  tags: string[];
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  likes: number;
  createdAt: Date;
  isLiked: boolean;
}

export interface FeaturedChef {
  id: string;
  name: string;
  avatar: string;
  specialty: string;
  followers: number;
  isFollowing: boolean;
}

export interface TrendingTopic {
  name: string;
  count: number;
}

export interface PostsResponse {
  posts: CommunityPost[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class CommunityService {

  constructor(private api: ApiService) {}

  // Get community posts
  getPosts(params?: {
    page?: number;
    limit?: number;
    author_type?: 'chef' | 'business' | 'user';
  }): Observable<PostsResponse> {
    return this.api.get<PostsResponse>('community/posts', params);
  }

  // Create a new post
  createPost(post: {
    content: string;
    images?: string[];
    tags?: string[];
    authorId: string;
  }): Observable<CommunityPost> {
    return this.api.post<CommunityPost>('community/posts', post);
  }

  // Toggle like on a post
  togglePostLike(postId: string, userId: string): Observable<{
    isLiked: boolean;
    likesCount: number;
    change: number;
  }> {
    return this.api.post(`community/posts/${postId}/like`, { userId });
  }

  // Share a post
  sharePost(postId: string): Observable<any> {
    return this.api.post(`community/posts/${postId}/share`, {});
  }

  // Get trending topics
  getTrendingTopics(): Observable<TrendingTopic[]> {
    return this.api.get<TrendingTopic[]>('community/trending');
  }

  // Get featured chefs
  getFeaturedChefs(): Observable<FeaturedChef[]> {
    return this.api.get<FeaturedChef[]>('community/featured-chefs');
  }

  // Follow/unfollow a chef
  toggleChefFollow(chefId: string, userId: string): Observable<{
    isFollowing: boolean;
    followersCount: number;
    change: number;
  }> {
    return this.api.post(`community/chefs/${chefId}/follow`, { userId });
  }

  // Get post comments
  getPostComments(postId: string, params?: {
    page?: number;
    limit?: number;
  }): Observable<{
    comments: CommunityComment[];
    pagination: any;
  }> {
    return this.api.get(`community/posts/${postId}/comments`, params);
  }

  // Add comment to post
  addComment(postId: string, comment: {
    content: string;
    authorId: string;
  }): Observable<CommunityComment> {
    return this.api.post(`community/posts/${postId}/comments`, comment);
  }

  // Toggle like on a comment
  toggleCommentLike(commentId: string, userId: string): Observable<{
    isLiked: boolean;
    likesCount: number;
    change: number;
  }> {
    return this.api.post(`community/comments/${commentId}/like`, { userId });
  }

  // Search posts
  searchPosts(query: string, params?: {
    page?: number;
    limit?: number;
    author_type?: string;
  }): Observable<PostsResponse> {
    return this.api.get('community/posts/search', { ...params, q: query });
  }

  // Get posts by tag
  getPostsByTag(tag: string, params?: {
    page?: number;
    limit?: number;
  }): Observable<PostsResponse> {
    return this.api.get('community/posts/tag', { ...params, tag });
  }

  // Report a post
  reportPost(postId: string, reason: string): Observable<any> {
    return this.api.post(`community/posts/${postId}/report`, { reason });
  }

  // Get user's posts
  getUserPosts(userId: string, params?: {
    page?: number;
    limit?: number;
  }): Observable<PostsResponse> {
    return this.api.get(`community/users/${userId}/posts`, params);
  }

  // Get user's liked posts
  getUserLikedPosts(userId: string, params?: {
    page?: number;
    limit?: number;
  }): Observable<PostsResponse> {
    return this.api.get(`community/users/${userId}/liked-posts`, params);
  }
}
