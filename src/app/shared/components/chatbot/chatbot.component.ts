import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';

import { CommonModule, DatePipe } from '@angular/common';
import { Subscription, firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

interface ChatMessage {
  text: string;
  isAI: boolean;
  timestamp: Date;
}

interface ChatResponse {
  response: string;
  context?: {
    pageName?: string;
    userRole?: string;
  };
}

interface ChatHistoryResponse {
  history: Array<{
    message: string;
    is_ai: boolean;
    created_at: string;
  }>;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/chat`;
  private routerSubscription?: Subscription;

  // State signals
  isOpen = signal<boolean>(false);
  isTyping = signal<boolean>(false);
  messages = signal<ChatMessage[]>([]);
  userInput = signal<string>('');
  currentPage = signal<string>('');
  currentUrl = signal<string>('');

  // Example prompts based on page
  examplePrompts = signal<string[]>([]);

  ngOnInit(): void {
    this.updatePageContext();
    this.loadChatHistory();

    // Listen to route changes
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updatePageContext();
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  /**
   * Update page context based on current route
   */
  updatePageContext(): void {
    const url = this.router.url;
    this.currentUrl.set(url);

    // Extract page name from URL
    let pageName = 'home';
    if (url.includes('/admin/insights/overview')) {
      pageName = 'admin-overview';
      this.examplePrompts.set([
        'What are the current platform statistics?',
        'How many users do we have?',
        'Show me recent activity'
      ]);
    } else if (url.includes('/admin/users')) {
      pageName = 'admin-users';
      this.examplePrompts.set([
        'How many users are registered?',
        'What can I do on this page?',
        'How do I manage user roles?'
      ]);
    } else if (url.includes('/admin/businesses')) {
      pageName = 'admin-businesses';
      this.examplePrompts.set([
        'How many businesses are verified?',
        'What is the business approval process?',
        'How do I verify a business?'
      ]);
    } else if (url.includes('/admin/bookings')) {
      pageName = 'admin-bookings';
      this.examplePrompts.set([
        'How many bookings are pending?',
        'What are the booking statuses?',
        'How do I manage bookings?'
      ]);
    } else if (url.includes('/admin/ads')) {
      pageName = 'admin-ads';
      this.examplePrompts.set([
        'How do I create a new ad?',
        'What are the ad placement options?',
        'How much budget has been spent?'
      ]);
    } else if (url.includes('/admin')) {
      pageName = 'admin-dashboard';
      this.examplePrompts.set([
        'What can I do as an admin?',
        'Show me platform overview',
        'How do I navigate the admin panel?'
      ]);
    } else if (url.includes('/dashboard/business')) {
      pageName = 'business-dashboard';
      this.examplePrompts.set([
        'How do I update my business profile?',
        'How many bookings do I have?',
        'How do I manage my menu?'
      ]);
    } else if (url.includes('/dashboard/user/overview') || url.includes('/dashboard/user') && !url.includes('/dashboard/user/')) {
      pageName = 'user-overview';
      this.examplePrompts.set([
        'How many reviews do I have?',
        'How many bookings have I made?',
        'What are my favorite restaurants?'
      ]);
    } else if (url.includes('/dashboard/user/bookings')) {
      pageName = 'bookings';
      this.examplePrompts.set([
        'How many bookings do I have?',
        'Do I have any upcoming reservations?',
        'Show me my pending bookings'
      ]);
    } else if (url.includes('/dashboard/user/reviews')) {
      pageName = 'user-reviews';
      this.examplePrompts.set([
        'How many reviews have I written?',
        'What is my average rating?',
        'Show me my recent reviews'
      ]);
    } else if (url.includes('/dashboard/user/favorites')) {
      pageName = 'user-favorites';
      this.examplePrompts.set([
        'How many favorites do I have?',
        'What restaurants have I saved?',
        'Show me my favorite places'
      ]);
    } else {
      this.examplePrompts.set([
        'What is Itiyum?',
        'How do I make a booking?',
        'How can I help you?'
      ]);
    }

    this.currentPage.set(pageName);
  }

  /**
   * Toggle chatbot open/close
   */
  toggleChat(): void {
    this.isOpen.set(!this.isOpen());

    if (this.isOpen() && this.messages().length === 0) {
      // Check if user is logged in
      const token = localStorage.getItem('itiyum_token');

      if (token) {
        // Logged-in user: Full access to personalized data
        this.addMessage(
          `Hello! I'm your Itiyum AI assistant. I have access to your account data and can help you with questions about your bookings, favorites, and more. How can I assist you today?`,
          true
        );
      } else {
        // Public user: Limited to general information
        this.addMessage(
          `Hello! I'm the Itiyum AI assistant. I can help you learn about our platform, discover restaurants, and answer general questions. Log in to access personalized assistance with your bookings and account!`,
          true
        );
      }
    }
  }

  /**
   * Send message to AI
   */
  async sendMessage(): Promise<void> {
    const message = this.userInput().trim();

    if (!message) {
      return;
    }

    // Add user message to chat
    this.addMessage(message, false);
    this.userInput.set('');
    this.isTyping.set(true);

    try {
      // Prepare page context
      const pageContext = {
        pageName: this.currentPage(),
        pageUrl: this.currentUrl(),
        pageData: this.getPageData()
      };

      // Get authentication token (using same key as AuthService)
      const token = localStorage.getItem('itiyum_token');

      let response: ChatResponse;

      if (token) {
        // Authenticated user: Use main chat API with full database access (RBAC + multi-tenancy)
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        });

        response = await firstValueFrom(
          this.http.post<ChatResponse>(this.apiUrl, {
            message,
            pageContext
          }, { headers })
        );
      } else {
        // Public user: Use public chat API (no database access, only public content)
        const headers = new HttpHeaders({
          'Content-Type': 'application/json'
        });

        response = await firstValueFrom(
          this.http.post<ChatResponse>(`${this.apiUrl}/public`, {
            message,
            pageContext
          }, { headers })
        );
      }

      // Add AI response to chat
      this.addMessage(response.response, true);

    } catch (error) {
      console.error('Error sending message:', error);
      this.addMessage(
        'Sorry, I encountered an error. Please try again later.',
        true
      );
    } finally {
      this.isTyping.set(false);
    }
  }

  /**
   * Send example prompt
   */
  sendExamplePrompt(prompt: string): void {
    this.userInput.set(prompt);
    this.sendMessage();
  }

  /**
   * Add message to chat
   */
  addMessage(text: string, isAI: boolean): void {
    const newMessage: ChatMessage = {
      text,
      isAI,
      timestamp: new Date()
    };

    this.messages.update(messages => [...messages, newMessage]);

    // Scroll to bottom
    setTimeout(() => this.scrollToBottom(), 100);
  }

  /**
   * Scroll chat to bottom
   */
  scrollToBottom(): void {
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  /**
   * Get page-specific data
   */
  getPageData(): any {
    // This can be extended to extract visible data from the current page
    return {};
  }

  /**
   * Load chat history
   */
  async loadChatHistory(): Promise<void> {
    try {
      const token = localStorage.getItem('itiyum_token');

      if (!token) {
        // User not logged in, skip loading history
        return;
      }

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      const response = await firstValueFrom(
        this.http.get<ChatHistoryResponse>(`${this.apiUrl}/history?limit=10`, { headers })
      );

      if (response.history && response.history.length > 0) {
        const historyMessages: ChatMessage[] = response.history.map((msg) => ({
          text: msg.message,
          isAI: msg.is_ai,
          timestamp: new Date(msg.created_at)
        }));

        this.messages.set(historyMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }

  /**
   * Clear chat history
   */
  async clearHistory(): Promise<void> {
    if (confirm('Are you sure you want to clear your chat history?')) {
      try {
        const token = localStorage.getItem('itiyum_token');

        if (!token) {
          alert('Please log in to clear chat history.');
          return;
        }

        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });

        await firstValueFrom(
          this.http.delete(`${this.apiUrl}/history`, { headers })
        );
        this.messages.set([]);
        this.addMessage(
          `Hello! I'm your Itiyum AI assistant. How can I help you today?`,
          true
        );
      } catch (error) {
        console.error('Error clearing chat history:', error);
        alert('Failed to clear chat history');
      }
    }
  }

  /**
   * Handle input change
   */
  onInputChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.userInput.set(target.value);
  }

  /**
   * Handle Enter key press
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}

