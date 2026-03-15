import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserPresence {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string;
  role: string;
  status: 'online' | 'away' | 'offline' | 'busy';
  last_seen: string;
  last_activity: string;
  is_following?: boolean;
  is_follower?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PresenceService {
  private apiUrl = `${environment.apiUrl}/presence`;
  private heartbeatSubscription?: Subscription;
  
  onlineUsers = signal<UserPresence[]>([]);
  currentUserStatus = signal<'online' | 'away' | 'offline' | 'busy'>('offline');

  constructor(private http: HttpClient) {}

  /**
   * Update user's presence status
   */
  updateStatus(status: 'online' | 'away' | 'offline' | 'busy', deviceInfo?: any): Observable<any> {
    this.currentUserStatus.set(status);
    return this.http.post(`${this.apiUrl}/update`, { status, deviceInfo });
  }

  /**
   * Send heartbeat to keep presence alive
   */
  sendHeartbeat(): Observable<any> {
    return this.http.post(`${this.apiUrl}/heartbeat`, {});
  }

  /**
   * Start heartbeat interval (every 30 seconds)
   */
  startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    // Set initial status to online
    this.updateStatus('online').subscribe();
    
    // Send heartbeat every 30 seconds
    this.heartbeatSubscription = interval(30000).subscribe(() => {
      this.sendHeartbeat().subscribe({
        error: (err) => console.error('Heartbeat error:', err)
      });
    });
  }

  /**
   * Stop heartbeat and set status to offline
   */
  stopHeartbeat(): void {
    if (this.heartbeatSubscription) {
      this.heartbeatSubscription.unsubscribe();
      this.heartbeatSubscription = undefined;
    }
    this.updateStatus('offline').subscribe();
  }

  /**
   * Get list of online users
   */
  getOnlineUsers(): Observable<{ online_users: UserPresence[]; count: number }> {
    return this.http.get<{ online_users: UserPresence[]; count: number }>(`${this.apiUrl}/online`);
  }

  /**
   * Get specific user's status
   */
  getUserStatus(userId: string): Observable<{ status: string; last_seen: string | null }> {
    return this.http.get<{ status: string; last_seen: string | null }>(`${this.apiUrl}/status/${userId}`);
  }

  /**
   * Refresh online users list
   */
  refreshOnlineUsers(): void {
    this.getOnlineUsers().subscribe({
      next: (response) => {
        this.onlineUsers.set(response.online_users);
      },
      error: (err) => console.error('Error fetching online users:', err)
    });
  }

  /**
   * Get status color for UI indicators
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'online':
        return '#10b981'; // Green
      case 'away':
        return '#f59e0b'; // Amber
      case 'busy':
        return '#ef4444'; // Red
      case 'offline':
      default:
        return '#6b7280'; // Gray
    }
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'busy':
        return 'Busy';
      case 'offline':
      default:
        return 'Offline';
    }
  }
}

