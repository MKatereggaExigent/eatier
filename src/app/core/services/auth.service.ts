import {
  AuthResponse,
  BusinessOwner,
  FoodEnthusiast,
  ItiyumAdmin,
  LoginCredentials,
  NormalUser,
  Specialist,
  User,
  UserRegistrationData,
  UserRole,
  UserStatus
} from '../../shared/models/user.model';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, delay, map, tap } from 'rxjs/operators';

import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly TOKEN_KEY = 'itiyum_token';
  private readonly REFRESH_TOKEN_KEY = 'itiyum_refresh_token';
  private readonly USER_KEY = 'itiyum_user';
  private readonly REGISTERED_USERS_KEY = 'itiyum_registered_users';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  // In-memory storage for registered users (for development without database)
  private registeredUsers: Map<string, { user: User; password: string }> = new Map();

  // Signals for reactive state management
  private _currentUser = signal<User | null>(null);
  private _isAuthenticated = signal<boolean>(false);
  private _isLoading = signal<boolean>(false);

  // Public computed signals
  public currentUser = this._currentUser.asReadonly();
  public isAuthenticated = this._isAuthenticated.asReadonly();
  public isLoading = this._isLoading.asReadonly();
  public userRole = computed(() => this._currentUser()?.role || null);
  public isItiyumAdmin = computed(() => this._currentUser()?.role === UserRole.EATIER);
  public isBusinessOwner = computed(() => this._currentUser()?.role === UserRole.BUSINESS);
  public isFoodEnthusiast = computed(() => this._currentUser()?.role === UserRole.FOOD_ENTHUSIAST);
  public isNormalUser = computed(() => this._currentUser()?.role === UserRole.NORMAL_USER);
  public isSpecialist = computed(() => this._currentUser()?.role === UserRole.SPECIALIST);

  // Observable streams for components that need them
  public currentUser$ = this.currentUserSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor() {
    this.initializeAuth();
    this.loadRegisteredUsers();
  }

  private initializeAuth(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userJson = localStorage.getItem(this.USER_KEY);

    if (token && userJson) {
      try {
        const storedUser = JSON.parse(userJson);
        // Transform stored user data to ensure proper typing
        // This handles cases where user data was stored before proper transformation was in place
        const user = this.transformBackendUserToFrontend(storedUser);
        this.setCurrentUser(user);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.clearAuthData();
      }
    }
  }

  // Load registered users from localStorage
  private loadRegisteredUsers(): void {
    try {
      const storedUsers = localStorage.getItem(this.REGISTERED_USERS_KEY);
      if (storedUsers) {
        const usersData = JSON.parse(storedUsers);
        this.registeredUsers = new Map(Object.entries(usersData));
        console.log('Loaded registered users:', this.registeredUsers.size);
      }
    } catch (error) {
      console.error('Error loading registered users:', error);
      this.registeredUsers = new Map();
    }
  }

  // Save registered users to localStorage
  private saveRegisteredUsers(): void {
    try {
      const usersObject = Object.fromEntries(this.registeredUsers);
      localStorage.setItem(this.REGISTERED_USERS_KEY, JSON.stringify(usersObject));
    } catch (error) {
      console.error('Error saving registered users:', error);
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    this.setLoading(true);

    // Call actual backend API
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials, {
      withCredentials: true // Include cookies for HTTP-only cookie handling
    }).pipe(
      tap(response => {
        this.handleAuthSuccess(response);
      }),
      catchError(error => {
        this.setLoading(false);
        const errorMessage = error.error?.error || error.error?.message || 'Login failed. Please try again.';
        return throwError(() => new Error(errorMessage));
      }),
      tap(() => this.setLoading(false))
    );
  }

  // Demo login method for quick testing
  demoLogin(): Observable<AuthResponse> {
    // Use demo food enthusiast credentials
    const demoCredentials: LoginCredentials = {
      email: 'user@example.com',
      password: 'password123'
    };

    return this.login(demoCredentials);
  }

  register(registrationData: UserRegistrationData): Observable<AuthResponse> {
    this.setLoading(true);

    // Call actual backend API
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, registrationData, {
      withCredentials: true // Include cookies for HTTP-only cookie handling
    }).pipe(
      tap(response => {
        this.handleAuthSuccess(response);
      }),
      catchError(error => {
        this.setLoading(false);
        const errorMessage = error.error?.error || error.error?.message || 'Registration failed. Please try again.';
        return throwError(() => new Error(errorMessage));
      }),
      tap(() => this.setLoading(false))
    );
  }

  // Social Login Method
  loginWithSocialProvider(provider: 'google' | 'facebook' | 'microsoft' | 'apple' | 'twitter' | 'linkedin' | 'github' | 'instagram'): Observable<AuthResponse> {
    this.setLoading(true);

    console.log(`Initiating ${provider} OAuth login...`);

    // TODO: Implement actual OAuth flow with backend
    // For now, return a mock response to demonstrate the flow
    return this.mockSocialLogin(provider).pipe(
      tap(response => {
        this.handleAuthSuccess(response);
      }),
      tap(() => this.setLoading(false))
    );
  }

  logout(): void {
    this.clearAuthData();
    this.setCurrentUser(null);
  }

  refreshToken(): Observable<AuthResponse> {
    // Call actual backend API - refresh token is in HTTP-only cookie
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/refresh`, {}, {
      withCredentials: true // Include cookies for HTTP-only cookie handling
    }).pipe(
      tap(response => {
        this.handleAuthSuccess(response);
      }),
      catchError(error => {
        console.error('Token refresh failed:', error);
        this.logout();
        return throwError(() => new Error('Session expired. Please login again.'));
      })
    );
  }

  hasPermission(permission: string): boolean {
    const user = this._currentUser();
    if (!user) return false;

    // Define role-based permissions
    const rolePermissions: Record<UserRole, string[]> = {
      [UserRole.EATIER]: ['*'], // Itiyum admin has all permissions
      [UserRole.BUSINESS]: [
        'restaurant.create',
        'restaurant.update',
        'restaurant.delete',
        'menu.create',
        'menu.update',
        'menu.delete',
        'analytics.view',
        'subscription.manage',
        'reviews.respond',
        'business.profile.manage',
        'business.insights.view'
      ],
      [UserRole.FOOD_ENTHUSIAST]: [
        'restaurant.view',
        'restaurant.search',
        'restaurant.explore',
        'review.create',
        'review.update',
        'review.delete',
        'review.feature',
        'favorite.manage',
        'social.follow',
        'social.share',
        'badges.earn',
        'goals.set'
      ],
      [UserRole.NORMAL_USER]: [
        'restaurant.view',
        'restaurant.search',
        'restaurant.nearby',
        'review.create',
        'review.view',
        'favorite.manage',
        'orders.place',
        'addresses.save'
      ],
      [UserRole.SPECIALIST]: [
        'restaurant.view',
        'restaurant.search',
        'profile.manage',
        'services.advertise',
        'booking.manage',
        'portfolio.manage',
        'pricing.set',
        'availability.manage',
        'verification.submit'
      ]
    };

    const userPermissions = rolePermissions[user.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  }

  canAccessRoute(route: string): boolean {
    const user = this._currentUser();
    if (!user) return false;

    // Define route access rules
    const routeAccess: Record<string, UserRole[]> = {
      '/admin': [UserRole.EATIER],
      '/dashboard/business': [UserRole.BUSINESS],
      '/dashboard/food-enthusiast': [UserRole.FOOD_ENTHUSIAST],
      '/dashboard/user': [UserRole.NORMAL_USER],
      '/dashboard/specialist': [UserRole.SPECIALIST],
      '/restaurants': [UserRole.FOOD_ENTHUSIAST, UserRole.NORMAL_USER, UserRole.BUSINESS, UserRole.SPECIALIST],
      '/analytics': [UserRole.BUSINESS, UserRole.EATIER],
      '/subscription': [UserRole.BUSINESS],
      '/explore': [UserRole.FOOD_ENTHUSIAST, UserRole.NORMAL_USER],
      '/services': [UserRole.SPECIALIST],
      '/bookings': [UserRole.SPECIALIST, UserRole.NORMAL_USER, UserRole.FOOD_ENTHUSIAST]
    };

    const allowedRoles = routeAccess[route];
    return allowedRoles ? allowedRoles.includes(user.role) : true;
  }

  private handleAuthSuccess(response: AuthResponse): void {
    console.log('🔑 Auth Success - Storing token and user data');

    // Safely log token (check if it exists and is a string)
    if (response.accessToken && typeof response.accessToken === 'string') {
      console.log('🔑 Access Token:', response.accessToken.substring(0, 20) + '...');
    } else {
      console.warn('⚠️  Access token is missing or invalid');
    }

    console.log('🔑 User:', response.user?.email || 'Unknown');

    // Store access token (backend also sets HTTP-only cookie)
    localStorage.setItem(this.TOKEN_KEY, response.accessToken);
    localStorage.setItem('auth_token', response.accessToken); // Also store as 'auth_token' for compatibility

    // Store refresh token if provided (backend also sets HTTP-only cookie)
    if (response.refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
    }

    // Transform backend response to proper frontend User type
    const transformedUser = this.transformBackendUserToFrontend(response.user);

    // Store user information
    localStorage.setItem(this.USER_KEY, JSON.stringify(transformedUser));

    // Store user_id and user_email separately for payment and other services
    localStorage.setItem('user_id', transformedUser.id);
    localStorage.setItem('user_email', transformedUser.email);

    // Update current user state
    this.setCurrentUser(transformedUser);

    const storedToken = localStorage.getItem(this.TOKEN_KEY);
    if (storedToken && typeof storedToken === 'string') {
      console.log('🔑 Token stored in localStorage:', storedToken.substring(0, 20) + '...');
    }
    console.log('🔑 User ID stored:', transformedUser.id);
    console.log('🔑 User Email stored:', transformedUser.email);
  }

  /**
   * Transform backend user response to proper frontend User type
   * The backend returns a flat user object, we need to transform it to the proper typed structure
   */
  private transformBackendUserToFrontend(backendUser: any): User {
    const baseUser = {
      id: backendUser.id,
      email: backendUser.email,
      firstName: backendUser.firstName || backendUser.first_name || '',
      lastName: backendUser.lastName || backendUser.last_name || '',
      phone: backendUser.phone,
      avatar: backendUser.profilePhoto || backendUser.avatar || backendUser.avatar_url,
      status: this.mapAccountStatus(backendUser.accountStatus || backendUser.account_status),
      createdAt: backendUser.createdAt ? new Date(backendUser.createdAt) : new Date(),
      updatedAt: backendUser.updatedAt ? new Date(backendUser.updatedAt) : new Date(),
      emailVerified: backendUser.emailVerified ?? true,
      phoneVerified: backendUser.phoneVerified ?? false
    };

    // Normalize role string to UserRole enum
    const role = this.normalizeRole(backendUser.role);

    switch (role) {
      case UserRole.EATIER:
        return {
          ...baseUser,
          role: UserRole.EATIER,
          permissions: backendUser.permissions || ['*'],
          managedAccounts: backendUser.managedAccounts || {
            totalBusinesses: 0,
            totalUsers: 0,
            totalSpecialists: 0,
            pendingVerifications: 0
          },
          systemAccess: backendUser.systemAccess || {
            canManageUsers: true,
            canManageBusinesses: true,
            canManageContent: true,
            canViewAnalytics: true,
            canManageSubscriptions: true
          }
        } as ItiyumAdmin;

      case UserRole.BUSINESS:
        return {
          ...baseUser,
          role: UserRole.BUSINESS,
          businessId: backendUser.businessId,
          businessName: backendUser.businessName || '',
          businessType: backendUser.businessType || 'restaurant',
          subscriptionStatus: backendUser.subscriptionStatus || 'trial',
          businessVerified: backendUser.businessVerified || false,
          businessProfile: backendUser.businessProfile || {
            description: '',
            cuisine: [],
            priceRange: 'moderate',
            location: {
              address: '',
              city: '',
              state: '',
              country: ''
            },
            operatingHours: {},
            contact: {
              phone: ''
            },
            amenities: [],
            photos: []
          },
          menuManagement: backendUser.menuManagement || {
            hasDigitalMenu: false,
            menuCategories: [],
            totalItems: 0
          },
          analytics: backendUser.analytics || {
            totalReviews: 0,
            averageRating: 0,
            monthlyViews: 0,
            favoriteCount: 0
          }
        } as BusinessOwner;

      case UserRole.FOOD_ENTHUSIAST:
        return {
          ...baseUser,
          role: UserRole.FOOD_ENTHUSIAST,
          enthusiastProfile: backendUser.enthusiastProfile || {
            bio: '',
            expertise: [],
            yearsOfExperience: 0,
            certifications: []
          },
          preferences: backendUser.preferences || {
            cuisineTypes: [],
            dietaryRestrictions: [],
            priceRange: 'moderate',
            adventurousness: 'moderate'
          },
          activity: backendUser.activity || {
            favoriteRestaurants: [],
            reviewCount: 0,
            averageRating: 0,
            photosShared: 0,
            followersCount: 0,
            followingCount: 0,
            badgesEarned: []
          },
          reviewingStats: backendUser.reviewingStats || {
            totalReviews: 0,
            helpfulVotes: 0,
            featuredReviews: 0,
            reviewerRank: 'newcomer'
          },
          explorationGoals: backendUser.explorationGoals || {
            cuisinesToTry: [],
            restaurantsWishlist: [],
            monthlyGoal: 5
          }
        } as FoodEnthusiast;

      case UserRole.SPECIALIST:
        return {
          ...baseUser,
          role: UserRole.SPECIALIST,
          specialistType: backendUser.specialistType || 'chef',
          professionalProfile: backendUser.professionalProfile || {
            title: '',
            bio: '',
            specialties: [],
            experience: 0,
            certifications: [],
            languages: ['English'],
            skills: []
          },
          services: backendUser.services || {
            privateChef: false,
            eventCatering: false,
            consultations: false,
            classes: false,
            substituteCoverage: false,
            specialEvents: false
          },
          pricing: backendUser.pricing || {},
          availability: backendUser.availability || {
            days: [],
            hours: { start: '09:00', end: '18:00' },
            advanceNotice: 2,
            maxBookingsPerWeek: 10
          },
          serviceArea: backendUser.serviceArea || {
            radius: 25,
            location: {
              city: '',
              state: '',
              country: ''
            },
            willingToTravel: true
          },
          portfolio: backendUser.portfolio || {
            images: [],
            videos: [],
            description: '',
            testimonials: []
          },
          businessMetrics: backendUser.businessMetrics || {
            rating: 0,
            reviewCount: 0,
            bookingCount: 0,
            repeatClientRate: 0,
            responseTime: 24
          },
          verification: backendUser.verification || {
            identityVerified: false,
            backgroundCheckPassed: false,
            insuranceVerified: false,
            certificationVerified: false
          }
        } as Specialist;

      case UserRole.NORMAL_USER:
      default:
        return {
          ...baseUser,
          role: UserRole.NORMAL_USER,
          preferences: backendUser.preferences || {
            cuisineTypes: [],
            dietaryRestrictions: [],
            priceRange: 'moderate',
            maxDistance: 10
          },
          activity: backendUser.activity || {
            favoriteRestaurants: [],
            recentSearches: [],
            reviewCount: 0,
            ordersCount: 0
          },
          quickAccess: backendUser.quickAccess || {
            frequentOrders: [],
            savedAddresses: []
          }
        } as NormalUser;
    }
  }

  /**
   * Map backend account status to UserStatus enum
   */
  private mapAccountStatus(status: string): UserStatus {
    switch (status?.toLowerCase()) {
      case 'active': return UserStatus.ACTIVE;
      case 'inactive': return UserStatus.INACTIVE;
      case 'suspended': return UserStatus.SUSPENDED;
      case 'pending_verification': return UserStatus.PENDING_VERIFICATION;
      default: return UserStatus.ACTIVE;
    }
  }

  /**
   * Normalize role string from backend to UserRole enum
   */
  private normalizeRole(role: string): UserRole {
    if (!role) return UserRole.NORMAL_USER;

    const normalizedRole = role.toLowerCase().replace(/\s+/g, '_');

    switch (normalizedRole) {
      case 'itiyum_admin':
      case 'eatier':
      case 'admin':
        return UserRole.EATIER;
      case 'business_owner':
      case 'business':
        return UserRole.BUSINESS;
      case 'food_enthusiast':
        return UserRole.FOOD_ENTHUSIAST;
      case 'specialist':
      case 'chef':
        return UserRole.SPECIALIST;
      case 'normal_user':
      case 'user':
      default:
        return UserRole.NORMAL_USER;
    }
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    // Also remove compatibility keys
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
  }

  private setCurrentUser(user: User | null): void {
    this._currentUser.set(user);
    this._isAuthenticated.set(!!user);
    this.currentUserSubject.next(user);
  }

  private setLoading(loading: boolean): void {
    this._isLoading.set(loading);
    this.isLoadingSubject.next(loading);
  }

  // Mock methods - replace with actual API calls
  private mockLogin(credentials: LoginCredentials): Observable<AuthResponse> {
    return of(null).pipe(
      delay(1000), // Simulate network delay
      map(() => {
        // First check registered users
        const registeredUser = this.registeredUsers.get(credentials.email);
        if (registeredUser && registeredUser.password === credentials.password) {
          console.log('Login successful for registered user:', credentials.email);
          return {
            accessToken: this.generateToken(),
            refreshToken: this.generateToken(),
            user: registeredUser.user,
            expiresIn: 3600
          };
        }

        // Then check hardcoded mock users
        if (credentials.email === 'admin@example.com' && credentials.password === 'password123') {
          return this.createMockAdmin();
        } else if (credentials.email === 'business@example.com' && credentials.password === 'password123') {
          return this.createMockBusinessOwner();
        } else if (credentials.email === 'user@example.com' && credentials.password === 'password123') {
          return this.createMockFoodEnthusiast();
        } else if (credentials.email === 'normaluser@example.com' && credentials.password === 'password123') {
          return this.createMockNormalUser();
        } else if (credentials.email === 'chef@example.com' && credentials.password === 'password123') {
          return this.createMockSpecialist();
        } else {
          throw new Error('Invalid credentials');
        }
      })
    );
  }

  private mockRegister(data: UserRegistrationData): Observable<AuthResponse> {
    return of(null).pipe(
      delay(1500),
      map(() => {
        const baseUser = {
          id: this.generateId(),
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          status: UserStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
          emailVerified: false,
          phoneVerified: false
        };

        let user: User;

        switch (data.role) {
          case UserRole.EATIER:
            user = {
              ...baseUser,
              role: UserRole.EATIER,
              permissions: ['*'],
              managedAccounts: {
                totalBusinesses: 0,
                totalUsers: 0,
                totalSpecialists: 0,
                pendingVerifications: 0
              },
              systemAccess: {
                canManageUsers: true,
                canManageBusinesses: true,
                canManageContent: true,
                canViewAnalytics: true,
                canManageSubscriptions: true
              }
            } as ItiyumAdmin;
            break;
          case UserRole.BUSINESS:
            user = {
              ...baseUser,
              role: UserRole.BUSINESS,
              businessName: data.businessName || '',
              businessType: data.businessType || 'restaurant',
              subscriptionStatus: 'trial',
              businessVerified: false,
              businessProfile: {
                description: '',
                cuisine: [],
                priceRange: 'moderate',
                location: {
                  address: '',
                  city: '',
                  state: '',
                  country: '',
                },
                operatingHours: {},
                contact: { phone: data.phone || '' },
                amenities: [],
                photos: []
              },
              menuManagement: {
                hasDigitalMenu: false,
                menuCategories: [],
                totalItems: 0
              },
              analytics: {
                totalReviews: 0,
                averageRating: 0,
                monthlyViews: 0,
                favoriteCount: 0
              }
            } as BusinessOwner;
            break;
          case UserRole.FOOD_ENTHUSIAST:
            user = {
              ...baseUser,
              role: UserRole.FOOD_ENTHUSIAST,
              enthusiastProfile: {
                bio: data.bio || '',
                expertise: [],
                yearsOfExperience: 0,
                certifications: [],
                socialMedia: {}
              },
              preferences: data.preferences || {
                cuisineTypes: [],
                dietaryRestrictions: [],
                priceRange: 'moderate',
                adventurousness: 'moderate'
              },
              activity: {
                favoriteRestaurants: [],
                reviewCount: 0,
                averageRating: 0,
                photosShared: 0,
                followersCount: 0,
                followingCount: 0,
                badgesEarned: []
              },
              reviewingStats: {
                totalReviews: 0,
                helpfulVotes: 0,
                featuredReviews: 0,
                reviewerRank: 'novice'
              },
              explorationGoals: {
                cuisinesToTry: [],
                restaurantsWishlist: [],
                monthlyGoal: 5
              }
            } as FoodEnthusiast;
            break;
          case UserRole.NORMAL_USER:
            user = {
              ...baseUser,
              role: UserRole.NORMAL_USER,
              preferences: data.preferences || {
                cuisineTypes: [],
                dietaryRestrictions: [],
                priceRange: 'moderate',
                maxDistance: 10
              },
              activity: {
                favoriteRestaurants: [],
                recentSearches: [],
                reviewCount: 0,
                ordersCount: 0
              },
              location: {
                currentCity: '',
                currentState: '',
                preferredAreas: []
              },
              quickAccess: {
                frequentOrders: [],
                savedAddresses: []
              }
            } as NormalUser;
            break;
          case UserRole.SPECIALIST:
            user = {
              ...baseUser,
              role: UserRole.SPECIALIST,
              specialistType: data.specialistType || 'chef',
              professionalProfile: {
                title: '',
                bio: data.bio || '',
                specialties: data.specialties || [],
                experience: data.experience || 0,
                certifications: [],
                languages: ['English'],
                skills: []
              },
              services: {
                privateChef: false,
                eventCatering: false,
                consultations: false,
                classes: false,
                substituteCoverage: false,
                specialEvents: false
              },
              pricing: {},
              availability: {
                days: [],
                hours: { start: '09:00', end: '17:00' },
                advanceNotice: 1,
                maxBookingsPerWeek: 5
              },
              serviceArea: {
                radius: 25,
                location: { city: '', state: '', country: '' },
                willingToTravel: false
              },
              portfolio: {
                images: [],
                videos: [],
                description: '',
                testimonials: []
              },
              businessMetrics: {
                rating: 0,
                reviewCount: 0,
                bookingCount: 0,
                repeatClientRate: 0,
                responseTime: 24
              },
              verification: {
                identityVerified: false,
                backgroundCheckPassed: false,
                insuranceVerified: false,
                certificationVerified: false
              }
            } as Specialist;
            break;

          default:
            throw new Error('Invalid user role');
        }

        // Store the registered user for future logins
        this.registeredUsers.set(data.email, {
          user,
          password: data.password
        });
        this.saveRegisteredUsers();

        console.log('User registered successfully:', data.email);

        return {
          user,
          accessToken: this.generateToken(),
          refreshToken: this.generateToken(),
          expiresIn: 3600
        };
      })
    );
  }

  private mockRefreshToken(refreshToken: string): Observable<AuthResponse> {
    const currentUser = this._currentUser();
    if (!currentUser) {
      return throwError(() => new Error('No current user'));
    }

    return of({
      user: currentUser,
      accessToken: 'new-mock-jwt-token',
      refreshToken: 'new-mock-refresh-token',
      expiresIn: 3600
    }).pipe(delay(500));
  }

  private mockSocialLogin(provider: string): Observable<AuthResponse> {
    return of(null).pipe(
      delay(1500), // Simulate OAuth redirect and callback delay
      map(() => {
        console.log(`Mock ${provider} login - creating user account...`);

        // Create a mock user from social login
        const socialUser: NormalUser = {
          id: `social_${provider}_${Date.now()}`,
          email: `user@${provider}.example.com`,
          firstName: provider.charAt(0).toUpperCase() + provider.slice(1),
          lastName: 'User',
          role: UserRole.NORMAL_USER,
          status: UserStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
          emailVerified: true, // Social logins are pre-verified
          phoneVerified: false,
          avatar: `https://ui-avatars.com/api/?name=${provider}+User&background=random`,
          preferences: {
            cuisineTypes: [],
            dietaryRestrictions: [],
            priceRange: 'moderate' as const,
            maxDistance: 10
          },
          activity: {
            favoriteRestaurants: [],
            recentSearches: [],
            reviewCount: 0,
            ordersCount: 0
          },
          quickAccess: {
            frequentOrders: [],
            savedAddresses: []
          }
        };

        // Store the social user for future reference
        this.registeredUsers.set(socialUser.email, {
          user: socialUser,
          password: '' // Social logins don't have passwords
        });
        this.saveRegisteredUsers();

        return {
          user: socialUser,
          accessToken: this.generateToken(),
          refreshToken: this.generateToken(),
          expiresIn: 3600
        };
      })
    );
  }

  private createMockBusinessOwner(): AuthResponse {
    const user: BusinessOwner = {
      id: '11111111-1111-1111-1111-111111111111', // Valid UUID for business owner
      email: 'business@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.BUSINESS,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: true,
      phoneVerified: true,
      businessId: 'restaurant-1',
      businessName: 'John\'s Restaurant',
      businessType: 'restaurant',
      subscriptionId: 'sub-1',
      subscriptionStatus: 'active',
      businessVerified: true,
      businessProfile: {
        description: 'A cozy family restaurant',
        cuisine: ['Italian', 'American'],
        priceRange: 'moderate',
        location: {
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          country: 'USA'
        },
        operatingHours: {},
        contact: { phone: '+1-555-0123' },
        amenities: ['WiFi', 'Parking'],
        photos: []
      },
      menuManagement: {
        hasDigitalMenu: true,
        menuCategories: ['Appetizers', 'Main Course', 'Desserts'],
        totalItems: 25
      },
      analytics: {
        totalReviews: 45,
        averageRating: 4.5,
        monthlyViews: 1200,
        favoriteCount: 89
      }
    };

    return {
      user,
      accessToken: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600
    };
  }

  private createMockNormalUser(): AuthResponse {
    const user: NormalUser = {
      id: '22222222-2222-2222-2222-222222222222', // Valid UUID for normal user
      email: 'normaluser@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRole.NORMAL_USER,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: true,
      phoneVerified: false,
      preferences: {
        cuisineTypes: ['italian', 'mexican'],
        dietaryRestrictions: ['vegetarian'],
        priceRange: 'moderate',
        maxDistance: 10,
        location: {
          city: 'New York',
          state: 'NY',
          country: 'USA',
          coordinates: { lat: 40.7128, lng: -74.0060 }
        }
      },
      activity: {
        favoriteRestaurants: ['restaurant-1', 'restaurant-2'],
        recentSearches: ['pizza', 'sushi'],
        reviewCount: 15,
        ordersCount: 25
      },
      quickAccess: {
        frequentOrders: ['Margherita Pizza', 'Caesar Salad'],
        savedAddresses: [
          {
            label: 'Home',
            address: '456 Oak St, New York, NY',
            coordinates: { lat: 40.7128, lng: -74.0060 }
          }
        ]
      }
    };

    return {
      user,
      accessToken: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600
    };
  }

  private createMockSpecialist(): AuthResponse {
    const user: Specialist = {
      id: '33333333-3333-3333-3333-333333333333', // Valid UUID for specialist
      email: 'chef@example.com',
      firstName: 'Mario',
      lastName: 'Rossi',
      role: UserRole.SPECIALIST,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: true,
      phoneVerified: true,
      specialistType: 'chef',
      professionalProfile: {
        title: 'Executive Chef',
        bio: 'Experienced Italian chef specializing in authentic regional cuisine.',
        specialties: ['Italian', 'Mediterranean'],
        experience: 10,
        certifications: ['Culinary Arts Degree', 'Food Safety Certification'],
        languages: ['English', 'Italian'],
        skills: ['Menu Planning', 'Food Safety', 'Team Leadership']
      },
      services: {
        privateChef: true,
        eventCatering: true,
        consultations: true,
        classes: false,
        substituteCoverage: true,
        specialEvents: true
      },
      pricing: {
        hourlyRate: 75,
        dayRate: 500,
        eventRate: 1200
      },
      availability: {
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        hours: { start: '10:00', end: '22:00' },
        advanceNotice: 2,
        maxBookingsPerWeek: 5
      },
      serviceArea: {
        radius: 30,
        location: { city: 'New York', state: 'NY', country: 'USA' },
        willingToTravel: true,
        travelFee: 50
      },
      portfolio: {
        images: ['chef-portfolio-1.jpg', 'chef-portfolio-2.jpg'],
        videos: [],
        description: 'Experienced Italian chef specializing in authentic regional cuisine.',
        testimonials: []
      },
      businessMetrics: {
        rating: 4.8,
        reviewCount: 42,
        bookingCount: 156,
        repeatClientRate: 85,
        responseTime: 2
      },
      verification: {
        identityVerified: true,
        backgroundCheckPassed: true,
        insuranceVerified: true,
        certificationVerified: true
      }
    };

    return {
      user,
      accessToken: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600
    };
  }

  private createMockAdmin(): AuthResponse {
    const user: ItiyumAdmin = {
      id: '44444444-4444-4444-4444-444444444444', // Valid UUID for admin
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.EATIER,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      emailVerified: true,
      phoneVerified: false,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      permissions: ['manage_users', 'manage_businesses', 'view_analytics', 'manage_platform'],
      managedAccounts: {
        totalBusinesses: 1256,
        totalUsers: 11591,
        totalSpecialists: 847,
        pendingVerifications: 23
      },
      systemAccess: {
        canManageUsers: true,
        canManageBusinesses: true,
        canManageContent: true,
        canViewAnalytics: true,
        canManageSubscriptions: true
      }
    };

    return {
      user,
      accessToken: 'mock-admin-token-' + Date.now(),
      refreshToken: 'mock-admin-refresh-token-' + Date.now(),
      expiresIn: 3600
    };
  }

  private createMockFoodEnthusiast(): AuthResponse {
    const user: FoodEnthusiast = {
      id: '55555555-5555-5555-5555-555555555555', // Valid UUID for food enthusiast
      email: 'user@example.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: UserRole.FOOD_ENTHUSIAST,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      emailVerified: true,
      phoneVerified: false,
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      enthusiastProfile: {
        bio: 'Passionate food enthusiast exploring culinary experiences across the city.',
        expertise: ['Italian Cuisine', 'Wine Pairing', 'Street Food'],
        yearsOfExperience: 5,
        certifications: ['Wine Sommelier Level 1', 'Food Safety Certified'],
        socialMedia: {
          instagram: '@sarahfoodie',
          blog: 'sarahfoodie.com'
        }
      },
      preferences: {
        cuisineTypes: ['Italian', 'Japanese', 'Mediterranean'],
        dietaryRestrictions: ['vegetarian'],
        priceRange: 'moderate',
        adventurousness: 'adventurous',
        location: {
          city: 'Brooklyn',
          state: 'NY',
          country: 'USA',
          coordinates: { lat: 40.6892, lng: -73.9442 }
        }
      },
      activity: {
        favoriteRestaurants: ['rest1', 'rest2', 'rest3'],
        reviewCount: 89,
        averageRating: 4.3,
        photosShared: 156,
        followersCount: 567,
        followingCount: 234,
        badgesEarned: ['First Review', 'Local Guide', 'Trendsetter']
      },
      reviewingStats: {
        totalReviews: 89,
        helpfulVotes: 234,
        featuredReviews: 12,
        reviewerRank: 'expert'
      },
      explorationGoals: {
        cuisinesToTry: ['Ethiopian', 'Peruvian', 'Korean'],
        restaurantsWishlist: ['The French Laundry', 'Eleven Madison Park'],
        monthlyGoal: 8
      }
    };

    return {
      user,
      accessToken: 'mock-food-enthusiast-token-' + Date.now(),
      refreshToken: 'mock-food-enthusiast-refresh-token-' + Date.now(),
      expiresIn: 3600
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private generateToken(): string {
    return 'mock-jwt-' + Math.random().toString(36).substr(2, 15);
  }

  // Debug method to check registered users
  getRegisteredUsers(): string[] {
    return Array.from(this.registeredUsers.keys());
  }

  // Debug method to check if a specific user exists
  isUserRegistered(email: string): boolean {
    return this.registeredUsers.has(email);
  }
}
