export enum UserRole {
  EATIER = 'itiyum_admin',              // Superuser account managing all other accounts
  BUSINESS = 'business_owner',          // Restaurant owners showcasing their businesses
  FOOD_ENTHUSIAST = 'food_enthusiast',  // Food lovers exploring cuisines, rating, reviewing
  SPECIALIST = 'specialist',            // Individual chefs, waiters advertising private services
  NORMAL_USER = 'normal_user'           // Regular people looking for nearby food options
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_VERIFICATION = 'pending_verification',
  SUSPENDED = 'suspended'
}

export interface BaseUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
}

// EATIER - Superuser account managing all other accounts
export interface ItiyumAdmin extends BaseUser {
  role: UserRole.EATIER;
  permissions: string[];
  lastAdminAction?: Date;
  managedAccounts: {
    totalBusinesses: number;
    totalUsers: number;
    totalSpecialists: number;
    pendingVerifications: number;
  };
  systemAccess: {
    canManageUsers: boolean;
    canManageBusinesses: boolean;
    canManageContent: boolean;
    canViewAnalytics: boolean;
    canManageSubscriptions: boolean;
  };
}

// BUSINESS - Restaurant owners showcasing their businesses
export interface BusinessOwner extends BaseUser {
  role: UserRole.BUSINESS;
  businessId?: string;
  businessName: string;
  businessType: 'restaurant' | 'cafe' | 'food_truck' | 'catering' | 'bakery' | 'bar' | 'other';
  subscriptionId?: string;
  subscriptionStatus: 'active' | 'inactive' | 'trial' | 'expired';
  businessVerified: boolean;
  businessProfile: {
    description: string;
    cuisine: string[];
    priceRange: 'budget' | 'moderate' | 'expensive' | 'fine_dining';
    location: {
      address: string;
      city: string;
      state: string;
      country: string;
      coordinates?: { lat: number; lng: number; };
    };
    operatingHours: {
      [key: string]: { open: string; close: string; closed?: boolean; };
    };
    contact: {
      phone: string;
      website?: string;
      socialMedia?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
      };
    };
    amenities: string[];
    photos: string[];
  };
  menuManagement: {
    hasDigitalMenu: boolean;
    menuCategories: string[];
    totalItems: number;
  };
  analytics: {
    totalReviews: number;
    averageRating: number;
    monthlyViews: number;
    favoriteCount: number;
  };
}

// FOOD ENTHUSIAST - Food lovers exploring cuisines, rating, reviewing
export interface FoodEnthusiast extends BaseUser {
  role: UserRole.FOOD_ENTHUSIAST;
  enthusiastProfile: {
    bio: string;
    expertise: string[]; // e.g., 'Italian Cuisine', 'Wine Pairing', 'Street Food'
    yearsOfExperience: number;
    certifications: string[];
    socialMedia: {
      instagram?: string;
      youtube?: string;
      blog?: string;
    };
  };
  preferences: {
    cuisineTypes: string[];
    dietaryRestrictions: string[];
    priceRange: 'budget' | 'moderate' | 'expensive' | 'fine_dining';
    adventurousness: 'conservative' | 'moderate' | 'adventurous';
    location?: {
      city: string;
      state: string;
      country: string;
      coordinates?: { lat: number; lng: number; };
    };
  };
  activity: {
    favoriteRestaurants: string[];
    reviewCount: number;
    averageRating: number;
    photosShared: number;
    followersCount: number;
    followingCount: number;
    badgesEarned: string[];
  };
  reviewingStats: {
    totalReviews: number;
    helpfulVotes: number;
    featuredReviews: number;
    reviewerRank: 'novice' | 'experienced' | 'expert' | 'elite';
  };
  explorationGoals: {
    cuisinesToTry: string[];
    restaurantsWishlist: string[];
    monthlyGoal: number;
  };
}

// NORMAL USER - Regular people looking for nearby food options
export interface NormalUser extends BaseUser {
  role: UserRole.NORMAL_USER;
  preferences: {
    cuisineTypes: string[];
    dietaryRestrictions: string[];
    priceRange: 'budget' | 'moderate' | 'expensive';
    maxDistance: number; // in miles/km
    location?: {
      city: string;
      state: string;
      country: string;
      coordinates?: { lat: number; lng: number; };
    };
  };
  activity: {
    favoriteRestaurants: string[];
    recentSearches: string[];
    reviewCount: number;
    ordersCount: number;
  };
  quickAccess: {
    frequentOrders: string[];
    savedAddresses: {
      label: string;
      address: string;
      coordinates: { lat: number; lng: number; };
    }[];
  };
}

// SPECIALIST - Individual chefs, waiters advertising private services
export interface Specialist extends BaseUser {
  role: UserRole.SPECIALIST;
  specialistType: 'chef' | 'waiter' | 'waitress' | 'bartender' | 'sommelier' | 'caterer';
  professionalProfile: {
    title: string;
    bio: string;
    specialties: string[];
    experience: number; // years
    certifications: string[];
    languages: string[];
    skills: string[];
  };
  services: {
    privateChef: boolean;
    eventCatering: boolean;
    consultations: boolean;
    classes: boolean;
    substituteCoverage: boolean;
    specialEvents: boolean;
  };
  pricing: {
    hourlyRate?: number;
    dayRate?: number;
    eventRate?: number;
    consultationRate?: number;
    minimumBooking?: number;
  };
  availability: {
    days: string[];
    hours: {
      start: string;
      end: string;
    };
    advanceNotice: number; // days
    maxBookingsPerWeek: number;
  };
  serviceArea: {
    radius: number; // in miles/km
    location: {
      city: string;
      state: string;
      country: string;
      coordinates?: { lat: number; lng: number; };
    };
    willingToTravel: boolean;
    travelFee?: number;
  };
  portfolio: {
    images: string[];
    videos: string[];
    description: string;
    testimonials: {
      clientName: string;
      review: string;
      rating: number;
      date: Date;
    }[];
  };
  businessMetrics: {
    rating: number;
    reviewCount: number;
    bookingCount: number;
    repeatClientRate: number;
    responseTime: number; // hours
  };
  verification: {
    identityVerified: boolean;
    backgroundCheckPassed: boolean;
    insuranceVerified: boolean;
    certificationVerified: boolean;
  };
}

export type User = ItiyumAdmin | BusinessOwner | FoodEnthusiast | NormalUser | Specialist;

export interface UserRegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  // Additional fields based on role
  businessName?: string; // for business owners
  businessType?: BusinessOwner['businessType']; // for business owners
  businessAddress?: string; // for business owners
  businessCountry?: string; // for business owners
  preferences?: NormalUser['preferences'] | FoodEnthusiast['preferences']; // for users
  specialistType?: Specialist['specialistType']; // for specialists
  specialties?: string[]; // for specialists
  experience?: number; // for specialists
  bio?: string; // for food enthusiasts and specialists
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  message?: string;
  user: User;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}
