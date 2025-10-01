export enum MenuItemStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  SEASONAL = 'seasonal',
  LIMITED_TIME = 'limited_time'
}

export enum DietaryRestriction {
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  GLUTEN_FREE = 'gluten_free',
  DAIRY_FREE = 'dairy_free',
  NUT_FREE = 'nut_free',
  KETO = 'keto',
  LOW_CARB = 'low_carb',
  HALAL = 'halal',
  KOSHER = 'kosher',
  ORGANIC = 'organic',
  LOW_SODIUM = 'low_sodium',
  SUGAR_FREE = 'sugar_free'
}

export enum SpiceLevel {
  NONE = 'none',
  MILD = 'mild',
  MEDIUM = 'medium',
  HOT = 'hot',
  EXTRA_HOT = 'extra_hot'
}

export interface NutritionalInfo {
  calories?: number;
  protein?: number; // grams
  carbs?: number; // grams
  fat?: number; // grams
  fiber?: number; // grams
  sugar?: number; // grams
  sodium?: number; // mg
}

export interface MenuItemOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  isDefault?: boolean;
}

export interface MenuItemCustomization {
  id: string;
  name: string;
  description?: string;
  required: boolean;
  multiSelect: boolean;
  options: MenuItemOption[];
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  status: MenuItemStatus;

  // Dietary and Nutritional Information
  dietaryRestrictions: DietaryRestriction[];
  allergens: string[];
  spiceLevel?: SpiceLevel;
  nutritionalInfo?: NutritionalInfo;

  // Customizations
  customizations: MenuItemCustomization[];

  // Availability
  availableFrom?: string; // time of day
  availableTo?: string; // time of day
  availableDays?: string[]; // days of week

  // Popularity and Analytics
  orderCount: number;
  rating: number;
  reviewCount: number;

  // SEO and Discovery
  tags: string[];
  searchKeywords: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Special Flags
  isSignature: boolean;
  isPopular: boolean;
  isNew: boolean;
  isRecommended: boolean;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;

  // Availability
  availableFrom?: string;
  availableTo?: string;
  availableDays?: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface Menu {
  id: string;
  restaurantId: string;
  name: string;
  description?: string; // 15 character limit, no emojis
  type: 'breakfast' | 'lunch' | 'dinner' | 'beverages' | 'dessert' | 'special';
  isActive: boolean;

  // Menu Structure
  categories: MenuCategory[];
  items: MenuItem[];

  // Visual customization
  backgroundImage?: string;

  // Availability
  availableFrom?: string;
  availableTo?: string;
  availableDays?: string[];

  // Special Menus
  isSeasonalMenu?: boolean;
  seasonalPeriod?: {
    startDate: Date;
    endDate: Date;
  };

  // Access Control
  accessPermissions: MenuAccessPermission[];
  shareableLink?: string;
  isPublic: boolean;

  // Analytics
  viewCount: number;
  lastViewedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastModified: Date;
}

export interface MenuAccessPermission {
  id: string;
  email: string;
  permissionLevel: 'edit_view' | 'view_only' | 'no_edit';
  shareLink: string;
  message?: string;
  expiresAt?: Date;
  createdAt: Date;
  isActive: boolean;
}

export interface MenuItemCreateData {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  images?: string[];
  dietaryRestrictions?: DietaryRestriction[];
  allergens?: string[];
  spiceLevel?: SpiceLevel;
  nutritionalInfo?: NutritionalInfo;
  customizations?: Omit<MenuItemCustomization, 'id'>[];
  availableFrom?: string;
  availableTo?: string;
  availableDays?: string[];
  tags?: string[];
  isSignature?: boolean;
}

export interface MenuCategoryCreateData {
  name: string;
  description?: string;
  displayOrder: number;
  availableFrom?: string;
  availableTo?: string;
  availableDays?: string[];
}

export interface MenuSearchFilters {
  query?: string;
  categoryId?: string;
  dietaryRestrictions?: DietaryRestriction[];
  priceRange?: {
    min: number;
    max: number;
  };
  spiceLevel?: SpiceLevel;
  tags?: string[];
  isSignature?: boolean;
  isPopular?: boolean;
  isNew?: boolean;
  sortBy?: 'name' | 'price' | 'popularity' | 'rating';
  sortOrder?: 'asc' | 'desc';
}
