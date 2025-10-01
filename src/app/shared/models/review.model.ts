export enum ReviewStatus {
  PUBLISHED = 'published',
  PENDING_MODERATION = 'pending_moderation',
  FLAGGED = 'flagged',
  REMOVED = 'removed',
  DRAFT = 'draft'
}

export enum ReviewType {
  RESTAURANT = 'restaurant',
  CHEF = 'chef',
  WAITSTAFF = 'waitstaff'
}

export interface ReviewRating {
  overall: number; // 1-5
  food?: number;
  service?: number;
  atmosphere?: number;
  value?: number;
  cleanliness?: number;
}

export interface ReviewImage {
  id: string;
  url: string;
  caption?: string;
  uploadedAt: Date;
}

export interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  
  // Target of review
  targetType: ReviewType;
  targetId: string; // restaurantId, chefId, or waitstaffId
  targetName: string;
  
  // Review Content
  rating: ReviewRating;
  title?: string;
  content: string;
  images: ReviewImage[];
  
  // Visit Information (for restaurant reviews)
  visitDate?: Date;
  partySize?: number;
  orderItems?: string[]; // menu item names
  totalSpent?: number;
  
  // Service Information (for chef/waitstaff reviews)
  serviceDate?: Date;
  serviceType?: string;
  serviceDuration?: number; // hours
  
  // Engagement
  helpfulCount: number;
  unhelpfulCount: number;
  replyCount: number;
  
  // Moderation
  status: ReviewStatus;
  moderationNotes?: string;
  flaggedReasons?: string[];
  
  // Response from business/service provider
  businessResponse?: {
    content: string;
    respondedAt: Date;
    responderId: string;
    responderName: string;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  
  // Verification
  isVerifiedVisit: boolean;
  verificationMethod?: 'receipt' | 'reservation' | 'location' | 'manual';
}

export interface ReviewCreateData {
  targetType: ReviewType;
  targetId: string;
  rating: ReviewRating;
  title?: string;
  content: string;
  images?: File[];
  visitDate?: Date;
  partySize?: number;
  orderItems?: string[];
  totalSpent?: number;
  serviceDate?: Date;
  serviceType?: string;
  serviceDuration?: number;
}

export interface ReviewUpdateData {
  rating?: ReviewRating;
  title?: string;
  content?: string;
  images?: File[];
  visitDate?: Date;
  partySize?: number;
  orderItems?: string[];
  totalSpent?: number;
}

export interface ReviewFilters {
  targetType?: ReviewType;
  targetId?: string;
  reviewerId?: string;
  rating?: number; // minimum rating
  status?: ReviewStatus;
  hasImages?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy?: 'newest' | 'oldest' | 'highest_rated' | 'lowest_rated' | 'most_helpful';
  page?: number;
  pageSize?: number;
}

export interface ReviewSearchResult {
  reviews: Review[];
  totalCount: number;
  averageRating: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  recentReviews: Review[];
  topReviews: Review[];
  responseRate: number; // percentage of reviews with business responses
  averageResponseTime: number; // hours
}

export interface ReviewHelpfulness {
  reviewId: string;
  userId: string;
  isHelpful: boolean;
  createdAt: Date;
}

export interface ReviewFlag {
  id: string;
  reviewId: string;
  flaggerId: string;
  reason: 'inappropriate' | 'spam' | 'fake' | 'offensive' | 'irrelevant' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}
