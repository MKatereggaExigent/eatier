export enum SubscriptionPlan {
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TRIAL = 'trial',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  PAST_DUE = 'past_due',
  SUSPENDED = 'suspended'
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
  INVOICE = 'invoice'
}

export interface PlanFeatures {
  maxMenuItems: number;
  maxImages: number;
  analyticsAccess: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
  advancedAnalytics: boolean;
  multiLocation: boolean;
  apiAccess: boolean;
  whiteLabel: boolean;
  dedicatedManager: boolean;
  customIntegrations: boolean;
  advertisingCredits: number; // in ZAR
  seoOptimization: boolean;
  socialMediaIntegration: boolean;
  onlineOrdering: boolean;
  reservationSystem: boolean;
  loyaltyProgram: boolean;
  emailMarketing: boolean;
  reviewManagement: boolean;
  competitorAnalysis: boolean;
}

export interface SubscriptionPlanDetails {
  id: string;
  name: string;
  description: string;
  features: PlanFeatures;
  pricing: {
    monthly: number;
    quarterly: number;
    yearly: number;
  };
  trialDays: number;
  isPopular: boolean;
  isCustom: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  restaurantId?: string;
  planId: string;
  plan: SubscriptionPlanDetails;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  
  // Pricing
  currentPrice: number;
  currency: string;
  
  // Dates
  startDate: Date;
  endDate: Date;
  trialEndDate?: Date;
  nextBillingDate: Date;
  cancelledAt?: Date;
  
  // Payment
  paymentMethod: PaymentMethod;
  paymentMethodId?: string; // external payment method ID
  
  // Usage and Limits
  currentUsage: {
    menuItems: number;
    images: number;
    apiCalls: number;
    locations: number;
  };
  
  // Billing History
  totalPaid: number;
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Flags
  autoRenew: boolean;
  isGrandfathered: boolean; // for legacy pricing
  
  // Discounts and Promotions
  discountCode?: string;
  discountAmount?: number;
  discountPercentage?: number;
  discountEndDate?: Date;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  userId: string;
  restaurantId?: string;
  
  // Invoice Details
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  
  // Amounts
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  currency: string;
  
  // Dates
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  
  // Billing Information
  billingAddress: {
    name: string;
    company?: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Line Items
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  
  // Payment
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  
  // Files
  pdfUrl?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Notes
  notes?: string;
  internalNotes?: string;
}

export interface PaymentHistory {
  id: string;
  subscriptionId: string;
  invoiceId?: string;
  
  // Payment Details
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  paymentMethod: PaymentMethod;
  
  // External References
  externalTransactionId?: string;
  externalPaymentId?: string;
  
  // Dates
  processedAt: Date;
  createdAt: Date;
  
  // Failure Information
  failureReason?: string;
  failureCode?: string;
  
  // Refund Information
  refundedAt?: Date;
  refundAmount?: number;
  refundReason?: string;
}

export interface SubscriptionCreateData {
  planId: string;
  billingCycle: BillingCycle;
  paymentMethodId: string;
  discountCode?: string;
  billingAddress: Invoice['billingAddress'];
}

export interface SubscriptionUpdateData {
  planId?: string;
  billingCycle?: BillingCycle;
  paymentMethodId?: string;
  autoRenew?: boolean;
}

export interface UsageStats {
  subscriptionId: string;
  period: {
    start: Date;
    end: Date;
  };
  usage: {
    menuItems: number;
    images: number;
    apiCalls: number;
    locations: number;
    analyticsViews: number;
    supportTickets: number;
  };
  limits: PlanFeatures;
  overageCharges: {
    menuItems: number;
    images: number;
    apiCalls: number;
  };
}
