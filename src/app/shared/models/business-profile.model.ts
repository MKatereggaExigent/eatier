export interface BusinessHours {
  day: string;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
}

export interface BusinessAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface BusinessFacilities {
  parking: boolean;
  petFriendly: boolean;
  carWash: boolean;
  swimming: boolean;
  wifi: boolean;
  airConditioning: boolean;
  outdoorSeating: boolean;
  wheelchairAccessible: boolean;
}

export interface BusinessProfile {
  id: string;
  userId: string;
  businessName: string;
  country: string;
  address: BusinessAddress;
  email: string;
  contactNumber: string;
  
  // Optional fields
  sustainabilityEthos?: string;
  bio?: string; // 160 character limit
  facilities: BusinessFacilities;
  
  // Media
  profilePhotos: string[];
  backgroundImage?: string;
  
  // Business hours
  businessHours: BusinessHours[];
  
  // Status and verification
  isVerified: boolean;
  verificationBadges: string[];
  status: 'active' | 'inactive' | 'frozen' | 'deleted';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Digital business card
  qrCodeUrl?: string;
  businessCardCustomization: {
    primaryColor: string;
    secondaryColor: string;
    logoPosition: 'top' | 'center' | 'bottom';
    includeQR: boolean;
    includeContact: boolean;
    includeSocial: boolean;
  };
}

export interface BusinessProfileUpdateData {
  businessName?: string;
  country?: string;
  address?: Partial<BusinessAddress>;
  email?: string;
  contactNumber?: string;
  sustainabilityEthos?: string;
  bio?: string;
  facilities?: Partial<BusinessFacilities>;
  profilePhotos?: string[];
  backgroundImage?: string;
  businessHours?: BusinessHours[];
  businessCardCustomization?: Partial<BusinessProfile['businessCardCustomization']>;
}

export interface MenuAccessPermission {
  id: string;
  menuId: string;
  email: string;
  permissionLevel: 'edit_view' | 'view_only' | 'no_edit';
  shareLink: string;
  message?: string;
  expiresAt?: Date;
  createdAt: Date;
  isActive: boolean;
}

export interface BusinessInsights {
  businessId: string;
  period: {
    start: Date;
    end: Date;
    type: 'daily' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  };
  metrics: {
    totalViews: number;
    uniqueVisitors: number;
    menuViews: number;
    profileViews: number;
    contactClicks: number;
    qrScans: number;
    shareCount: number;
  };
  engagement: {
    averageSessionDuration: number;
    bounceRate: number;
    returnVisitorRate: number;
    peakHours: string[];
    popularMenuItems: string[];
  };
  growth: {
    viewsGrowth: number;
    engagementGrowth: number;
    customerGrowth: number;
  };
  demographics: {
    topCountries: { country: string; count: number }[];
    deviceTypes: { type: string; percentage: number }[];
    referralSources: { source: string; count: number }[];
  };
}

export interface AccountFreezeOptions {
  duration: '1_week' | '1_month' | '6_months' | 'indefinite';
  reason?: string;
  reactivationDate?: Date;
}

export interface AccountActivity {
  id: string;
  userId: string;
  action: string;
  details: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface NotificationSettings {
  messages: boolean;
  updates: boolean;
  customerAlerts: boolean;
  marketingEmails: boolean;
  systemNotifications: boolean;
  emailFrequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
}

export const BUSINESS_PROFILE_CONSTRAINTS = {
  BIO_MAX_LENGTH: 160,
  MENU_DESCRIPTION_MAX_LENGTH: 15,
  MAX_PROFILE_PHOTOS: 10,
  SUPPORTED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
  MAX_IMAGE_SIZE_MB: 5
} as const;
