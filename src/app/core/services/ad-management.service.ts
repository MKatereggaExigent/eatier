import { Injectable, signal } from '@angular/core';
import {
  AdCampaign,
  AdCampaignResponse,
  AdAnalyticsResponse,
  PaymentMethod,
  AdTransaction,
  AdCreationForm,
  BookingStatus,
  ContactInquiry,
  AutoResponse,
  CampaignStatus,
  AdType,
  Currency
} from '../models/ad-management.models';

@Injectable({
  providedIn: 'root'
})
export class AdManagementService {
  private readonly API_BASE_URL = 'http://localhost:3000/api';

  // Mock data for development
  private mockCampaigns = signal<AdCampaign[]>([
    {
      id: '1',
      userId: 'user1',
      title: 'Summer Menu Promotion',
      description: 'Promote our new summer menu items to local food enthusiasts',
      type: 'promoted' as AdType,
      status: 'active' as CampaignStatus,
      budget: {
        totalBudget: 500,
        dailyBudget: 25,
        spentAmount: 125.50,
        remainingAmount: 374.50,
        currency: 'USD' as Currency,
        billingCycle: 'daily',
        minimumSpend: 5
      },
      targeting: {
        geographic: {
          regions: ['East Africa'],
          countries: ['Kenya', 'Uganda'],
          cities: ['Nairobi', 'Kampala'],
          radius: 50
        },
        demographic: {
          ageRange: { min: 25, max: 45 },
          gender: ['all'],
          languages: ['English', 'Swahili'],
          userTypes: ['food_enthusiast', 'normal_user']
        },
        interests: ['fine dining', 'local cuisine', 'food photography'],
        keywords: ['restaurant', 'food', 'dining'],
        excludedKeywords: ['fast food', 'delivery']
      },
      content: {
        images: [{
          id: 'img1',
          url: '/assets/images/summer-menu.jpg',
          alt: 'Summer menu items',
          size: 'large',
          isPrimary: true
        }],
        videos: [],
        text: {
          headline: 'Taste Summer at Our Restaurant',
          description: 'Fresh seasonal ingredients, expertly crafted dishes'
        },
        callToAction: {
          type: 'book_now',
          text: 'Book Now',
          url: '/booking'
        }
      },
      analytics: {
        impressions: 12500,
        clicks: 875,
        conversions: 45,
        clickThroughRate: 7.0,
        conversionRate: 5.14,
        costPerClick: 0.14,
        costPerConversion: 2.79,
        returnOnAdSpend: 320.5,
        reach: 8900,
        frequency: 1.4,
        engagement: {
          likes: 234,
          shares: 67,
          comments: 89,
          saves: 156,
          profileVisits: 445,
          websiteClicks: 678
        },
        dailyStats: []
      },
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20'),
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-02-15'),
      isActive: true
    },
    {
      id: '2',
      userId: 'user1',
      title: 'Chef Portfolio Showcase',
      description: 'Showcase my culinary skills and attract private dining clients',
      type: 'sponsored' as AdType,
      status: 'paused' as CampaignStatus,
      budget: {
        totalBudget: 300,
        dailyBudget: 15,
        spentAmount: 89.25,
        remainingAmount: 210.75,
        currency: 'USD' as Currency,
        billingCycle: 'daily',
        minimumSpend: 5
      },
      targeting: {
        geographic: {
          regions: ['East Africa'],
          countries: ['Kenya'],
          cities: ['Nairobi'],
          radius: 25
        },
        demographic: {
          ageRange: { min: 30, max: 55 },
          gender: ['all'],
          languages: ['English'],
          userTypes: ['food_enthusiast', 'business']
        },
        interests: ['private dining', 'chef services', 'gourmet cooking'],
        keywords: ['private chef', 'catering', 'events'],
        excludedKeywords: ['budget', 'cheap']
      },
      content: {
        images: [{
          id: 'img2',
          url: '/assets/images/chef-portfolio.jpg',
          alt: 'Chef preparing gourmet dish',
          size: 'large',
          isPrimary: true
        }],
        videos: [],
        text: {
          headline: 'Professional Chef Available',
          description: 'Elevate your dining experience with personalized culinary services'
        },
        callToAction: {
          type: 'enquire_now',
          text: 'Enquire Now',
          email: 'chef@example.com'
        }
      },
      analytics: {
        impressions: 6750,
        clicks: 445,
        conversions: 18,
        clickThroughRate: 6.59,
        conversionRate: 4.04,
        costPerClick: 0.20,
        costPerConversion: 4.96,
        returnOnAdSpend: 245.8,
        reach: 5200,
        frequency: 1.3,
        engagement: {
          likes: 156,
          shares: 34,
          comments: 45,
          saves: 89,
          profileVisits: 234,
          websiteClicks: 345
        },
        dailyStats: []
      },
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-18'),
      startDate: new Date('2024-01-10'),
      endDate: new Date('2024-02-10'),
      isActive: false
    }
  ]);

  private mockPaymentMethods = signal<PaymentMethod[]>([
    {
      id: 'pm1',
      type: 'credit_card',
      cardNumber: '4532',
      expiryDate: '12/26',
      cardholderName: 'John Doe',
      isDefault: true,
      isActive: true,
      billingAddress: {
        street: '123 Main St',
        city: 'Nairobi',
        state: 'Nairobi County',
        postalCode: '00100',
        country: 'Kenya'
      }
    }
  ]);

  private mockTransactions = signal<AdTransaction[]>([
    {
      id: 'tx1',
      campaignId: '1',
      amount: 25.00,
      currency: 'USD',
      type: 'charge',
      status: 'completed',
      paymentMethodId: 'pm1',
      description: 'Daily ad spend - Summer Menu Promotion',
      createdAt: new Date('2024-01-20'),
      processedAt: new Date('2024-01-20')
    },
    {
      id: 'tx2',
      campaignId: '2',
      amount: 15.00,
      currency: 'USD',
      type: 'charge',
      status: 'completed',
      paymentMethodId: 'pm1',
      description: 'Daily ad spend - Chef Portfolio Showcase',
      createdAt: new Date('2024-01-18'),
      processedAt: new Date('2024-01-18')
    }
  ]);

  // Campaign Management
  async getUserCampaigns(userId: string): Promise<AdCampaignResponse> {
    // Simulate API call
    await this.delay(500);

    const campaigns = this.mockCampaigns().filter(c => c.userId === userId);
    const totalSpend = campaigns.reduce((sum, c) => sum + c.budget.spentAmount, 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + c.analytics.impressions, 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + c.analytics.clicks, 0);
    const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return {
      campaigns,
      totalCount: campaigns.length,
      totalSpend,
      totalImpressions,
      totalClicks,
      averageCTR
    };
  }

  async createCampaign(campaignData: AdCreationForm): Promise<AdCampaign> {
    // Simulate API call
    await this.delay(1000);

    const newCampaign: AdCampaign = {
      id: Date.now().toString(),
      userId: campaignData.basic.title, // This would be the actual user ID
      title: campaignData.basic.title,
      description: campaignData.basic.description,
      type: campaignData.basic.type,
      status: 'draft',
      budget: campaignData.budget,
      targeting: campaignData.targeting,
      content: campaignData.content,
      analytics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        clickThroughRate: 0,
        conversionRate: 0,
        costPerClick: 0,
        costPerConversion: 0,
        returnOnAdSpend: 0,
        reach: 0,
        frequency: 0,
        engagement: {
          likes: 0,
          shares: 0,
          comments: 0,
          saves: 0,
          profileVisits: 0,
          websiteClicks: 0
        },
        dailyStats: []
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: campaignData.schedule.startDate,
      endDate: campaignData.schedule.endDate,
      isActive: false
    };

    // Add to mock data
    this.mockCampaigns.update(campaigns => [...campaigns, newCampaign]);

    return newCampaign;
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    await this.delay(300);

    this.mockCampaigns.update(campaigns =>
      campaigns.map(c =>
        c.id === campaignId
          ? { ...c, status: 'paused' as CampaignStatus, isActive: false, updatedAt: new Date() }
          : c
      )
    );
  }

  async resumeCampaign(campaignId: string): Promise<void> {
    await this.delay(300);

    this.mockCampaigns.update(campaigns =>
      campaigns.map(c =>
        c.id === campaignId
          ? { ...c, status: 'active' as CampaignStatus, isActive: true, updatedAt: new Date() }
          : c
      )
    );
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    await this.delay(500);

    this.mockCampaigns.update(campaigns =>
      campaigns.filter(c => c.id !== campaignId)
    );
  }

  // Analytics
  async getCampaignAnalytics(campaignId: string): Promise<AdAnalyticsResponse> {
    await this.delay(800);

    const campaign = this.mockCampaigns().find(c => c.id === campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    return {
      campaignId,
      analytics: campaign.analytics,
      insights: [
        {
          type: 'performance',
          title: 'Strong Performance',
          description: 'Your campaign is performing above average',
          impact: 'positive',
          actionRequired: false
        }
      ],
      recommendations: [
        {
          type: 'budget_optimization',
          title: 'Increase Budget',
          description: 'Consider increasing your daily budget to reach more people',
          expectedImpact: '+25% more conversions',
          difficulty: 'easy'
        }
      ]
    };
  }

  // Payment Management
  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    await this.delay(300);
    return this.mockPaymentMethods();
  }

  async addPaymentMethod(paymentMethod: Omit<PaymentMethod, 'id'>): Promise<PaymentMethod> {
    await this.delay(800);

    const newMethod: PaymentMethod = {
      ...paymentMethod,
      id: Date.now().toString()
    };

    this.mockPaymentMethods.update(methods => [...methods, newMethod]);
    return newMethod;
  }

  async removePaymentMethod(paymentMethodId: string): Promise<void> {
    await this.delay(500);

    this.mockPaymentMethods.update(methods =>
      methods.filter(m => m.id !== paymentMethodId)
    );
  }

  // Transaction Management
  async getRecentTransactions(userId: string): Promise<AdTransaction[]> {
    await this.delay(400);
    return this.mockTransactions().slice(0, 10);
  }

  // Booking System
  async getBookingStatus(userId: string): Promise<BookingStatus> {
    await this.delay(300);

    return {
      userId,
      isAvailable: true,
      availabilityType: 'available',
      nextAvailableDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      lastUpdated: new Date(),
      calendar: [],
      bookingSettings: {
        allowInstantBooking: true,
        requireApproval: false,
        advanceBookingDays: 30,
        cancellationPolicy: {
          allowCancellation: true,
          cancellationDeadline: 24,
          refundPolicy: 'full_refund'
        },
        minimumNotice: 2,
        bufferTime: 30
      },
      statistics: {
        totalBookings: 45,
        pendingBookings: 8,
        confirmedBookings: 37,
        averageRating: 4.7
      }
    };
  }

  // Contact & Inquiry System
  async submitInquiry(inquiry: Omit<ContactInquiry, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'autoResponseSent'>): Promise<ContactInquiry> {
    await this.delay(600);

    const newInquiry: ContactInquiry = {
      ...inquiry,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending',
      autoResponseSent: true,
      followUpRequired: false,
      tags: []
    };

    // Simulate auto-response
    console.log(`Auto-response sent to ${inquiry.inquirerEmail}: Hi ${inquiry.inquirerName}. Thank you for getting in touch. This message acknowledges receipt of your message.`);

    return newInquiry;
  }

  async getAutoResponse(userId: string): Promise<AutoResponse | null> {
    await this.delay(200);

    return {
      id: 'ar1',
      userId,
      template: 'Hi {name}. Thank you for getting in touch. This message acknowledges receipt of your message.',
      isActive: true,
      triggers: [
        {
          inquiryType: 'booking',
          keywords: ['booking', 'reservation', 'table'],
          timeOfDay: { start: '09:00', end: '18:00' },
          daysOfWeek: [1, 2, 3, 4, 5]
        }
      ]
    };
  }

  // Contact inquiry management methods
  async getContactInquiries(userId: string): Promise<ContactInquiry[]> {
    await this.delay(400);

    // Mock implementation
    return [
      {
        id: '1',
        recipientId: userId,
        inquirerName: 'Sarah Johnson',
        inquirerEmail: 'sarah.johnson@email.com',
        inquirerPhone: '+1 (555) 123-4567',
        subject: 'Wedding Catering Inquiry',
        message: 'Hi! I\'m planning my wedding for next summer and would love to discuss catering options. We\'re expecting about 150 guests and are interested in a Mediterranean menu. Could we schedule a tasting?',
        inquiryType: 'quote',
        status: 'pending',
        priority: 'high',
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        updatedAt: new Date(Date.now() - 3600000),
        followUpRequired: true,
        tags: ['wedding', 'catering', 'mediterranean']
      },
      {
        id: '2',
        recipientId: userId,
        inquirerName: 'Michael Chen',
        inquirerEmail: 'michael.chen@email.com',
        subject: 'Private Chef Services',
        message: 'I\'m looking for a private chef for a dinner party next Friday. We have 8 guests and would prefer Italian cuisine. What are your rates and availability?',
        inquiryType: 'booking',
        status: 'in_progress',
        priority: 'medium',
        createdAt: new Date(Date.now() - 7200000), // 2 hours ago
        updatedAt: new Date(Date.now() - 1800000), // 30 minutes ago
        followUpRequired: true,
        tags: ['private-chef', 'italian', 'dinner-party']
      },
      {
        id: '3',
        recipientId: userId,
        inquirerName: 'Emma Wilson',
        inquirerEmail: 'emma.wilson@email.com',
        inquirerPhone: '+1 (555) 987-6543',
        subject: 'Menu Consultation',
        message: 'I run a small restaurant and would love to get some consultation on updating our menu. Are you available for menu development services?',
        inquiryType: 'general',
        status: 'resolved',
        priority: 'low',
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        updatedAt: new Date(Date.now() - 3600000), // 1 hour ago
        followUpRequired: false,
        tags: ['consultation', 'menu-development']
      }
    ];
  }

  async updateInquiryStatus(inquiryId: string, status: any): Promise<void> {
    await this.delay(300);
    console.log(`Updating inquiry ${inquiryId} status to ${status}`);
  }

  async updateInquiryPriority(inquiryId: string, priority: any): Promise<void> {
    await this.delay(300);
    console.log(`Updating inquiry ${inquiryId} priority to ${priority}`);
  }

  async replyToInquiry(inquiryId: string, message: string): Promise<void> {
    await this.delay(800);
    console.log(`Replying to inquiry ${inquiryId}: ${message}`);
  }

  async sendAutoResponse(inquiryId: string): Promise<void> {
    await this.delay(500);
    console.log(`Sending auto-response for inquiry ${inquiryId}`);
  }

  // Utility method to simulate API delays
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
