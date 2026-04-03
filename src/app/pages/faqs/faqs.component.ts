import { Component, computed, signal } from '@angular/core';
import { LucideAngularModule, HelpCircle, Search, ClipboardList, Rocket, Store, UtensilsCrossed, ChefHat, Wrench, Lock, MessageCircle, FileText, Zap, Target, ThumbsUp, ThumbsDown } from 'lucide-angular';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  isExpanded?: boolean;
  helpfulVotes: number;
  totalVotes: number;
  lastUpdated: Date;
}

interface FAQCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  faqs: FAQ[];
}

interface FAQStats {
  totalFAQs: number;
  totalCategories: number;
  mostHelpfulFAQ: FAQ | null;
  recentlyUpdated: FAQ[];
}

@Component({
  selector: 'app-faqs',
  standalone: true,
  templateUrl: './faqs.component.html',
  styleUrls: ['./faqs.component.scss'],
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule]
})
export class FaqsComponent {
  // Lucide Icons
  readonly HelpCircle = HelpCircle;
  readonly Search = Search;
  readonly ClipboardList = ClipboardList;
  readonly Rocket = Rocket;
  readonly Store = Store;
  readonly UtensilsCrossed = UtensilsCrossed;
  readonly ChefHat = ChefHat;
  readonly Wrench = Wrench;
  readonly Lock = Lock;
  readonly MessageCircle = MessageCircle;
  readonly FileText = FileText;
  readonly Zap = Zap;
  readonly Target = Target;
  readonly ThumbsUp = ThumbsUp;
  readonly ThumbsDown = ThumbsDown;

  // State management
  searchQuery = signal('');
  selectedCategory = signal('all');
  expandedFAQs = signal<Set<string>>(new Set());
  showFeedbackModal = signal(false);
  selectedFAQForFeedback = signal<FAQ | null>(null);

  // FAQ data
  faqCategories = signal<FAQCategory[]>([
    {
      id: 'getting-started',
      name: 'Getting Started',
      description: 'Everything you need to know to begin your Itiyum journey',
      icon: 'rocket',
      color: 'category-getting-started',
      faqs: [
        {
          id: 'gs-1',
          question: 'How do I create an account on Itiyum?',
          answer: 'Creating an account is simple! Click the "Sign Up" button in the top right corner, choose your account type (Normal User, Food Enthusiast, Business Owner, or Specialist), fill in your details, and verify your email. You\'ll be ready to explore Itiyum in minutes!',
          category: 'getting-started',
          tags: ['account', 'signup', 'registration'],
          helpfulVotes: 245,
          totalVotes: 267,
          lastUpdated: new Date('2024-01-15')
        },
        {
          id: 'gs-2',
          question: 'What are the different types of accounts available?',
          answer: 'Itiyum offers 5 account types: <br><br><strong>Normal User:</strong> Basic food discovery and booking<br><strong>Food Enthusiast:</strong> Advanced features, reviews, social following<br><strong>Business Owner:</strong> Restaurant management, menu control, analytics<br><strong>Specialist:</strong> Chef/catering services, portfolio management<br><strong>Itiyum Admin:</strong> Platform management (by invitation only)',
          category: 'getting-started',
          tags: ['account types', 'user roles', 'features'],
          helpfulVotes: 189,
          totalVotes: 203,
          lastUpdated: new Date('2024-01-20')
        },
        {
          id: 'gs-3',
          question: 'Is Itiyum free to use?',
          answer: 'Yes! Itiyum is free for Normal Users and Food Enthusiasts. Business Owners have a free trial period, then subscription plans starting at $29/month. Specialists can list their services for free with optional premium features available.',
          category: 'getting-started',
          tags: ['pricing', 'free', 'subscription'],
          helpfulVotes: 156,
          totalVotes: 178,
          lastUpdated: new Date('2024-01-18')
        },
        {
          id: 'gs-4',
          question: 'How do I reset my password?',
          answer: 'Click "Forgot Password" on the login page, enter your email address, and we\'ll send you a secure reset link. The link expires in 24 hours for security. If you don\'t receive the email, check your spam folder or contact support.',
          category: 'getting-started',
          tags: ['password', 'reset', 'login', 'security'],
          helpfulVotes: 134,
          totalVotes: 145,
          lastUpdated: new Date('2024-01-12')
        }
      ]
    },
    {
      id: 'business-owners',
      name: 'Business Owners',
      description: 'Restaurant and business management on Itiyum',
      icon: 'store',
      color: 'category-business',
      faqs: [
        {
          id: 'bo-1',
          question: 'How do I list my restaurant on Itiyum?',
          answer: 'Sign up for a Business Owner account, complete your restaurant profile with photos, menu, and location details. Our team will verify your business within 24-48 hours. Once approved, your restaurant will be visible to millions of food lovers!',
          category: 'business-owners',
          tags: ['restaurant listing', 'business registration', 'verification'],
          helpfulVotes: 298,
          totalVotes: 312,
          lastUpdated: new Date('2024-01-22')
        },
        {
          id: 'bo-2',
          question: 'How do I manage my menu and pricing?',
          answer: 'Use the Menu Management section in your business dashboard. You can add/edit dishes, upload photos, set prices, mark items as unavailable, and organize by categories. Changes are reflected immediately on your public profile.',
          category: 'business-owners',
          tags: ['menu management', 'pricing', 'dashboard'],
          helpfulVotes: 267,
          totalVotes: 289,
          lastUpdated: new Date('2024-01-19')
        },
        {
          id: 'bo-3',
          question: 'What analytics and insights do I get?',
          answer: 'Your business dashboard includes: customer demographics, popular dishes, peak hours, revenue trends, review analytics, booking patterns, and competitor insights. Premium plans include advanced analytics and custom reports.',
          category: 'business-owners',
          tags: ['analytics', 'insights', 'dashboard', 'reports'],
          helpfulVotes: 223,
          totalVotes: 245,
          lastUpdated: new Date('2024-01-21')
        },
        {
          id: 'bo-4',
          question: 'How do I handle online bookings and reservations?',
          answer: 'Enable online booking in your settings, set available time slots, table capacity, and booking rules. Customers can book directly through your profile. You\'ll receive instant notifications and can manage all bookings from your dashboard.',
          category: 'business-owners',
          tags: ['bookings', 'reservations', 'online booking'],
          helpfulVotes: 201,
          totalVotes: 218,
          lastUpdated: new Date('2024-01-17')
        },
        {
          id: 'bo-5',
          question: 'What are the subscription plans and pricing?',
          answer: 'We offer three plans:<br><br><strong>Starter ($29/month):</strong> Basic listing, menu management, customer reviews<br><strong>Professional ($79/month):</strong> Advanced analytics, online booking, promotional tools<br><strong>Enterprise ($149/month):</strong> Multi-location support, API access, dedicated support<br><br>All plans include a 14-day free trial.',
          category: 'business-owners',
          tags: ['pricing', 'subscription', 'plans', 'features'],
          helpfulVotes: 187,
          totalVotes: 205,
          lastUpdated: new Date('2024-01-16')
        }
      ]
    },
    {
      id: 'food-enthusiasts',
      name: 'Food Enthusiasts',
      description: 'Advanced features for passionate food lovers',
      icon: 'utensils-crossed',
      color: 'category-enthusiast',
      faqs: [
        {
          id: 'fe-1',
          question: 'What makes a Food Enthusiast account different?',
          answer: 'Food Enthusiast accounts include: personalized restaurant recommendations, advanced review features, social following, foodie badges, exclusive events access, early access to new restaurants, and detailed dining analytics.',
          category: 'food-enthusiasts',
          tags: ['food enthusiast', 'features', 'benefits'],
          helpfulVotes: 178,
          totalVotes: 195,
          lastUpdated: new Date('2024-01-20')
        },
        {
          id: 'fe-2',
          question: 'How do I write and manage reviews?',
          answer: 'After dining, visit the restaurant\'s page and click "Write Review". Rate food, service, ambiance, and value separately. Add photos, tag dishes, and share your experience. Manage all your reviews from your dashboard with privacy controls.',
          category: 'food-enthusiasts',
          tags: ['reviews', 'rating', 'photos', 'management'],
          helpfulVotes: 156,
          totalVotes: 167,
          lastUpdated: new Date('2024-01-18')
        },
        {
          id: 'fe-3',
          question: 'How does the recommendation system work?',
          answer: 'Our AI analyzes your dining history, preferences, reviews, and behavior to suggest restaurants you\'ll love. The more you use Itiyum, the better our recommendations become. You can also follow other food enthusiasts for their recommendations.',
          category: 'food-enthusiasts',
          tags: ['recommendations', 'AI', 'personalization'],
          helpfulVotes: 143,
          totalVotes: 158,
          lastUpdated: new Date('2024-01-19')
        },
        {
          id: 'fe-4',
          question: 'What are foodie badges and how do I earn them?',
          answer: 'Badges recognize your dining achievements: First Review, Local Guide (10+ reviews in your area), Trendsetter (early adopter of new restaurants), Photographer (quality food photos), and Elite Reviewer (consistently helpful reviews).',
          category: 'food-enthusiasts',
          tags: ['badges', 'achievements', 'gamification'],
          helpfulVotes: 134,
          totalVotes: 149,
          lastUpdated: new Date('2024-01-17')
        }
      ]
    },
    {
      id: 'specialists',
      name: 'Specialists',
      description: 'Professional chef and catering services',
      icon: 'chef-hat',
      color: 'category-specialist',
      faqs: [
        {
          id: 'sp-1',
          question: 'How do I offer my services as a chef or specialist?',
          answer: 'Create a Specialist account, build your portfolio with photos of your work, set your availability, and list your services. You can offer private dining, catering, cooking classes, or consultation services.',
          category: 'specialists',
          tags: ['specialist services', 'chef', 'portfolio', 'catering'],
          helpfulVotes: 167,
          totalVotes: 182,
          lastUpdated: new Date('2024-01-21')
        },
        {
          id: 'sp-2',
          question: 'How do I manage bookings and availability?',
          answer: 'Use the Availability Management tool to set your schedule, block unavailable dates, set minimum booking times, and manage pricing. Customers can book directly through your profile based on your availability.',
          category: 'specialists',
          tags: ['availability', 'bookings', 'scheduling', 'pricing'],
          helpfulVotes: 145,
          totalVotes: 159,
          lastUpdated: new Date('2024-01-19')
        },
        {
          id: 'sp-3',
          question: 'What commission does Itiyum charge?',
          answer: 'Itiyum charges a 15% commission on completed bookings. This includes payment processing, customer support, and platform maintenance. There are no upfront fees or monthly subscriptions for specialists.',
          category: 'specialists',
          tags: ['commission', 'fees', 'pricing', 'payment'],
          helpfulVotes: 134,
          totalVotes: 148,
          lastUpdated: new Date('2024-01-18')
        }
      ]
    },
    {
      id: 'technical',
      name: 'Technical Support',
      description: 'Technical issues and troubleshooting',
      icon: 'wrench',
      color: 'category-technical',
      faqs: [
        {
          id: 'tech-1',
          question: 'The app is running slowly or crashing. What should I do?',
          answer: 'Try these steps: 1) Close and restart the app, 2) Clear your browser cache or app data, 3) Update to the latest version, 4) Check your internet connection, 5) Restart your device. If issues persist, contact our support team.',
          category: 'technical',
          tags: ['performance', 'crashes', 'troubleshooting', 'app issues'],
          helpfulVotes: 198,
          totalVotes: 223,
          lastUpdated: new Date('2024-01-20')
        },
        {
          id: 'tech-2',
          question: 'I\'m not receiving email notifications. How do I fix this?',
          answer: 'Check your spam/junk folder first. Then verify your email address in account settings. Ensure notifications are enabled in your preferences. Add noreply@itiyum.com to your contacts to prevent future issues.',
          category: 'technical',
          tags: ['email', 'notifications', 'spam', 'settings'],
          helpfulVotes: 156,
          totalVotes: 171,
          lastUpdated: new Date('2024-01-17')
        },
        {
          id: 'tech-3',
          question: 'How do I report a bug or technical issue?',
          answer: 'Use the "Report Issue" button in the app menu, or email support@itiyum.com with details about the problem, your device/browser, and steps to reproduce the issue. Screenshots are helpful!',
          category: 'technical',
          tags: ['bug report', 'support', 'contact', 'issues'],
          helpfulVotes: 123,
          totalVotes: 134,
          lastUpdated: new Date('2024-01-16')
        }
      ]
    },
    {
      id: 'privacy-security',
      name: 'Privacy & Security',
      description: 'Account security and privacy settings',
      icon: 'lock',
      color: 'category-security',
      faqs: [
        {
          id: 'ps-1',
          question: 'How is my personal data protected?',
          answer: 'We use industry-standard encryption, secure servers, and strict access controls. Your data is never sold to third parties. We comply with GDPR, CCPA, and other privacy regulations. Read our Privacy Policy for full details.',
          category: 'privacy-security',
          tags: ['privacy', 'data protection', 'encryption', 'GDPR'],
          helpfulVotes: 189,
          totalVotes: 205,
          lastUpdated: new Date('2024-01-22')
        },
        {
          id: 'ps-2',
          question: 'Can I control who sees my reviews and activity?',
          answer: 'Yes! You can set reviews to public or private, control profile visibility, hide your location, and manage what information is shared. Access these settings in your Privacy & Security section.',
          category: 'privacy-security',
          tags: ['privacy settings', 'visibility', 'reviews', 'profile'],
          helpfulVotes: 167,
          totalVotes: 178,
          lastUpdated: new Date('2024-01-19')
        },
        {
          id: 'ps-3',
          question: 'How do I enable two-factor authentication?',
          answer: 'Go to Account Settings > Security > Two-Factor Authentication. You can use SMS, authenticator apps (Google Authenticator, Authy), or email verification. We highly recommend enabling 2FA for account security.',
          category: 'privacy-security',
          tags: ['2FA', 'security', 'authentication', 'account protection'],
          helpfulVotes: 145,
          totalVotes: 156,
          lastUpdated: new Date('2024-01-18')
        }
      ]
    }
  ]);

  // Computed properties
  allFAQs = computed(() => {
    return this.faqCategories().flatMap(category => category.faqs);
  });

  filteredFAQs = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const category = this.selectedCategory();
    let faqs = this.allFAQs();

    // Filter by category
    if (category !== 'all') {
      faqs = faqs.filter(faq => faq.category === category);
    }

    // Filter by search query
    if (query) {
      faqs = faqs.filter(faq =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query) ||
        faq.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return faqs;
  });

  faqStats = computed((): FAQStats => {
    const faqs = this.allFAQs();
    const mostHelpful = faqs.reduce((prev, current) =>
      (current.helpfulVotes > prev.helpfulVotes) ? current : prev
    );

    const recentlyUpdated = faqs
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
      .slice(0, 3);

    return {
      totalFAQs: faqs.length,
      totalCategories: this.faqCategories().length,
      mostHelpfulFAQ: mostHelpful,
      recentlyUpdated
    };
  });

  // Action methods
  toggleFAQ(faqId: string): void {
    const expanded = this.expandedFAQs();
    const newExpanded = new Set(expanded);

    if (newExpanded.has(faqId)) {
      newExpanded.delete(faqId);
    } else {
      newExpanded.add(faqId);
    }

    this.expandedFAQs.set(newExpanded);
  }

  isFAQExpanded(faqId: string): boolean {
    return this.expandedFAQs().has(faqId);
  }

  markHelpful(faq: FAQ, isHelpful: boolean): void {
    // In a real app, this would make an API call
    const categories = this.faqCategories();
    const updatedCategories = categories.map(category => ({
      ...category,
      faqs: category.faqs.map(f => {
        if (f.id === faq.id) {
          return {
            ...f,
            helpfulVotes: isHelpful ? f.helpfulVotes + 1 : f.helpfulVotes,
            totalVotes: f.totalVotes + 1
          };
        }
        return f;
      })
    }));

    this.faqCategories.set(updatedCategories);
  }

  openFeedbackModal(faq: FAQ): void {
    this.selectedFAQForFeedback.set(faq);
    this.showFeedbackModal.set(true);
  }

  closeFeedbackModal(): void {
    this.selectedFAQForFeedback.set(null);
    this.showFeedbackModal.set(false);
  }

  submitFeedback(feedback: string): void {
    // In a real app, this would submit feedback to the backend
    console.log('Feedback submitted:', feedback);
    this.closeFeedbackModal();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
  }

  // Utility methods
  getHelpfulnessPercentage(faq: FAQ): number {
    return faq.totalVotes > 0 ? Math.round((faq.helpfulVotes / faq.totalVotes) * 100) : 0;
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  getCategoryById(categoryId: string): FAQCategory | undefined {
    return this.faqCategories().find(cat => cat.id === categoryId);
  }

  getCategoryIcon(iconId: string): any {
    switch(iconId) {
      case 'rocket': return this.Rocket;
      case 'store': return this.Store;
      case 'utensils-crossed': return this.UtensilsCrossed;
      case 'chef-hat': return this.ChefHat;
      case 'wrench': return this.Wrench;
      case 'lock': return this.Lock;
      default: return this.HelpCircle;
    }
  }
}
