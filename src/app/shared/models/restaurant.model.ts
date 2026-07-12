export enum RestaurantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_VERIFICATION = 'pending_verification',
  SUSPENDED = 'suspended',
  CLOSED_PERMANENTLY = 'closed_permanently'
}

export enum CuisineType {
  AMERICAN = 'american',
  ITALIAN = 'italian',
  CHINESE = 'chinese',
  JAPANESE = 'japanese',
  MEXICAN = 'mexican',
  INDIAN = 'indian',
  FRENCH = 'french',
  THAI = 'thai',
  MEDITERRANEAN = 'mediterranean',
  GREEK = 'greek',
  KOREAN = 'korean',
  VIETNAMESE = 'vietnamese',
  MIDDLE_EASTERN = 'middle_eastern',
  AFRICAN = 'african',
  CARIBBEAN = 'caribbean',
  FUSION = 'fusion',
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  SEAFOOD = 'seafood',
  STEAKHOUSE = 'steakhouse',
  FAST_FOOD = 'fast_food',
  CASUAL_DINING = 'casual_dining',
  FINE_DINING = 'fine_dining',
  CAFE = 'cafe',
  BAKERY = 'bakery',
  DESSERT = 'dessert',
  BAR = 'bar',
  BREWERY = 'brewery'
}

export enum PriceRange {
  BUDGET = 'R',
  MODERATE = 'RR',
  EXPENSIVE = 'RRR',
  FINE_DINING = 'RRRR'
}

export interface Location {
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface BusinessHours {
  day: string;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  breaks?: {
    start: string;
    end: string;
  }[];
}

export interface ContactInfo {
  phone: string;
  email: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
}

export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  cuisineTypes: CuisineType[];
  priceRange: PriceRange;
  location: Location;
  contactInfo: ContactInfo;
  businessHours: BusinessHours[];
  images: string[];
  logo?: string;
  status: RestaurantStatus;
  verified: boolean;
  verificationBadges: string[];
  
  // Ratings and Reviews
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  
  // Features and Amenities
  features: {
    delivery: boolean;
    takeout: boolean;
    dineIn: boolean;
    reservations: boolean;
    parking: boolean;
    wheelchairAccessible: boolean;
    wifi: boolean;
    outdoorSeating: boolean;
    liveMusic: boolean;
    privateEvents: boolean;
    catering: boolean;
  };
  
  // Business Information
  establishedYear?: number;
  capacity?: number;
  licenseNumber?: string;
  
  // SEO and Discovery
  tags: string[];
  specialties: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Analytics
  viewCount: number;
  favoriteCount: number;
  
  // Subscription and Plan
  subscriptionPlan: 'basic' | 'premium' | 'enterprise';
  subscriptionStatus: 'active' | 'inactive' | 'trial' | 'expired';
}

export interface RestaurantRegistrationData {
  name: string;
  description: string;
  cuisineTypes: CuisineType[];
  priceRange: PriceRange;
  location: Location;
  contactInfo: ContactInfo;
  businessHours: BusinessHours[];
  features: Restaurant['features'];
  establishedYear?: number;
  capacity?: number;
  licenseNumber?: string;
}

export interface RestaurantSearchFilters {
  query?: string;
  cuisineTypes?: CuisineType[];
  priceRange?: PriceRange[];
  location?: {
    lat: number;
    lng: number;
    radius: number; // in miles/km
  };
  rating?: number; // minimum rating
  features?: Partial<Restaurant['features']>;
  isOpen?: boolean;
  verified?: boolean;
  sortBy?: 'rating' | 'distance' | 'price' | 'newest' | 'popular';
  sortOrder?: 'asc' | 'desc';
}

export interface RestaurantSearchResult {
  restaurants: Restaurant[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
