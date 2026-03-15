import { Component, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessagingService, ChatConversation, ChatMessage, ChatRequest } from '../../core/services/messaging.service';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss']
})
export class MessagesComponent implements OnInit, OnDestroy {
  conversations = signal<ChatConversation[]>([]);
  selectedConversation = signal<ChatConversation | null>(null);
  messages = signal<ChatMessage[]>([]);
  chatRequests = signal<ChatRequest[]>([]);
  
  newMessage = signal<string>('');
  loading = signal<boolean>(true);
  loadingMessages = signal<boolean>(false);
  sendingMessage = signal<boolean>(false);
  
  activeView = signal<'conversations' | 'requests'>('conversations');
  
  private pollingSubscription?: Subscription;
  private currentUserId: string = '';

  constructor(
    private messagingService: MessagingService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Get current user ID from localStorage
    this.currentUserId = localStorage.getItem('userId') || '';
  }

  ngOnInit(): void {
    this.loadConversations();
    this.loadChatRequests();
    
    // Check if there's a conversation ID in the route
    this.route.params.subscribe(params => {
      const conversationId = params['id'];
      if (conversationId) {
        this.selectConversationById(conversationId);
      }
    });

    // Start polling for new messages every 5 seconds
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private startPolling(): void {
    this.pollingSubscription = interval(5000)
      .pipe(
        switchMap(() => this.messagingService.getConversations())
      )
      .subscribe({
        next: (response) => {
          this.conversations.set(response.conversations);
          
          // Reload messages if a conversation is selected
          if (this.selectedConversation()) {
            this.loadMessages(this.selectedConversation()!.id);
          }
        },
        error: (err) => console.error('Error polling conversations:', err)
      });
  }

  private stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  loadConversations(): void {
    this.loading.set(true);
    this.messagingService.getConversations().subscribe({
      next: (response) => {
        this.conversations.set(response.conversations);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading conversations:', err);
        this.loading.set(false);
      }
    });
  }

  loadChatRequests(): void {
    this.messagingService.getChatRequests('received').subscribe({
      next: (response) => {
        this.chatRequests.set(response.requests);
      },
      error: (err) => console.error('Error loading chat requests:', err)
    });
  }

  selectConversation(conversation: ChatConversation): void {
    this.selectedConversation.set(conversation);
    this.loadMessages(conversation.id);
    
    // Update URL
    this.router.navigate(['/messages', conversation.id], { replaceUrl: true });
  }

  selectConversationById(conversationId: string): void {
    const conversation = this.conversations().find(c => c.id === conversationId);
    if (conversation) {
      this.selectConversation(conversation);
    } else {
      // Load conversation from API
      this.messagingService.getConversations().subscribe({
        next: (response) => {
          const conv = response.conversations.find(c => c.id === conversationId);
          if (conv) {
            this.selectConversation(conv);
          }
        }
      });
    }
  }

  loadMessages(conversationId: string): void {
    this.loadingMessages.set(true);
    this.messagingService.getMessages(conversationId).subscribe({
      next: (response) => {
        this.messages.set(response.messages);
        this.loadingMessages.set(false);
        
        // Scroll to bottom
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err) => {
        console.error('Error loading messages:', err);
        this.loadingMessages.set(false);
      }
    });
  }

  sendMessage(): void {
    const content = this.newMessage().trim();
    if (!content || !this.selectedConversation()) return;

    this.sendingMessage.set(true);
    this.messagingService.sendMessage(
      this.selectedConversation()!.id,
      content
    ).subscribe({
      next: (response) => {
        // Add message to list
        this.messages.update(msgs => [...msgs, response.data]);
        this.newMessage.set('');
        this.sendingMessage.set(false);
        
        // Scroll to bottom
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err) => {
        console.error('Error sending message:', err);
        this.sendingMessage.set(false);
      }
    });
  }

  private scrollToBottom(): void {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  acceptChatRequest(requestId: string): void {
    this.messagingService.respondToChatRequest(requestId, 'accepted').subscribe({
      next: () => {
        // Remove from requests
        const updated = this.chatRequests().filter(r => r.id !== requestId);
        this.chatRequests.set(updated);

        // Reload conversations
        this.loadConversations();
        this.activeView.set('conversations');
      },
      error: (err) => console.error('Error accepting request:', err)
    });
  }

  declineChatRequest(requestId: string): void {
    this.messagingService.respondToChatRequest(requestId, 'declined').subscribe({
      next: () => {
        const updated = this.chatRequests().filter(r => r.id !== requestId);
        this.chatRequests.set(updated);
      },
      error: (err) => console.error('Error declining request:', err)
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
    const name = `${request.first_name || ''} ${request.last_name || ''}`.trim();
    return name || request.email || 'Unknown User';
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

  formatMessageTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  isMyMessage(message: ChatMessage): boolean {
    return message.sender_id === this.currentUserId;
  }

  setActiveView(view: 'conversations' | 'requests'): void {
    this.activeView.set(view);
  }
}

