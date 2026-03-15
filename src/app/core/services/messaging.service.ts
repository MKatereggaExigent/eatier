import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ChatRequest {
  id: string;
  tenant_id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  message?: string;
  responded_at?: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  profile_image_url?: string;
}

export interface ChatParticipant {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image_url?: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  content: string;
  attachments?: any[];
  metadata?: any;
  is_edited: boolean;
  edited_at?: string;
  is_deleted: boolean;
  deleted_at?: string;
  reply_to_message_id?: string;
  created_at: string;
  sender_first_name?: string;
  sender_last_name?: string;
  sender_avatar?: string;
  read_by?: Array<{ user_id: string; read_at: string }>;
}

export interface ChatConversation {
  id: string;
  tenant_id: string;
  conversation_type: 'direct' | 'group';
  title?: string;
  created_by: string;
  last_message_at: string;
  is_active: boolean;
  metadata?: any;
  created_at: string;
  updated_at: string;
  unread_count: number;
  last_read_at?: string;
  is_muted: boolean;
  is_archived: boolean;
  participants: ChatParticipant[];
  last_message?: {
    content: string;
    sender_id: string;
    created_at: string;
    message_type: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private apiUrl = `${environment.apiUrl}/messaging`;
  
  // Real-time updates
  private conversationsSubject = new BehaviorSubject<ChatConversation[]>([]);
  public conversations$ = this.conversationsSubject.asObservable();
  
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {
    // Poll for new messages every 10 seconds
    this.startPolling();
  }

  /**
   * Start polling for new messages
   */
  private startPolling(): void {
    interval(10000) // Poll every 10 seconds
      .pipe(
        switchMap(() => this.getConversations())
      )
      .subscribe({
        next: (response) => {
          this.conversationsSubject.next(response.conversations);
          const totalUnread = response.conversations.reduce(
            (sum, conv) => sum + (conv.unread_count || 0),
            0
          );
          this.unreadCountSubject.next(totalUnread);
        },
        error: (err) => console.error('Error polling conversations:', err)
      });
  }

  /**
   * Send a chat request
   */
  sendChatRequest(recipientId: string, message?: string): Observable<{ message: string; request: ChatRequest }> {
    return this.http.post<{ message: string; request: ChatRequest }>(
      `${this.apiUrl}/request`,
      { recipientId, message }
    );
  }

  /**
   * Accept or decline a chat request
   */
  respondToChatRequest(requestId: string, status: 'accepted' | 'declined'): Observable<any> {
    return this.http.patch(`${this.apiUrl}/request/${requestId}`, { status });
  }

  /**
   * Get chat requests
   */
  getChatRequests(type: 'received' | 'sent' = 'received'): Observable<{ requests: ChatRequest[] }> {
    const params = new HttpParams().set('type', type);
    return this.http.get<{ requests: ChatRequest[] }>(
      `${this.apiUrl}/requests`,
      { params }
    );
  }

  /**
   * Get all conversations
   */
  getConversations(limit: number = 50, offset: number = 0): Observable<{ conversations: ChatConversation[] }> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());
    
    return this.http.get<{ conversations: ChatConversation[] }>(
      `${this.apiUrl}/conversations`,
      { params }
    ).pipe(
      tap(response => {
        this.conversationsSubject.next(response.conversations);
        const totalUnread = response.conversations.reduce(
          (sum, conv) => sum + (conv.unread_count || 0),
          0
        );
        this.unreadCountSubject.next(totalUnread);
      })
    );
  }

  /**
   * Get messages for a conversation
   */
  getMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0,
    before?: string
  ): Observable<{ messages: ChatMessage[] }> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());
    
    if (before) {
      params = params.set('before', before);
    }

    return this.http.get<{ messages: ChatMessage[] }>(
      `${this.apiUrl}/conversations/${conversationId}/messages`,
      { params }
    );
  }

  /**
   * Send a message
   */
  sendMessage(
    conversationId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    attachments?: any[],
    replyToMessageId?: string
  ): Observable<{ message: string; data: ChatMessage }> {
    return this.http.post<{ message: string; data: ChatMessage }>(
      `${this.apiUrl}/conversations/${conversationId}/messages`,
      {
        content,
        messageType,
        attachments,
        replyToMessageId
      }
    );
  }

  /**
   * Refresh conversations manually
   */
  refreshConversations(): void {
    this.getConversations().subscribe();
  }
}

