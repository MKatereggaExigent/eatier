import { Component, OnInit, OnDestroy, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessagingService, ChatConversation, ChatMessage, ChatRequest } from '../../core/services/messaging.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { PresenceService } from '../../core/services/presence.service';
import { AuthService } from '../../core/services/auth.service';
import { interval, Subscription, Subject } from 'rxjs';
import { switchMap, debounceTime } from 'rxjs/operators';
import { AvatarUploadComponent } from '../../shared/components/avatar-upload/avatar-upload.component';
import { AvatarContextMenuDirective } from '../../shared/directives/avatar-context-menu.directive';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarUploadComponent, AvatarContextMenuDirective],
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
  showAvatarUpload = signal(false);

  // Search
  searchQuery = signal<string>('');
  filteredConversations = signal<ChatConversation[]>([]);

  // Pagination
  conversationsPage = signal<number>(1);
  conversationsLimit = signal<number>(20);
  totalConversations = signal<number>(0);
  totalPages = computed(() => Math.ceil(this.totalConversations() / this.conversationsLimit()));

  private pollingSubscription?: Subscription;
  private currentUserId: string = '';
  private typingSubject = new Subject<string>();
  private typingTimeout: any;

  constructor(
    private messagingService: MessagingService,
    private route: ActivatedRoute,
    public router: Router, // Make public so template can access it
    private websocketService: WebSocketService,
    private presenceService: PresenceService,
    private authService: AuthService
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

  // Get current user from auth service (computed property)
  currentUser = computed(() => this.authService.currentUser());

  // Computed property to get the correct social route based on user role
  socialRoute = computed(() => {
    const user = this.currentUser();
    if (!user) return '/dashboard/user/social';

    switch (user.role) {
      case 'specialist':
        return '/dashboard/specialist/social';
      case 'business_owner':
        return '/dashboard/business/social';
      case 'food_enthusiast':
        return '/dashboard/food-enthusiast/social';
      case 'normal_user':
        return '/dashboard/user/social';
      case 'itiyum_admin':
        return '/admin/social';
      default:
        return '/dashboard/user/social';
    }
  });

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

          // Reload messages smoothly if a conversation is selected
          if (this.selectedConversation()) {
            this.loadMessagesSmooth(this.selectedConversation()!.id);
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
    const limit = this.conversationsLimit();
    const offset = (this.conversationsPage() - 1) * limit;

    this.messagingService.getConversations(limit, offset).subscribe({
      next: (response) => {
        this.conversations.set(response.conversations);
        this.filteredConversations.set(response.conversations);
        this.totalConversations.set(response.conversations.length);
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

  // Search functionality
  onSearchChange(): void {
    const query = this.searchQuery().toLowerCase().trim();
    const allConversations = this.conversations();

    if (!query) {
      this.filteredConversations.set(allConversations);
      this.totalConversations.set(allConversations.length);
      return;
    }

    const filtered = allConversations.filter(conv => {
      // Search in participant names
      const participantMatch = conv.participants?.some((p: any) => {
        const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
        return fullName.includes(query) || p.email?.toLowerCase().includes(query);
      });

      // Search in last message
      const messageMatch = conv.last_message?.content?.toLowerCase().includes(query);

      return participantMatch || messageMatch;
    });

    this.filteredConversations.set(filtered);
    this.totalConversations.set(filtered.length);
    this.conversationsPage.set(1); // Reset to first page
  }

  // Pagination methods
  nextPage(): void {
    if (this.conversationsPage() < this.totalPages()) {
      this.conversationsPage.update(p => p + 1);
      this.loadConversations();
    }
  }

  previousPage(): void {
    if (this.conversationsPage() > 1) {
      this.conversationsPage.update(p => p - 1);
      this.loadConversations();
    }
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

  /**
   * Load messages smoothly without causing UI blink - used for polling
   */
  private loadMessagesSmooth(conversationId: string): void {
    // Don't show loading spinner for polling updates
    this.messagingService.getMessages(conversationId).subscribe({
      next: (response) => {
        const currentMessages = this.messages();
        const newMessages = response.messages;

        // Only update if there are new messages
        if (newMessages.length > currentMessages.length) {
          // Get the last message ID from current messages
          const lastCurrentMessageId = currentMessages.length > 0
            ? currentMessages[currentMessages.length - 1].id
            : null;

          // Find new messages that aren't already in the list
          const messagesToAdd = newMessages.filter(msg => {
            return !currentMessages.some(current => current.id === msg.id);
          });

          if (messagesToAdd.length > 0) {
            // Append only new messages
            this.messages.set([...currentMessages, ...messagesToAdd]);

            // Scroll to bottom only if user is already near the bottom
            setTimeout(() => {
              const container = document.querySelector('.messages-container');
              if (container) {
                const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
                if (isNearBottom) {
                  this.scrollToBottom();
                }
              }
            }, 50);
          }
        }
      },
      error: (err) => {
        console.error('Error loading messages smoothly:', err);
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

    // If participant has uploaded avatar, use it
    if (participant?.profile_image_url || participant?.avatar_url) {
      return participant.profile_image_url || participant.avatar_url || '';
    }

    // Otherwise use beautiful DiceBear avatar
    const seed = participant?.id || participant?.email || this.getParticipantName(conversation);
    const encodedSeed = encodeURIComponent(seed);
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodedSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`;
  }

  getRequesterName(request: ChatRequest): string {
    const name = `${request.first_name || ''} ${request.last_name || ''}`.trim();
    return name || request.email || 'Unknown User';
  }

  getRequesterAvatar(request: ChatRequest): string {
    // If requester has uploaded avatar, use it
    if (request.profile_image_url || request.avatar_url) {
      return request.profile_image_url || request.avatar_url || '';
    }

    // Otherwise use beautiful DiceBear avatar
    const seed = request.id || request.email || this.getRequesterName(request);
    const encodedSeed = encodeURIComponent(seed);
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodedSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`;
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

  /**
   * Open avatar upload modal
   */
  openAvatarUpload(): void {
    this.showAvatarUpload.set(true);
  }

  /**
   * Handle avatar uploaded successfully
   */
  onAvatarUploaded(avatarUrl: string): void {
    console.log('Avatar uploaded:', avatarUrl);
    // Refresh conversations to show new avatar
    this.loadConversations();
    this.loadChatRequests();
  }

  /**
   * Close avatar upload modal
   */
  closeAvatarUpload(): void {
    this.showAvatarUpload.set(false);
  }
}

