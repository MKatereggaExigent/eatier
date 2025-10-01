export interface UserAddress {
  street?: string;
  city: string;
  state: string;
  country: string;
  zipCode?: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  
  // Basic information
  firstName: string;
  lastName: string;
  country: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  
  // Contact information
  email: string;
  phone?: string;
  address?: UserAddress;
  
  // Professional information (for chefs)
  specialtyDishes?: string[];
  bio?: string; // 160 character limit
  experience?: number; // years
  certifications?: string[];
  
  // Media
  profilePhoto?: string;
  backgroundPhoto?: string;
  portfolioImages?: string[];
  
  // Status
  status: 'active' | 'inactive' | 'frozen' | 'deleted';
  isVerified: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Digital business card
  qrCodeUrl?: string;
  businessCardCustomization: {
    primaryColor: string;
    secondaryColor: string;
    layout: 'minimal' | 'professional' | 'creative';
    includeQR: boolean;
    includeContact: boolean;
    includeSpecialties: boolean;
    includeBio: boolean;
  };
  
  // Privacy settings
  profileVisibility: 'public' | 'private' | 'connections_only';
  showContactInfo: boolean;
  showLocation: boolean;
}

export interface UserProfileUpdateData {
  firstName?: string;
  lastName?: string;
  country?: string;
  dateOfBirth?: Date;
  gender?: UserProfile['gender'];
  email?: string;
  phone?: string;
  address?: Partial<UserAddress>;
  specialtyDishes?: string[];
  bio?: string;
  experience?: number;
  certifications?: string[];
  profilePhoto?: string;
  backgroundPhoto?: string;
  portfolioImages?: string[];
  businessCardCustomization?: Partial<UserProfile['businessCardCustomization']>;
  profileVisibility?: UserProfile['profileVisibility'];
  showContactInfo?: boolean;
  showLocation?: boolean;
}

export interface UserInsights {
  userId: string;
  period: {
    start: Date;
    end: Date;
    type: 'daily' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  };
  metrics: {
    profileViews: number;
    uniqueVisitors: number;
    contactClicks: number;
    qrScans: number;
    portfolioViews: number;
    businessCardShares: number;
  };
  engagement: {
    averageSessionDuration: number;
    returnVisitorRate: number;
    peakHours: string[];
    topReferrers: string[];
  };
  professional: {
    inquiries: number;
    bookingRequests: number;
    reviewsReceived: number;
    averageRating: number;
  };
  demographics: {
    topCountries: { country: string; count: number }[];
    deviceTypes: { type: string; percentage: number }[];
    ageGroups: { range: string; percentage: number }[];
  };
}

export interface LegacyAccountAccess {
  id: string;
  ownerId: string;
  delegateEmail: string;
  delegateName: string;
  accessLevel: 'manage_profile' | 'view_edit_restricted';
  permissions: {
    editProfile: boolean;
    viewInsights: boolean;
    manageBusinessCard: boolean;
    accessAccountCenter: boolean;
  };
  requiresPassword: boolean;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  lastAccessedAt?: Date;
}

export interface LegacyAccessRequest {
  delegateEmail: string;
  delegateName: string;
  accessLevel: LegacyAccountAccess['accessLevel'];
  message?: string;
  expirationDays?: number;
}

export interface UserAccountActivity {
  id: string;
  userId: string;
  action: string;
  details: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}

export interface UserNotificationSettings {
  customerUpdates: boolean;
  systemUpdates: boolean;
  marketingEmails: boolean;
  professionalInquiries: boolean;
  bookingNotifications: boolean;
  reviewNotifications: boolean;
  emailFrequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  pushNotifications: boolean;
  smsNotifications: boolean;
}

export interface AccountFreezeRequest {
  duration: '1_week' | '1_month' | '6_months' | 'indefinite';
  reason?: string;
  reactivationDate?: Date;
}

export const USER_PROFILE_CONSTRAINTS = {
  BIO_MAX_LENGTH: 160,
  MAX_SPECIALTY_DISHES: 10,
  MAX_CERTIFICATIONS: 20,
  MAX_PORTFOLIO_IMAGES: 15,
  SUPPORTED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
  MAX_IMAGE_SIZE_MB: 5,
  MIN_AGE: 13,
  MAX_EXPERIENCE_YEARS: 70
} as const;
