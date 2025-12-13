export interface AdCampaign {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: AdType;
  status: CampaignStatus;
  budget: AdBudget;
  targeting: AdTargeting;
  content: AdContent;
  analytics: AdAnalytics;
  createdAt: Date;
  updatedAt: Date;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  // Tier and Placement
  tierId?: string;
  placementId?: string;
  tierName?: string;
  placementName?: string;
  category?: string;
  objectives?: string[];
}

export interface AdBudget {
  totalBudget: number;
  dailyBudget: number;
  spentAmount: number;
  remainingAmount: number;
  currency: Currency;
  billingCycle: BillingCycle;
  minimumSpend: number;
}

export interface AdTargeting {
  geographic: GeographicTargeting;
  demographic: DemographicTargeting;
  interests: string[];
  keywords: string[];
  excludedKeywords: string[];
}

export interface GeographicTargeting {
  regions: string[];
  countries: string[];
  cities: string[];
  radius?: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface DemographicTargeting {
  ageRange: {
    min: number;
    max: number;
  };
  gender: Gender[];
  languages: string[];
  userTypes: UserType[];
}

export interface AdContent {
  images: AdImage[];
  videos: AdVideo[];
  text: AdText;
  callToAction: CallToAction;
  landingPageUrl?: string;
}

export interface AdImage {
  id: string;
  url: string;
  alt: string;
  size: ImageSize;
  isPrimary: boolean;
}

export interface AdVideo {
  id: string;
  url: string;
  thumbnailUrl: string;
  duration: number;
  size: VideoSize;
  format: VideoFormat;
}

export interface AdText {
  headline: string;
  description: string;
  subheading?: string;
  disclaimer?: string;
}

export interface CallToAction {
  type: CTAType;
  text: string;
  url?: string;
  phoneNumber?: string;
  email?: string;
}

export interface AdAnalytics {
  impressions: number;
  clicks: number;
  conversions: number;
  clickThroughRate: number;
  conversionRate: number;
  costPerClick: number;
  costPerConversion: number;
  returnOnAdSpend: number;
  reach: number;
  frequency: number;
  engagement: EngagementMetrics;
  dailyStats: DailyStats[];
}

export interface EngagementMetrics {
  likes: number;
  shares: number;
  comments: number;
  saves: number;
  profileVisits: number;
  websiteClicks: number;
}

export interface DailyStats {
  date: Date;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  reach: number;
}

export interface PaymentMethod {
  id: string;
  type: PaymentType;
  cardNumber: string; // Last 4 digits only
  expiryDate: string;
  cardholderName: string;
  isDefault: boolean;
  isActive: boolean;
  billingAddress: BillingAddress;
}

export interface BillingAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface AdTransaction {
  id: string;
  campaignId: string;
  amount: number;
  currency: Currency;
  type: TransactionType;
  status: TransactionStatus;
  paymentMethodId: string;
  description: string;
  createdAt: Date;
  processedAt?: Date;
}

// Booking System Models
export interface BookingStatus {
  userId: string;
  isAvailable: boolean;
  availabilityType: AvailabilityType;
  nextAvailableDate?: Date;
  lastUpdated: Date;
  calendar: CalendarSlot[];
  bookingSettings: BookingSettings;
  statistics: {
    totalBookings: number;
    pendingBookings: number;
    confirmedBookings: number;
    averageRating: number;
  };
}

export interface CalendarSlot {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked: boolean;
  maxCapacity: number;
  currentBookings: number;
  capacity: number;
  bookedCount: number;
  price?: number;
  notes?: string;
}

export interface BookingSettings {
  allowInstantBooking: boolean;
  requireApproval: boolean;
  advanceBookingDays: number;
  cancellationPolicy: CancellationPolicy;
  minimumNotice: number; // hours
  bufferTime: number; // minutes between bookings
}

export interface CancellationPolicy {
  allowCancellation: boolean;
  cancellationDeadline: number; // hours before booking
  refundPolicy: RefundPolicy;
}

// Inquiry System Models
export interface ContactInquiry {
  id: string;
  recipientId: string; // User being contacted
  inquirerName: string;
  inquirerEmail: string;
  inquirerPhone?: string;
  subject: string;
  message: string;
  inquiryType: InquiryType;
  status: InquiryStatus;
  priority: InquiryPriority;
  createdAt: Date;
  updatedAt: Date;
  respondedAt?: Date;
  autoResponseSent?: boolean;
  followUpRequired: boolean;
  tags: string[];
}

export interface AutoResponse {
  id: string;
  userId: string;
  template: string;
  isActive: boolean;
  triggers: ResponseTrigger[];
  customMessage?: string;
}

export interface ResponseTrigger {
  inquiryType: InquiryType;
  keywords: string[];
  timeOfDay?: TimeRange;
  daysOfWeek?: number[];
}

export interface TimeRange {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

// Enums
export type AdType = 'promoted' | 'sponsored' | 'partnership';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'KES' | 'ETB' | 'UGX' | 'TZS';
export type BillingCycle = 'daily' | 'weekly' | 'monthly';
export type Gender = 'male' | 'female' | 'non-binary' | 'all';
export type UserType = 'business' | 'specialist' | 'food_enthusiast' | 'normal_user';
export type ImageSize = 'small' | 'medium' | 'large' | 'banner';
export type VideoSize = 'mobile' | 'desktop' | 'square' | 'story';
export type VideoFormat = 'mp4' | 'webm' | 'mov';
export type CTAType = 'book_now' | 'enquire_now' | 'get_quote' | 'see_calendar' | 'visit_website' | 'call_now' | 'email_now' | 'learn-more';
export type PaymentType = 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer' | 'mobile_money';
export type TransactionType = 'charge' | 'refund' | 'adjustment';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type AvailabilityType = 'available' | 'fully_booked' | 'limited_availability';
export type RefundPolicy = 'full_refund' | 'partial_refund' | 'no_refund';
export type InquiryType = 'booking' | 'quote' | 'general' | 'complaint' | 'collaboration';
export type InquiryStatus = 'pending' | 'in_progress' | 'resolved' | 'closed';
export type InquiryPriority = 'low' | 'medium' | 'high' | 'urgent';

// Form Models
export interface AdCreationForm {
  basic: AdBasicInfo;
  tierPlacement?: AdTierPlacement;
  targeting: AdTargeting;
  content: AdContent;
  budget: AdBudget;
  schedule: AdSchedule;
}

export interface AdTierPlacement {
  tierId: string;
  placementId: string;
  tierName?: string;
  placementName?: string;
}

export interface AdBasicInfo {
  title: string;
  description: string;
  type: AdType;
  category: string;
  objectives: string[];
}

export interface AdSchedule {
  startDate: Date;
  endDate?: Date;
  timezone: string;
  runContinuously: boolean;
}

// API Response Models
export interface AdCampaignResponse {
  campaigns: AdCampaign[];
  totalCount: number;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  averageCTR: number;
}

export interface AdAnalyticsResponse {
  campaignId: string;
  analytics: AdAnalytics;
  insights: AdInsight[];
  recommendations: AdRecommendation[];
}

export interface AdInsight {
  type: InsightType;
  title: string;
  description: string;
  impact: InsightImpact;
  actionRequired: boolean;
}

export interface AdRecommendation {
  type: RecommendationType;
  title: string;
  description: string;
  expectedImpact: string;
  difficulty: RecommendationDifficulty;
}

export type InsightType = 'performance' | 'audience' | 'budget' | 'creative' | 'timing';
export type InsightImpact = 'positive' | 'negative' | 'neutral';
export type RecommendationType = 'budget_optimization' | 'audience_expansion' | 'creative_refresh' | 'timing_adjustment';
export type RecommendationDifficulty = 'easy' | 'medium' | 'advanced';
