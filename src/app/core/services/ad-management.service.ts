import {
  AdAnalyticsResponse,
  AdCampaign,
  AdCampaignResponse,
  AdCreationForm,
  AdTransaction,
  AdType,
  AutoResponse,
  BookingStatus,
  CTAType,
  CampaignStatus,
  ContactInquiry,
  Currency,
  PaymentMethod
} from '../models/ad-management.models';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ApiService } from './api.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdManagementService {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  // All data now comes from the backend API



  // Campaign Management
  async getUserCampaigns(userId: string): Promise<AdCampaignResponse> {
    try {
      const response = await this.apiService.get<any>(`ads/campaigns/${userId}`).toPromise();

      const campaigns = response.campaigns || [];
      // Fixed: database column is 'spent', not 'spent_amount'
      const totalSpend = campaigns.reduce((sum: number, c: any) => sum + (parseFloat(c.spent) || 0), 0);
      const totalImpressions = campaigns.reduce((sum: number, c: any) => sum + (parseInt(c.impressions) || 0), 0);
      const totalClicks = campaigns.reduce((sum: number, c: any) => sum + (parseInt(c.clicks) || 0), 0);
      const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      return {
        campaigns: this.transformCampaigns(campaigns),
        totalCount: campaigns.length,
        totalSpend,
        totalImpressions,
        totalClicks,
        averageCTR
      };
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      // Return empty response on error
      return {
        campaigns: [],
        totalCount: 0,
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        averageCTR: 0
      };
    }
  }

  private transformCampaigns(campaigns: any[]): AdCampaign[] {
    return campaigns.map(c => this.transformCampaign(c));
  }

  private transformCampaign(c: any): AdCampaign {
    return {
      id: c.id,
      userId: c.user_id,
      title: c.title,
      description: c.description,
      type: c.type,
      status: c.status,
      // Tier and Placement
      tierId: c.tier_id,
      placementId: c.placement_id,
      tierName: c.tier_name || c.tier_display_name,
      placementName: c.placement_name || c.placement_display_name,
      category: c.category,
      objectives: c.objectives || [],
      budget: {
        totalBudget: parseFloat(c.total_budget) || parseFloat(c.budget) || 0,
        dailyBudget: parseFloat(c.daily_budget) || 0,
        spentAmount: parseFloat(c.spent) || 0,  // Fixed: database column is 'spent', not 'spent_amount'
        remainingAmount: parseFloat(c.remaining_amount) || parseFloat(c.total_budget) || parseFloat(c.budget) || 0,
        currency: c.currency || 'USD',
        billingCycle: c.billing_cycle || 'daily',
        minimumSpend: parseFloat(c.minimum_spend || 5)
      },
      targeting: {
        geographic: {
          regions: c.target_regions || [],
          countries: c.target_locations || [],
          cities: c.target_cities || [],
          radius: c.target_radius || c.target_radius_km || 50
        },
        demographic: {
          ageRange: { min: c.target_age_min || 18, max: c.target_age_max || 65 },
          gender: c.target_gender ? [c.target_gender] : ['all'],
          languages: c.target_languages || ['English'],
          userTypes: c.target_user_types || []
        },
        interests: c.target_interests || [],
        keywords: c.target_keywords || [],
        excludedKeywords: c.excluded_keywords || []
      },
      content: {
        images: c.media_urls ? c.media_urls.map((url: string, idx: number) => ({
          id: `img${idx}`,
          url,
          alt: c.title,
          size: 'large',
          isPrimary: idx === 0
        })) : [],
        videos: c.video_urls ? c.video_urls.map((url: string, idx: number) => ({
          id: `vid${idx}`,
          url,
          thumbnailUrl: '',
          duration: 0,
          size: 'desktop',
          format: 'mp4'
        })) : [],
        text: {
          headline: c.headline || c.title,
          description: c.body_text || c.description,
          subheading: c.subheading
        },
        callToAction: {
          type: (c.cta_type || 'learn-more') as CTAType,
          text: c.call_to_action || 'Learn More',
          url: c.cta_url || c.destination_url || '/',
          phoneNumber: c.cta_phone,
          email: c.cta_email
        }
      },
      analytics: {
        impressions: c.impressions || 0,
        clicks: c.clicks || 0,
        conversions: c.conversions || 0,
        clickThroughRate: c.click_through_rate || 0,
        conversionRate: c.conversion_rate || 0,
        costPerClick: parseFloat(c.cost_per_click || 0),
        costPerConversion: parseFloat(c.cost_per_conversion || 0),
        returnOnAdSpend: parseFloat(c.return_on_ad_spend || 0),
        reach: c.reach || 0,
        frequency: parseFloat(c.frequency || 0),
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
      createdAt: new Date(c.created_at),
      updatedAt: new Date(c.updated_at),
      startDate: new Date(c.start_date),
      endDate: c.end_date ? new Date(c.end_date) : undefined,
      isActive: c.is_active || false
    };
  }

  async getCampaignById(campaignId: string): Promise<AdCampaign | null> {
    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const response = await this.apiService.get<any>(`business-ads/my-ads/${campaignId}?userId=${currentUser.id}`).toPromise();
      return this.transformCampaign(response.ad || response);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      return null;
    }
  }

  async updateCampaign(campaignId: string, campaignData: AdCreationForm): Promise<AdCampaign> {
    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser) {
        throw new Error('User not authenticated. Please log in to update an ad campaign.');
      }

      const payload = {
        title: campaignData.basic.title,
        description: campaignData.basic.description,
        type: campaignData.basic.type,
        // Tier and Placement
        tierId: campaignData.tierPlacement?.tierId,
        placementId: campaignData.tierPlacement?.placementId,
        // Budget
        totalBudget: campaignData.budget.totalBudget,
        dailyBudget: campaignData.budget.dailyBudget,
        currency: campaignData.budget.currency,
        // Targeting
        targetRegions: campaignData.targeting.geographic.regions,
        targetLocations: campaignData.targeting.geographic.countries,
        targetCities: campaignData.targeting.geographic.cities,
        targetAgeMin: campaignData.targeting.demographic.ageRange.min,
        targetAgeMax: campaignData.targeting.demographic.ageRange.max,
        targetGender: campaignData.targeting.demographic.gender[0],
        targetInterests: campaignData.targeting.interests,
        // Content
        headline: campaignData.content.text.headline,
        bodyText: campaignData.content.text.description,
        callToAction: campaignData.content.callToAction.text,
        ctaType: campaignData.content.callToAction.type,
        ctaUrl: campaignData.content.callToAction.url,
        ctaPhone: campaignData.content.callToAction.phoneNumber,
        mediaUrls: campaignData.content.images.map(img => img.url),
        videoUrls: campaignData.content.videos?.map(vid => vid.url) || [],
        // Schedule
        startDate: campaignData.schedule.startDate,
        endDate: campaignData.schedule.endDate
      };

      const response = await this.apiService.put<any>(`business-ads/my-ads/${campaignId}?userId=${currentUser.id}`, payload).toPromise();
      return this.transformCampaign(response.ad || response);
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }
  }

  async createCampaign(campaignData: AdCreationForm): Promise<AdCampaign> {
    try {
      // Get current user from AuthService
      const currentUser = this.authService.currentUser();

      if (!currentUser) {
        throw new Error('User not authenticated. Please log in to create an ad campaign.');
      }

      const userId = currentUser.id;
      // tenantId is now looked up on the backend from the user's database record

      const payload = {
        userId,
        title: campaignData.basic.title,
        description: campaignData.basic.description,
        type: campaignData.basic.type,
        // Tier and Placement
        tierId: campaignData.tierPlacement?.tierId,
        placementId: campaignData.tierPlacement?.placementId,
        // Budget
        totalBudget: campaignData.budget.totalBudget,
        dailyBudget: campaignData.budget.dailyBudget,
        currency: campaignData.budget.currency,
        // Targeting
        targetRegions: campaignData.targeting.geographic.regions,
        targetLocations: campaignData.targeting.geographic.countries,
        targetCities: campaignData.targeting.geographic.cities,
        targetAgeMin: campaignData.targeting.demographic.ageRange.min,
        targetAgeMax: campaignData.targeting.demographic.ageRange.max,
        targetGender: campaignData.targeting.demographic.gender[0],
        targetInterests: campaignData.targeting.interests,
        // Content
        headline: campaignData.content.text.headline,
        bodyText: campaignData.content.text.description,
        callToAction: campaignData.content.callToAction.text,
        ctaType: campaignData.content.callToAction.type,
        ctaUrl: campaignData.content.callToAction.url,
        ctaPhone: campaignData.content.callToAction.phoneNumber,
        mediaUrls: campaignData.content.images.map(img => img.url),
        videoUrls: campaignData.content.videos?.map(vid => vid.url) || [],
        // Schedule
        startDate: campaignData.schedule.startDate,
        endDate: campaignData.schedule.endDate
      };

      const response = await this.apiService.post<any>('business-ads/my-ads', payload).toPromise();
      return this.transformCampaign(response.ad || response);
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  async startCampaign(campaignId: string): Promise<void> {
    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      await this.apiService.post(`business-ads/my-ads/${campaignId}/start?userId=${currentUser.id}`, {}).toPromise();
    } catch (error) {
      console.error('Error starting campaign:', error);
      throw error;
    }
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      await this.apiService.post(`business-ads/my-ads/${campaignId}/pause?userId=${currentUser.id}`, {}).toPromise();
    } catch (error) {
      console.error('Error pausing campaign:', error);
      throw error;
    }
  }

  async resumeCampaign(campaignId: string): Promise<void> {
    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      await this.apiService.post(`business-ads/my-ads/${campaignId}/resume?userId=${currentUser.id}`, {}).toPromise();
    } catch (error) {
      console.error('Error resuming campaign:', error);
      throw error;
    }
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      await this.apiService.delete(`business-ads/my-ads/${campaignId}?userId=${currentUser.id}`).toPromise();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  }

  // Analytics
  async getCampaignAnalytics(campaignId: string): Promise<AdAnalyticsResponse> {
    try {
      const response = await this.apiService.get<any[]>(`ads/campaigns/${campaignId}/analytics`).toPromise();

      // Transform the daily stats from backend format
      const dailyStats = response?.map((stat: any) => ({
        date: new Date(stat.date),
        impressions: stat.impressions || 0,
        clicks: stat.clicks || 0,
        conversions: stat.conversions || 0,
        spend: parseFloat(stat.spend || 0),
        reach: stat.reach || 0,
        engagement: {
          likes: stat.engagement_likes || 0,
          shares: stat.engagement_shares || 0,
          comments: stat.engagement_comments || 0,
          saves: stat.engagement_saves || 0,
          profileVisits: stat.profile_visits || 0,
          websiteClicks: stat.website_clicks || 0
        }
      }));

      // Calculate aggregated analytics
      const totalImpressions = dailyStats?.reduce((sum, stat) => sum + stat.impressions, 0) || 0;
      const totalClicks = dailyStats?.reduce((sum, stat) => sum + stat.clicks, 0) || 0;
      const totalConversions = dailyStats?.reduce((sum, stat) => sum + stat.conversions, 0) || 0;
      const totalSpend = dailyStats?.reduce((sum, stat) => sum + stat.spend, 0) || 0;

      return {
        campaignId,
        analytics: {
          impressions: totalImpressions,
          clicks: totalClicks,
          conversions: totalConversions,
          clickThroughRate: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
          conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
          costPerClick: totalClicks > 0 ? totalSpend / totalClicks : 0,
          costPerConversion: totalConversions > 0 ? totalSpend / totalConversions : 0,
          returnOnAdSpend: 0, // Would need revenue data
          reach: dailyStats?.reduce((sum, stat) => sum + stat.reach, 0) || 0,
          frequency: 0, // Would need to calculate
          engagement: {
            likes: dailyStats?.reduce((sum, stat) => sum + stat.engagement.likes, 0) || 0,
            shares: dailyStats?.reduce((sum, stat) => sum + stat.engagement.shares, 0) || 0,
            comments: dailyStats?.reduce((sum, stat) => sum + stat.engagement.comments, 0) || 0,
            saves: dailyStats?.reduce((sum, stat) => sum + stat.engagement.saves, 0) || 0,
            profileVisits: dailyStats?.reduce((sum, stat) => sum + stat.engagement.profileVisits, 0) || 0,
            websiteClicks: dailyStats?.reduce((sum, stat) => sum + stat.engagement.websiteClicks, 0) || 0
          },
          dailyStats: dailyStats || []
        },
        insights: [
          {
            type: 'performance',
            title: 'Campaign Performance',
            description: totalClicks > 0 ? 'Your campaign is generating clicks' : 'Campaign needs optimization',
            impact: totalClicks > 0 ? 'positive' : 'neutral',
            actionRequired: totalClicks === 0
          }
        ],
        recommendations: [
          {
            type: 'budget_optimization',
            title: 'Optimize Budget',
            description: 'Review your campaign performance and adjust budget accordingly',
            expectedImpact: 'Better ROI',
            difficulty: 'easy'
          }
        ]
      };
    } catch (error) {
      console.error('Error fetching campaign analytics:', error);
      throw error;
    }
  }

  // Payment Management
  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const response = await this.apiService.get<any[]>(`ads/payment-methods/${userId}`).toPromise();
      return response?.map(pm => this.transformPaymentMethod(pm)) || [];
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }
  }

  private transformPaymentMethod(pm: any): PaymentMethod {
    return {
      id: pm.id,
      type: pm.type,
      cardNumber: pm.card_number,
      expiryDate: pm.expiry_date,
      cardholderName: pm.cardholder_name,
      isDefault: pm.is_default,
      isActive: pm.is_active,
      billingAddress: {
        street: pm.billing_street,
        city: pm.billing_city,
        state: pm.billing_state,
        postalCode: pm.billing_postal_code,
        country: pm.billing_country
      }
    };
  }

  async addPaymentMethod(paymentMethod: Omit<PaymentMethod, 'id'>): Promise<PaymentMethod> {
    try {
      const userId = localStorage.getItem('user_id') || 'temp-user';
      const payload = {
        userId,
        type: paymentMethod.type,
        cardNumber: paymentMethod.cardNumber,
        expiryDate: paymentMethod.expiryDate,
        cardholderName: paymentMethod.cardholderName,
        isDefault: paymentMethod.isDefault,
        billingStreet: paymentMethod.billingAddress.street,
        billingCity: paymentMethod.billingAddress.city,
        billingState: paymentMethod.billingAddress.state,
        billingPostalCode: paymentMethod.billingAddress.postalCode,
        billingCountry: paymentMethod.billingAddress.country
      };

      const response = await this.apiService.post<any>('ads/payment-methods', payload).toPromise();
      return this.transformPaymentMethod(response);
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  }

  async removePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await this.apiService.delete(`ads/payment-methods/${paymentMethodId}`).toPromise();
    } catch (error) {
      console.error('Error removing payment method:', error);
      throw error;
    }
  }

  // Transaction Management
  async getRecentTransactions(userId: string): Promise<AdTransaction[]> {
    try {
      // This would need a backend endpoint for transactions
      // For now, return empty array since we don't have transaction history endpoint
      return [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  // Booking System
  async getBookingStatus(userId: string): Promise<BookingStatus> {
    try {
      const response = await this.apiService.get<any>(`bookings/availability/${userId}`).toPromise();

      // Get calendar slots
      const calendarResponse = await this.apiService.get<any[]>(`bookings/calendar/${userId}`, {
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }).toPromise();

      const calendar = calendarResponse?.map(slot => ({
        id: slot.id,
        date: new Date(slot.date),
        startTime: slot.start_time,
        endTime: slot.end_time,
        isAvailable: slot.is_available,
        isBooked: slot.is_booked,
        maxCapacity: slot.max_capacity,
        currentBookings: slot.current_bookings,
        capacity: slot.capacity,
        bookedCount: slot.booked_count,
        price: slot.price ? parseFloat(slot.price) : undefined,
        notes: slot.notes
      }));

      return {
        userId: response.userId || userId,
        isAvailable: response.isAvailable || response.is_available || true,
        availabilityType: response.availabilityType || response.availability_type || 'available',
        nextAvailableDate: response.nextAvailableDate ? new Date(response.nextAvailableDate) : undefined,
        lastUpdated: response.lastUpdated ? new Date(response.lastUpdated) : new Date(),
        calendar: calendar || [],
        bookingSettings: {
          allowInstantBooking: response.allowInstantBooking || response.allow_instant_booking || true,
          requireApproval: response.requireApproval || response.require_approval || false,
          advanceBookingDays: response.advanceBookingDays || response.advance_booking_days || 30,
          cancellationPolicy: {
            allowCancellation: response.cancellationAllowed || response.cancellation_allowed || true,
            cancellationDeadline: response.cancellationDeadlineHours || response.cancellation_deadline_hours || 24,
            refundPolicy: response.refundPolicy || response.refund_policy || 'full_refund'
          },
          minimumNotice: response.minimumNoticeHours || response.minimum_notice_hours || 2,
          bufferTime: response.bufferTimeMinutes || response.buffer_time_minutes || 30
        },
        statistics: {
          totalBookings: response.totalBookings || response.total_bookings || 0,
          pendingBookings: response.pendingBookings || response.pending_bookings || 0,
          confirmedBookings: response.confirmedBookings || response.confirmed_bookings || 0,
          averageRating: response.averageRating || response.average_rating || 0
        }
      };
    } catch (error) {
      console.error('Error fetching booking status:', error);
      // Return default booking status on error
      return {
        userId,
        isAvailable: true,
        availabilityType: 'available',
        nextAvailableDate: undefined,
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
          totalBookings: 0,
          pendingBookings: 0,
          confirmedBookings: 0,
          averageRating: 0
        }
      };
    }
  }

  // Contact & Inquiry System
  async submitInquiry(inquiry: Omit<ContactInquiry, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'autoResponseSent'>): Promise<ContactInquiry> {
    try {
      const payload = {
        recipientId: inquiry.recipientId,
        inquirerName: inquiry.inquirerName,
        inquirerEmail: inquiry.inquirerEmail,
        inquirerPhone: inquiry.inquirerPhone,
        subject: inquiry.subject,
        message: inquiry.message,
        inquiryType: inquiry.inquiryType,
        priority: inquiry.priority || 'normal',
        tags: inquiry.tags || []
      };

      const response = await this.apiService.post<any>('inquiries', payload).toPromise();

      return {
        id: response.id,
        recipientId: response.recipient_id,
        inquirerName: response.inquirer_name,
        inquirerEmail: response.inquirer_email,
        inquirerPhone: response.inquirer_phone,
        subject: response.subject,
        message: response.message,
        inquiryType: response.inquiry_type,
        status: response.status,
        priority: response.priority,
        createdAt: new Date(response.created_at),
        updatedAt: new Date(response.updated_at),
        followUpRequired: response.follow_up_required || false,
        tags: response.tags || [],
        autoResponseSent: true // Assume auto-response is sent by backend
      };
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      throw error;
    }
  }

  async getAutoResponse(userId: string): Promise<AutoResponse | null> {
    try {
      const response = await this.apiService.get<any[]>(`inquiries/auto-response/${userId}`).toPromise();

      if (!response || response.length === 0) {
        return null;
      }

      const template = response?.[0];
      return {
        id: template.id,
        userId: template.user_id,
        template: template.template_text,
        isActive: template.is_active,
        triggers: [
          {
            inquiryType: 'booking',
            keywords: template.trigger_keywords || ['booking', 'reservation'],
            timeOfDay: {
              start: template.trigger_time_start || '09:00',
              end: template.trigger_time_end || '18:00'
            },
            daysOfWeek: template.trigger_days_of_week || [1, 2, 3, 4, 5]
          }
        ]
      };
    } catch (error) {
      console.error('Error fetching auto-response:', error);
      return null;
    }
  }

  // Contact inquiry management methods
  async getContactInquiries(userId: string): Promise<ContactInquiry[]> {
    try {
      const response = await this.apiService.get<any>(`inquiries/${userId}`).toPromise();

      return response.inquiries.map((inquiry: any) => ({
        id: inquiry.id,
        recipientId: inquiry.recipient_id,
        inquirerName: inquiry.inquirer_name,
        inquirerEmail: inquiry.inquirer_email,
        inquirerPhone: inquiry.inquirer_phone,
        subject: inquiry.subject,
        message: inquiry.message,
        inquiryType: inquiry.inquiry_type,
        status: inquiry.status,
        priority: inquiry.priority,
        createdAt: new Date(inquiry.created_at),
        updatedAt: new Date(inquiry.updated_at),
        followUpRequired: inquiry.follow_up_required || false,
        tags: inquiry.tags || [],
        autoResponseSent: !!inquiry.replied_at
      }));
    } catch (error) {
      console.error('Error fetching contact inquiries:', error);
      return [];
    }
  }

  async updateInquiryStatus(inquiryId: string, status: any): Promise<void> {
    try {
      await this.apiService.patch(`inquiries/${inquiryId}/status`, { status }).toPromise();
    } catch (error) {
      console.error('Error updating inquiry status:', error);
      throw error;
    }
  }

  async updateInquiryPriority(inquiryId: string, priority: any): Promise<void> {
    try {
      await this.apiService.patch(`inquiries/${inquiryId}/priority`, { priority }).toPromise();
    } catch (error) {
      console.error('Error updating inquiry priority:', error);
      throw error;
    }
  }

  async replyToInquiry(inquiryId: string, message: string): Promise<void> {
    try {
      await this.apiService.post(`inquiries/${inquiryId}/reply`, { replyMessage: message }).toPromise();
    } catch (error) {
      console.error('Error replying to inquiry:', error);
      throw error;
    }
  }

  async sendAutoResponse(inquiryId: string): Promise<void> {
    try {
      // Auto-response is handled by the backend when inquiry is created
      console.log(`Auto-response triggered for inquiry ${inquiryId}`);
    } catch (error) {
      console.error('Error sending auto-response:', error);
      throw error;
    }
  }

  // Ad Tiers and Placements
  async getAdTiers(): Promise<AdTier[]> {
    try {
      const response = await this.apiService.get<{ tiers: any[] }>('ads/tiers').toPromise();
      return (response?.tiers || []).map(tier => ({
        id: tier.id,
        name: tier.name,
        displayName: tier.display_name,
        description: tier.description,
        basePriceDaily: parseFloat(tier.base_price_daily),
        basePriceWeekly: parseFloat(tier.base_price_weekly),
        basePriceMonthly: parseFloat(tier.base_price_monthly),
        priorityWeight: tier.priority_weight,
        rotationSpeedSeconds: tier.rotation_speed_seconds,
        supportsVideo: tier.supports_video,
        supportsAnimation: tier.supports_animation,
        features: tier.features || []
      }));
    } catch (error) {
      console.error('Error fetching ad tiers:', error);
      return [];
    }
  }

  async getAdPlacements(tierId?: string): Promise<AdPlacement[]> {
    try {
      const url = tierId ? `ads/placements?tierId=${tierId}` : 'ads/placements';
      const response = await this.apiService.get<{ placements: any[] }>(url).toPromise();
      return (response?.placements || []).map(placement => ({
        id: placement.id,
        name: placement.name,
        displayName: placement.display_name,
        description: placement.description,
        pageLocation: placement.page_location,
        position: placement.position,
        width: placement.width,
        height: placement.height,
        tierId: placement.tier_id,
        tierName: placement.tier_name,
        priceDaily: parseFloat(placement.price_daily || 0),
        priceWeekly: parseFloat(placement.price_weekly || 0),
        priceMonthly: parseFloat(placement.price_monthly || 0)
      }));
    } catch (error) {
      console.error('Error fetching ad placements:', error);
      return [];
    }
  }
}

// Interfaces for tiers and placements
export interface AdTier {
  id: string;
  name: string;
  displayName: string;
  description: string;
  basePriceDaily: number;
  basePriceWeekly: number;
  basePriceMonthly: number;
  priorityWeight: number;
  rotationSpeedSeconds: number;
  supportsVideo: boolean;
  supportsAnimation: boolean;
  features: string[];
}

export interface AdPlacement {
  id: string;
  name: string;
  displayName: string;
  description: string;
  pageLocation: string;
  position: string;
  width: number;
  height: number;
  tierId: string;
  tierName: string;
  priceDaily: number;
  priceWeekly: number;
  priceMonthly: number;
}
