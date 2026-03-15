import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MessagingService, ChatConversation, ChatRequest } from '../../../core/services/messaging.service';

@Component({
  selector: 'app-messaging-widget',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './messaging-widget.component.html',
  styleUrls: ['./messaging-widget.component.scss']
})
export class MessagingWidgetComponent implements OnInit {
  conversations = signal<ChatConversation[]>([]);
  chatRequests = signal<ChatRequest[]>([]);
  unreadCount = signal<number>(0);
  pendingRequestsCount = signal<number>(0);
  loading = signal<boolean>(true);
  activeTab = signal<'conversations' | 'requests'>('conversations');

  constructor(public messagingService: MessagingService) {}

  ngOnInit(): void {
    this.loadMessagingData();
    
    // Subscribe to real-time updates
    this.messagingService.conversations$.subscribe(conversations => {
      this.conversations.set(conversations.slice(0, 5)); // Show only 5 recent
    });

    this.messagingService.unreadCount$.subscribe(count => {
      this.unreadCount.set(count);
    });
  }

  loadMessagingData(): void {
    this.loading.set(true);

    // Load conversations
    this.messagingService.getConversations(5, 0).subscribe({
      next: (response) => {
        this.conversations.set(response.conversations);
        const totalUnread = response.conversations.reduce(
          (sum, conv) => sum + (conv.unread_count || 0),
          0
        );
        this.unreadCount.set(totalUnread);
      },
      error: (err) => console.error('Error loading conversations:', err)
    });

    // Load chat requests
    this.messagingService.getChatRequests('received').subscribe({
      next: (response) => {
        this.chatRequests.set(response.requests);
        this.pendingRequestsCount.set(response.requests.length);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading chat requests:', err);
        this.loading.set(false);
      }
    });
  }

  setActiveTab(tab: 'conversations' | 'requests'): void {
    this.activeTab.set(tab);
  }

  acceptChatRequest(requestId: string): void {
    this.messagingService.respondToChatRequest(requestId, 'accepted').subscribe({
      next: () => {
        // Remove from requests list
        const updated = this.chatRequests().filter(r => r.id !== requestId);
        this.chatRequests.set(updated);
        this.pendingRequestsCount.set(updated.length);
        
        // Reload conversations to show the new one
        this.messagingService.refreshConversations();
      },
      error: (err) => console.error('Error accepting chat request:', err)
    });
  }

  declineChatRequest(requestId: string): void {
    this.messagingService.respondToChatRequest(requestId, 'declined').subscribe({
      next: () => {
        // Remove from requests list
        const updated = this.chatRequests().filter(r => r.id !== requestId);
        this.chatRequests.set(updated);
        this.pendingRequestsCount.set(updated.length);
      },
      error: (err) => console.error('Error declining chat request:', err)
    });
  }

  getParticipantName(conversation: ChatConversation): string {
    if (conversation.conversation_type === 'group') {
      return conversation.title || 'Group Chat';
    }
    
    const participant = conversation.participants?.[0];
    if (!participant) return 'Unknown';
    
    return `${participant.first_name || ''} ${participant.last_name || ''}`.trim() || participant.email;
  }

  getParticipantAvatar(conversation: ChatConversation): string {
    const participant = conversation.participants?.[0];
    return participant?.profile_image_url || '/assets/images/default-avatar.png';
  }

  getRequesterName(request: ChatRequest): string {
    return `${request.first_name || ''} ${request.last_name || ''}`.trim() || request.email;
  }

  getRequesterAvatar(request: ChatRequest): string {
    return request.profile_image_url || '/assets/images/default-avatar.png';
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  truncateMessage(message: string, maxLength: number = 50): string {
    if (!message) return '';
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  }
}

