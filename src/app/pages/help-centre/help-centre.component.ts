import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, computed, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Interfaces
interface HelpArticle {
  id: string;
  title: string;
  content: string;
  icon: string;
  steps?: string[];
  relatedLinks?: { title: string; url: string; }[];
}

interface HelpCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  articles: HelpArticle[];
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
}

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'support';
  timestamp: Date;
}

@Component({
  selector: 'app-help-centre',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule],
  templateUrl: './help-centre.component.html',
  styleUrl: './help-centre.component.scss'
})
export class HelpCentreComponent implements OnInit, AfterViewInit {
  @ViewChild('chatMessagesContainer') chatMessagesRef!: ElementRef;

  // State management
  searchQuery = signal('');
  showContactModal = signal(false);
  showLiveChatModal = signal(false);
  isSubmitting = signal(false);
  isChatConnected = signal(false);
  chatInput = '';

  // Forms
  contactForm: FormGroup;

  // Chat messages
  chatMessages = signal<ChatMessage[]>([
    {
      id: '1',
      text: 'Hello! How can I help you today?',
      sender: 'support',
      timestamp: new Date()
    }
  ]);

  constructor(private fb: FormBuilder) {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    // Simulate chat connection
    setTimeout(() => {
      this.isChatConnected.set(true);
    }, 2000);
  }

  ngAfterViewInit(): void {
    // ViewChild is now available
    // Chat scrolling will be handled when messages are sent
  }

  // Help categories data
  helpCategories = signal<HelpCategory[]>([
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Learn the basics of using Itiyum',
      icon: '🚀',
      articles: [
        {
          id: 'create-account',
          title: 'How to create an account',
          icon: '👤',
          content: 'Creating an account on Itiyum is quick and easy. Follow these steps to get started.',
          steps: [
            'Click "Sign Up" in the top navigation',
            'Choose between User or Business account',
            'Fill in your details (name, email, password)',
            'Verify your email address',
            'Complete your profile setup'
          ],
          relatedLinks: [
            { title: 'Account Settings', url: '/settings' },
            { title: 'Privacy Policy', url: '/legal' }
          ]
        },
        {
          id: 'first-steps',
          title: 'Your first steps on Itiyum',
          icon: '👋',
          content: 'Welcome to Itiyum! Here\'s what you should do first to get the most out of the platform.',
          steps: [
            'Complete your profile with a photo and bio',
            'Explore restaurants in your area',
            'Follow your favorite restaurants',
            'Leave your first review',
            'Join the community discussions'
          ]
        }
      ]
    },
    {
      id: 'account-management',
      title: 'Account Management',
      description: 'Manage your account settings and preferences',
      icon: '⚙️',
      articles: [
        {
          id: 'update-profile',
          title: 'Update your profile information',
          icon: '✏️',
          content: 'Keep your profile up to date with the latest information about yourself.',
          steps: [
            'Go to your profile page',
            'Click "Edit Profile"',
            'Update your information',
            'Save your changes'
          ]
        },
        {
          id: 'change-password',
          title: 'Change your password',
          icon: '🔒',
          content: 'Keep your account secure by regularly updating your password.',
          steps: [
            'Go to Account Settings',
            'Click "Security"',
            'Enter your current password',
            'Enter your new password',
            'Confirm the change'
          ]
        },
        {
          id: 'delete-account',
          title: 'Delete your account',
          icon: '🗑️',
          content: 'If you need to delete your account, here\'s how to do it safely.',
          steps: [
            'Go to Account Settings',
            'Scroll to "Danger Zone"',
            'Click "Delete Account"',
            'Confirm your decision',
            'Your account will be permanently deleted'
          ]
        }
      ]
    },
    {
      id: 'business-features',
      title: 'Business Features',
      description: 'Tools and features for restaurant owners',
      icon: '🏪',
      articles: [
        {
          id: 'business-profile',
          title: 'Set up your business profile',
          icon: '🏢',
          content: 'Create a compelling business profile that attracts customers.',
          steps: [
            'Upgrade to a Business account',
            'Add your restaurant details',
            'Upload high-quality photos',
            'Set your operating hours',
            'Add your menu items'
          ]
        },
        {
          id: 'manage-reviews',
          title: 'Manage customer reviews',
          icon: '⭐',
          content: 'Learn how to respond to reviews and engage with customers.',
          steps: [
            'Monitor new reviews in your dashboard',
            'Respond professionally to all reviews',
            'Thank customers for positive feedback',
            'Address concerns in negative reviews',
            'Use feedback to improve your service'
          ]
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      description: 'Solutions to common problems',
      icon: '🔧',
      articles: [
        {
          id: 'login-issues',
          title: 'Can\'t log in to your account',
          icon: '🚪',
          content: 'Having trouble logging in? Here are some common solutions.',
          steps: [
            'Check your email and password are correct',
            'Try resetting your password',
            'Clear your browser cache and cookies',
            'Try a different browser or device',
            'Contact support if issues persist'
          ]
        },
        {
          id: 'app-not-loading',
          title: 'App not loading properly',
          icon: '📱',
          content: 'If the app isn\'t working correctly, try these troubleshooting steps.',
          steps: [
            'Check your internet connection',
            'Refresh the page or restart the app',
            'Clear your browser cache',
            'Update your browser to the latest version',
            'Try using a different device'
          ]
        }
      ]
    }
  ]);

  // Computed search results
  searchResults = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];

    const results: SearchResult[] = [];

    this.helpCategories().forEach(category => {
      // Search in category title and description
      if (category.title.toLowerCase().includes(query) ||
          category.description.toLowerCase().includes(query)) {
        results.push({
          id: category.id,
          title: category.title,
          description: category.description,
          icon: category.icon,
          category: 'Category'
        });
      }

      // Search in articles
      category.articles.forEach(article => {
        if (article.title.toLowerCase().includes(query) ||
            article.content.toLowerCase().includes(query)) {
          results.push({
            id: article.id,
            title: article.title,
            description: article.content.substring(0, 100) + '...',
            icon: article.icon,
            category: category.title
          });
        }
      });
    });

    return results.slice(0, 10); // Limit to 10 results
  });

  // Search functionality
  onSearch(): void {
    // Search is handled by computed property
    // This method can be used for analytics or other side effects
    if (this.searchQuery().trim()) {
      console.log('Searching for:', this.searchQuery());
    }
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Modal management
  openContactModal(): void {
    this.showContactModal.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeContactModal(): void {
    this.showContactModal.set(false);
    document.body.style.overflow = 'auto';
    this.contactForm.reset();
  }

  openLiveChatModal(): void {
    this.showLiveChatModal.set(true);
    document.body.style.overflow = 'hidden';
    // Simulate connection delay
    this.isChatConnected.set(false);
    setTimeout(() => {
      this.isChatConnected.set(true);
    }, 1500);
  }

  closeLiveChatModal(): void {
    this.showLiveChatModal.set(false);
    document.body.style.overflow = 'auto';
    this.chatInput = '';
  }

  // Contact form submission
  async submitContactForm(): Promise<void> {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Success
      alert('Thank you for contacting us! We\'ll get back to you within 24 hours.');
      this.closeContactModal();
    } catch (error) {
      alert('Sorry, there was an error sending your message. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // Chat functionality
  sendChatMessage(): void {
    const message = this.chatInput.trim();
    if (!message || !this.isChatConnected()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date()
    };

    this.chatMessages.update(messages => [...messages, userMessage]);
    this.chatInput = '';

    // Simulate support response
    setTimeout(() => {
      const responses = [
        "Thanks for your message! Let me help you with that.",
        "I understand your concern. Let me look into this for you.",
        "That's a great question! Here's what I can tell you...",
        "I'm here to help! Can you provide more details about the issue?",
        "Let me connect you with a specialist who can better assist you."
      ];

      const supportMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: responses[Math.floor(Math.random() * responses.length)],
        sender: 'support',
        timestamp: new Date()
      };

      this.chatMessages.update(messages => [...messages, supportMessage]);
      this.scrollChatToBottom();
    }, 1000 + Math.random() * 2000);

    this.scrollChatToBottom();
  }

  private scrollChatToBottom(): void {
    setTimeout(() => {
      if (this.chatMessagesRef) {
        const element = this.chatMessagesRef.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 100);
  }

  formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }
}
