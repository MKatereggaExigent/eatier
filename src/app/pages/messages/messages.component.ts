import { Component, OnInit, OnDestroy, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, ChevronLeft, Search, MessageSquare, ArrowRight, Mail, Send } from 'lucide-angular';
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
  imports: [CommonModule, FormsModule, LucideAngularModule, AvatarUploadComponent, AvatarContextMenuDirective],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss']
})
export class MessagesComponent implements OnInit, OnDestroy {
  readonly ChevronLeft = ChevronLeft;
  readonly Search = Search;
  readonly MessageSquare = MessageSquare;
  readonly ArrowRight = ArrowRight;
  readonly Mail = Mail;
  readonly Send = Send;

  conversations = signal<ChatConversation[]>([]);
  selectedConversation = signal<ChatConversation | null>(null);
  messages = signal<ChatMessage[]>([]);
  chatRequests = signal<ChatRequest[]>([]);

  newMessage = signal<string>('');
  loading = signal<boolean>(true);
  loadingMessages = signal<boolean>(false);
  sendingMessage = signal<boolean>(false);
  conversationError = signal<string>('');

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

  // Message pagination
  messagesPage = signal<number>(1);
  messagesLimit = 50;
  allMessagesLoaded = signal<boolean>(false);
  loadMoreLoading = signal<boolean>(false);

  private pollingSubscription?: Subscription;
  private currentUserId: string = '';
  private typingSubject = new Subject<string>();
  private typingTimeout: any;

  constructor(
    private messagingService: MessagingService,
    private route: ActivatedRoute,
    public router: Router,
    private websocketService: WebSocketService,
    private presenceService: PresenceService,
    private authService: AuthService
  ) {
    this.currentUserId = localStorage.getItem('userId') || '';

    this.typingSubject.pipe(
      debounceTime(3000)
    ).subscribe(conversationId => {
      this.websocketService.stopTyping(conversationId);
    });
  }

  currentUser = computed(() => this.authService.currentUser());

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

    this.websocketService.connect();
    this.presenceService.startHeartbeat();

    this.setupWebSocketListeners();

    this.route.params.subscribe(params => {
      const conversationId = params['id'];
      if (conversationId) {
        this.selectConversationById(conversationId);
      }
    });

    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();

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
    this.conversationError.set('');
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
        this.conversationError.set('Could not load conversations. Please try again.');
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

  onSearchChange(): void {
    const query = this.searchQuery().toLowerCase().trim();
    const allConversations = this.conversations();

    if (!query) {
      this.filteredConversations.set(allConversations);
      this.totalConversations.set(allConversations.length);
      return;
    }

    const filtered = allConversations.filter(conv => {
      const participantMatch = conv.participants?.some((p: any) => {
        const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
        return fullName.includes(query) || p.email?.toLowerCase().includes(query);
      });

      const messageMatch = conv.last_message?.content?.toLowerCase().includes(query);

      return participantMatch || messageMatch;
    });

    this.filteredConversations.set(filtered);
    this.totalConversations.set(filtered.length);
    this.conversationsPage.set(1);
  }

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

    this.router.navigate(['/messages', conversation.id], { replaceUrl: true });
  }

  selectConversationById(conversationId: string): void {
    const conversation = this.conversations().find(c => c.id === conversationId);
    if (conversation) {
      this.selectConversation(conversation);
    } else {
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
    this.messagesPage.set(1);
    this.allMessagesLoaded.set(false);
    this.messagingService.getMessages(conversationId, this.messagesLimit, 0).subscribe({
      next: (response) => {
        this.messages.set(response.messages);
        if (response.messages.length < this.messagesLimit) {
          this.allMessagesLoaded.set(true);
        }
        this.loadingMessages.set(false);

        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err) => {
        console.error('Error loading messages:', err);
        this.loadingMessages.set(false);
      }
    });
  }

  private loadMessagesSmooth(conversationId: string): void {
    this.messagingService.getMessages(conversationId, this.messagesLimit, 0).subscribe({
      next: (response) => {
        const currentMessages = this.messages();
        const newMessages = response.messages;

        if (newMessages.length > currentMessages.length) {
          const messagesToAdd = newMessages.filter(msg => {
            return !currentMessages.some(current => current.id === msg.id);
          });

          if (messagesToAdd.length > 0) {
            this.messages.set([...currentMessages, ...messagesToAdd]);

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

  loadMoreMessages(): void {
    const conversationId = this.selectedConversation()?.id;
    if (!conversationId || this.allMessagesLoaded() || this.loadMoreLoading()) return;

    this.loadMoreLoading.set(true);
    const nextPage = this.messagesPage() + 1;
    const offset = (nextPage - 1) * this.messagesLimit;

    this.messagingService.getMessages(conversationId, this.messagesLimit, offset).subscribe({
      next: (response) => {
        this.messages.update(current => [...response.messages, ...current]);
        this.messagesPage.set(nextPage);
        if (response.messages.length < this.messagesLimit) {
          this.allMessagesLoaded.set(true);
        }
        this.loadMoreLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading more messages:', err);
        this.loadMoreLoading.set(false);
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
        this.messages.update(msgs => [...msgs, response.data]);
        this.newMessage.set('');
        this.sendingMessage.set(false);

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

  private setupWebSocketListeners(): void {
    this.websocketService.onNewMessage((message: ChatMessage) => {
      const currentConv = this.selectedConversation();
      if (currentConv && message.conversation_id === currentConv.id) {
        const current = this.messages();
        this.messages.set([...current, message]);
        setTimeout(() => this.scrollToBottom(), 100);
      }

      this.loadConversations();
    });

    this.websocketService.onNewMessage((data: any) => {
    });

    this.websocketService.onPoke((poke: any) => {
      console.log('Received poke:', poke);
    });

    this.websocketService.onPresenceChange((data: { userId: string; status: string }) => {
      console.log('Presence changed:', data);
    });

    this.websocketService.onMessageReaction((data: { messageId: string; reaction: any }) => {
      console.log('Message reaction:', data);
    });
  }

  onMessageInput(): void {
    const currentConv = this.selectedConversation();
    if (!currentConv) return;

    this.websocketService.startTyping(currentConv.id);

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    this.typingTimeout = setTimeout(() => {
      this.websocketService.stopTyping(currentConv.id);
    }, 3000);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
    }
  }

  async sendFileMessage(): Promise<void> {
    const file = this.selectedFile();
    const currentConv = this.selectedConversation();

    if (!file || !currentConv) return;

    this.uploadingFile.set(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.messagingService['apiUrl']}/uploads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();

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

  addReaction(messageId: string, reaction: string): void {
    console.log('Adding reaction:', messageId, reaction);
  }

  acceptChatRequest(requestId: string): void {
    this.messagingService.respondToChatRequest(requestId, 'accepted').subscribe({
      next: () => {
        const updated = this.chatRequests().filter(r => r.id !== requestId);
        this.chatRequests.set(updated);

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

    if (participant?.profile_image_url || participant?.avatar_url) {
      return participant.profile_image_url || participant.avatar_url || '';
    }

    const seed = participant?.id || participant?.email || this.getParticipantName(conversation);
    const encodedSeed = encodeURIComponent(seed);
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodedSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`;
  }

  getRequesterName(request: ChatRequest): string {
    const name = `${request.first_name || ''} ${request.last_name || ''}`.trim();
    return name || request.email || 'Unknown User';
  }

  getRequesterAvatar(request: ChatRequest): string {
    if (request.profile_image_url || request.avatar_url) {
      return request.profile_image_url || request.avatar_url || '';
    }

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

  openAvatarUpload(): void {
    this.showAvatarUpload.set(true);
  }

  onAvatarUploaded(avatarUrl: string): void {
    console.log('Avatar uploaded:', avatarUrl);
    this.loadConversations();
    this.loadChatRequests();
  }

  closeAvatarUpload(): void {
    this.showAvatarUpload.set(false);
  }
}
