import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Poke {
  id: string;
  tenant_id: string;
  poker_id: string;
  poked_id: string;
  message: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  poker_first_name?: string;
  poker_last_name?: string;
  poker_avatar_url?: string;
  poker_role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PokesService {
  private apiUrl = `${environment.apiUrl}/pokes`;
  
  unreadCount = signal<number>(0);
  receivedPokes = signal<Poke[]>([]);

  constructor(private http: HttpClient) {}

  /**
   * Send a poke to a user
   */
  sendPoke(pokedId: string, message?: string): Observable<{ message: string; poke: Poke }> {
    return this.http.post<{ message: string; poke: Poke }>(`${this.apiUrl}/send`, {
      pokedId,
      message
    });
  }

  /**
   * Get received pokes
   */
  getReceivedPokes(unreadOnly: boolean = false): Observable<{ pokes: Poke[]; unread_count: number }> {
    const params: any = unreadOnly ? { unread: 'true' } : {};
    return this.http.get<{ pokes: Poke[]; unread_count: number }>(`${this.apiUrl}/received`, { params });
  }

  /**
   * Mark poke as read
   */
  markAsRead(pokeId: string): Observable<{ message: string; poke: Poke }> {
    return this.http.put<{ message: string; poke: Poke }>(`${this.apiUrl}/${pokeId}/read`, {});
  }

  /**
   * Get unread poke count
   */
  getUnreadCount(): Observable<{ unread_count: number }> {
    return this.http.get<{ unread_count: number }>(`${this.apiUrl}/unread-count`);
  }

  /**
   * Refresh pokes and update signals
   */
  refreshPokes(): void {
    this.getReceivedPokes().subscribe({
      next: (response) => {
        this.receivedPokes.set(response.pokes);
        this.unreadCount.set(response.unread_count);
      },
      error: (err) => console.error('Error fetching pokes:', err)
    });
  }

  /**
   * Refresh unread count only
   */
  refreshUnreadCount(): void {
    this.getUnreadCount().subscribe({
      next: (response) => {
        this.unreadCount.set(response.unread_count);
      },
      error: (err) => console.error('Error fetching unread count:', err)
    });
  }
}

