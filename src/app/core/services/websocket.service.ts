import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface TypingUser {
  userId: string;
  conversationId: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  connected = signal<boolean>(false);
  typingUsers = signal<Map<string, TypingUser[]>>(new Map());

  constructor(private authService: AuthService) {}

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    const token = this.authService.getToken();
    
    if (!token) {
      console.error('No auth token available for WebSocket connection');
      return;
    }

    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    const socketUrl = environment.apiUrl.replace('/api', '');
    
    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts
    });

    this.setupEventListeners();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected.set(false);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.connected.set(true);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.connected.set(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    // Typing indicators
    this.socket.on('user:typing', (data: TypingUser) => {
      this.addTypingUser(data.conversationId, data);
    });

    this.socket.on('user:stopped-typing', (data: TypingUser) => {
      this.removeTypingUser(data.conversationId, data.userId);
    });
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string): void {
    this.socket?.emit('join:conversation', conversationId);
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string): void {
    this.socket?.emit('leave:conversation', conversationId);
  }

  /**
   * Emit typing start
   */
  startTyping(conversationId: string): void {
    this.socket?.emit('typing:start', conversationId);
  }

  /**
   * Emit typing stop
   */
  stopTyping(conversationId: string): void {
    this.socket?.emit('typing:stop', conversationId);
  }

  /**
   * Update presence status
   */
  updatePresence(status: 'online' | 'away' | 'offline' | 'busy'): void {
    this.socket?.emit('presence:update', status);
  }

  /**
   * Listen for new messages
   */
  onNewMessage(callback: (message: any) => void): void {
    this.socket?.on('message:new', callback);
  }

  /**
   * Listen for pokes
   */
  onPoke(callback: (poke: any) => void): void {
    this.socket?.on('poke:received', callback);
  }

  /**
   * Listen for presence changes
   */
  onPresenceChange(callback: (data: { userId: string; status: string }) => void): void {
    this.socket?.on('presence:changed', callback);
  }

  /**
   * Listen for message reactions
   */
  onMessageReaction(callback: (data: { messageId: string; reaction: any }) => void): void {
    this.socket?.on('message:reaction', callback);
  }

  /**
   * Add typing user to conversation
   */
  private addTypingUser(conversationId: string, user: TypingUser): void {
    const current = this.typingUsers();
    const users = current.get(conversationId) || [];
    
    if (!users.find(u => u.userId === user.userId)) {
      users.push(user);
      current.set(conversationId, users);
      this.typingUsers.set(new Map(current));
    }
  }

  /**
   * Remove typing user from conversation
   */
  private removeTypingUser(conversationId: string, userId: string): void {
    const current = this.typingUsers();
    const users = current.get(conversationId) || [];
    const filtered = users.filter(u => u.userId !== userId);
    
    current.set(conversationId, filtered);
    this.typingUsers.set(new Map(current));
  }

  /**
   * Get typing users for a conversation
   */
  getTypingUsers(conversationId: string): TypingUser[] {
    return this.typingUsers().get(conversationId) || [];
  }
}

