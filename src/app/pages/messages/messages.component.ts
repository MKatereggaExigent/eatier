import { Component, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessagingService, ChatConversation, ChatMessage, ChatRequest } from '../../core/services/messaging.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { PresenceService } from '../../core/services/presence.service';
import { interval, Subscription, Subject } from 'rxjs';
import { switchMap, debounceTime } from 'rxjs/operators';

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
  typingUsers = signal<string[]>([]);
  uploadingFile = signal<boolean>(false);
  selectedFile = signal<File | null>(null);

  private pollingSubscription?: Subscription;
  private currentUserId: string = '';
  private typingSubject = new Subject<string>();
  private typingTimeout: any;

  constructor(
    private messagingService: MessagingService,
    private route: ActivatedRoute,
    public router: Router, // Make public so template can access it
    private websocketService: WebSocketService,
    private presenceService: PresenceService
  ) {
    // Get current user ID from localStorage
    this.currentUserId = localStorage.getItem('userId') || '';

    // Setup typing debounce
    this.typingSubject.pipe(
      debounceTime(3000)
    ).subscribe(conversationId => {
      this.websocketService.stopTyping(conversationId);
    });
  }

  ngOnInit(): void {
    this.loadConversations();
    this.loadChatRequests();

    // Connect to WebSocket
    this.websocketService.connect();
    this.presenceService.startHeartbeat();

    // Setup WebSocket listeners
    this.setupWebSocketListeners();

    // Check if there's a conversation ID in the route
    this.route.params.subscribe(params => {
      const conversationId = params['id'];
      if (conversationId) {
        this.selectConversationById(conversationId);
      }
    });

    // Start polling for new messages every 5 seconds (fallback)
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();

    // Leave current conversation
    const currentConv = this.selectedConversation();
    if (currentConv) {
      this.websocketService.leaveConversation(currentConv.id);
    }

    this.presenceService.stopHeartbeat();
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

  /**
   * Setup WebSocket event listeners
   */
  private setupWebSocketListeners(): void {
    // Listen for new messages
    this.websocketService.onNewMessage((message: ChatMessage) => {
      const currentConv = this.selectedConversation();
      if (currentConv && message.conversation_id === currentConv.id) {
        const current = this.messages();
        this.messages.set([...current, message]);
        setTimeout(() => this.scrollToBottom(), 100);
      }

      // Update conversation list
      this.loadConversations();
    });

    // Listen for typing indicators
    this.websocketService.onNewMessage((data: any) => {
      // Typing indicators are handled via the typingUsers signal
    });

    // Listen for pokes
    this.websocketService.onPoke((poke: any) => {
      console.log('Received poke:', poke);
      // Could show a notification here
    });

    // Listen for presence changes
    this.websocketService.onPresenceChange((data: { userId: string; status: string }) => {
      console.log('Presence changed:', data);
      // Update UI to reflect presence changes
    });

    // Listen for reactions
    this.websocketService.onMessageReaction((data: { messageId: string; reaction: any }) => {
      console.log('Message reaction:', data);
      // Update message with new reaction
    });
  }

  /**
   * Handle typing in message input
   */
  onMessageInput(): void {
    const currentConv = this.selectedConversation();
    if (!currentConv) return;

    // Emit typing start
    this.websocketService.startTyping(currentConv.id);

    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Set new timeout to stop typing after 3 seconds
    this.typingTimeout = setTimeout(() => {
      this.websocketService.stopTyping(currentConv.id);
    }, 3000);
  }

  /**
   * Handle file selection
   */
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
    }
  }

  /**
   * Upload and send file
   */
  async sendFileMessage(): Promise<void> {
    const file = this.selectedFile();
    const currentConv = this.selectedConversation();

    if (!file || !currentConv) return;

    this.uploadingFile.set(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload file (you'll need to implement this endpoint)
      const response = await fetch(`${this.messagingService['apiUrl']}/uploads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();

      // Send message with file attachment
      this.messagingService.sendMessage(currentConv.id, {
        content: file.name,
        messageType: 'file',
        fileUrl: data.fileUrl,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      }).subscribe({
        next: () => {
          this.selectedFile.set(null);
          this.uploadingFile.set(false);
          this.loadMessages(currentConv.id);
        },
        error: (err) => {
          console.error('Error sending file:', err);
          this.uploadingFile.set(false);
        }
      });

    } catch (error) {
      console.error('Error uploading file:', error);
      this.uploadingFile.set(false);
    }
  }

  /**
   * Add reaction to message
   */
  addReaction(messageId: string, reaction: string): void {
    // Call messaging service to add reaction
    // This will be implemented in the messaging service
    console.log('Adding reaction:', messageId, reaction);
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

