import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { PublicStatsService } from '../../core/services/public-stats.service';
import { AdServingService, Ad } from '../../core/services/ad-serving.service';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Zap, Store, UtensilsCrossed, User, ChefHat, CheckCircle, Shield, BookOpen, MessageCircle, GraduationCap, Handshake, Calendar, BarChart3, Megaphone, Globe, Heart, Target, Award, AlertTriangle, XCircle, MessageSquare, Mail, Phone, MapPin, Send, Star } from 'lucide-angular';

interface UserGroup {
  id: string;
  title: string;
  icon: any;
  description: string;
  features: string[];
  color: string;
  colorDark: string;
  glassBg: string;
}

interface CarouselSlide {
  image: string;
  label: string;
  title: string;
  subtitle: string;
  overlay: string;
  isAd?: boolean;
  ad?: Ad;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent implements OnInit, OnDestroy {
  private publicStatsService = inject(PublicStatsService);
  private adServing = inject(AdServingService);

  currentSlide = signal<number>(0);
  private carouselInterval: any;
  private trackedAds = new Set<string>();

  // Lucide Icons
  readonly CheckCircle = CheckCircle;
  readonly Shield = Shield;
  readonly Star = Star;
  readonly BookOpen = BookOpen;
  readonly MessageCircle = MessageCircle;
  readonly GraduationCap = GraduationCap;
  readonly Handshake = Handshake;
  readonly Store = Store;
  readonly UtensilsCrossed = UtensilsCrossed;
  readonly Calendar = Calendar;
  readonly BarChart3 = BarChart3;
  readonly Megaphone = Megaphone;
  readonly Globe = Globe;
  readonly Heart = Heart;
  readonly Target = Target;
  readonly Award = Award;
  readonly AlertTriangle = AlertTriangle;
  readonly XCircle = XCircle;
  readonly MessageSquare = MessageSquare;
  readonly Mail = Mail;
  readonly Phone = Phone;
  readonly MapPin = MapPin;
  readonly Send = Send;

  // Stats will be populated from database
  stats = signal<Array<{ value: string; label: string }>>([
    { value: '0', label: 'Active Users' },
    { value: '0', label: 'Restaurants' },
    { value: '0', label: 'Reviews' },
    { value: '0', label: 'Specialists' }
  ]);

  carouselSlides: CarouselSlide[] = [
    {
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&h=900&fit=crop',
      label: 'For Restaurants',
      title: 'Digitise your restaurant',
      subtitle: 'Manage menus, accept bookings, connect with customers, and grow your online presence — all from one platform.',
      overlay: 'linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(15,23,42,0.4) 50%, rgba(0,0,0,0.6) 100%)'
    },
    {
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&h=900&fit=crop',
      label: 'For Food Lovers',
      title: 'Discover your next meal',
      subtitle: 'Browse local restaurants, read honest reviews, and find dishes you\'ll love — curated just for you.',
      overlay: 'linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(30,41,59,0.35) 50%, rgba(0,0,0,0.55) 100%)'
    },
    {
      image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&h=900&fit=crop',
      label: 'For Professionals',
      title: 'Showcase your craft',
      subtitle: 'Chefs, caterers, and culinary specialists — build your portfolio, set your rates, and get booked by clients.',
      overlay: 'linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(15,23,42,0.3) 50%, rgba(0,0,0,0.6) 100%)'
    },
    {
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&h=900&fit=crop',
      label: 'For Businesses',
      title: 'Grow your brand',
      subtitle: 'Run targeted ad campaigns, get detailed analytics, and turn casual diners into loyal regulars.',
      overlay: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(15,23,42,0.35) 50%, rgba(0,0,0,0.55) 100%)'
    },
    {
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1600&h=900&fit=crop',
      label: 'For Enthusiasts',
      title: 'Savour every flavour',
      subtitle: 'Write reviews, create collections, earn badges, and become a trusted voice in your local food scene.',
      overlay: 'linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(30,41,59,0.3) 50%, rgba(0,0,0,0.55) 100%)'
    },
    {
      image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1600&h=900&fit=crop',
      label: 'Community',
      title: 'Join the table',
      subtitle: 'Connect with thousands of food lovers, share experiences, and be part of a growing culinary community.',
      overlay: 'linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(15,23,42,0.35) 50%, rgba(0,0,0,0.6) 100%)'
    }
  ];

  ngOnInit(): void {
    this.startCarousel();
    this.loadStatistics();
    this.loadHomepageAds();
  }

  /**
   * Load real statistics from the database
   */
  loadStatistics(): void {
    this.publicStatsService.getStatistics().subscribe({
      next: (data) => {
        this.stats.set([
          { value: this.formatNumber(data.activeUsers), label: 'Active Users' },
          { value: this.formatNumber(data.restaurants), label: 'Restaurants' },
          { value: this.formatNumber(data.reviews), label: 'Reviews' },
          { value: this.formatNumber(data.specialists), label: 'Specialists' }
        ]);
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
        // Keep default values (0) on error
      }
    });
  }

  /**
   * Load homepage ads and merge them into carousel slides
   */
  loadHomepageAds(): void {
    this.adServing.getAdsByPlacement('homepage_banner', 4).subscribe(ads => {
      if (!ads.length) return;

      const contentSlides: CarouselSlide[] = [...this.carouselSlides];
      const adSlides: CarouselSlide[] = ads.map(ad => ({
        image: ad.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&h=900&fit=crop',
        label: ad.advertiser_name || 'Sponsored',
        title: ad.headline || ad.title,
        subtitle: ad.body_text || ad.description || '',
        overlay: 'linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(15,23,42,0.4) 50%, rgba(0,0,0,0.6) 100%)',
        isAd: true,
        ad
      }));

      // Interleave: 2 content slides, 1 ad, repeat
      const mixed: CarouselSlide[] = [];
      let ci = 0, ai = 0;
      let contentSinceAd = 0;
      while (ci < contentSlides.length || ai < adSlides.length) {
        if (ai < adSlides.length && (ci >= contentSlides.length || contentSinceAd >= 2)) {
          mixed.push(adSlides[ai++]);
          contentSinceAd = 0;
        } else if (ci < contentSlides.length) {
          mixed.push(contentSlides[ci++]);
          contentSinceAd++;
        } else {
          break;
        }
      }
      this.carouselSlides = mixed;
    });
  }

  /**
   * Format numbers for display (e.g., 1234 -> "1.2K+")
   */
  formatNumber(num: number): string {
    if (num === 0) return '0';
    if (num < 1000) return num.toString();
    if (num < 10000) return `${(num / 1000).toFixed(1)}K+`;
    if (num < 1000000) return `${Math.floor(num / 1000)}K+`;
    return `${(num / 1000000).toFixed(1)}M+`;
  }

  ngOnDestroy(): void {
    this.stopCarousel();
  }

  startCarousel(): void {
    this.carouselInterval = setInterval(() => {
      this.nextSlide();
    }, 5000); // Change slide every 5 seconds
  }

  stopCarousel(): void {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  nextSlide(): void {
    this.currentSlide.update(current => {
      const next = current === this.carouselSlides.length - 1 ? 0 : current + 1;
      this.trackAdIfActive(next);
      return next;
    });
  }

  prevSlide(): void {
    this.currentSlide.update(current => {
      const prev = current === 0 ? this.carouselSlides.length - 1 : current - 1;
      this.trackAdIfActive(prev);
      return prev;
    });
  }

  goToSlide(index: number): void {
    this.currentSlide.set(index);
    this.trackAdIfActive(index);
  }

  private trackAdIfActive(index: number): void {
    const slide = this.carouselSlides[index];
    if (slide?.isAd && slide.ad && !this.trackedAds.has(slide.ad.id)) {
      this.trackedAds.add(slide.ad.id);
      this.adServing.trackImpression(slide.ad.id);
    }
  }

  onAdClick(ad: Ad): void {
    this.adServing.trackClick(ad.id);
  }

  userGroups: UserGroup[] = [
    {
      id: 'itiyum',
      title: 'Itiyum Admins',
      icon: Zap,
      description: 'Platform administrators with full control and oversight of the entire Itiyum ecosystem.',
      features: [
        'Complete platform oversight and management',
        'User and business verification',
        'Analytics and reporting dashboard',
        'Content moderation and quality control',
        'System configuration and settings'
      ],
      color: '#89C4D9',
      colorDark: '#3F8DB0',
      glassBg: 'linear-gradient(135deg, rgba(137,196,217,0.3) 0%, rgba(63,141,176,0.15) 100%)'
    },
    {
      id: 'business',
      title: 'Business Owners',
      icon: Store,
      description: 'Restaurants, cafes, and food businesses looking to digitize their operations and reach more customers.',
      features: [
        'Digital menu management with real-time updates',
        'Customer engagement through chat and bookings',
        'Advanced analytics and insights dashboard',
        'Advertising and promotional campaigns',
        'Review management and reputation building'
      ],
      color: '#8FC9A3',
      colorDark: '#4A9E65',
      glassBg: 'linear-gradient(135deg, rgba(143,201,163,0.3) 0%, rgba(74,158,101,0.15) 100%)'
    },
    {
      id: 'food_enthusiast',
      title: 'Food Enthusiasts',
      icon: UtensilsCrossed,
      description: 'Passionate foodies who love exploring new cuisines, sharing reviews, and connecting with the culinary community.',
      features: [
        'Discover and explore local eateries',
        'Write reviews and share experiences',
        'Create and share food collections',
        'Connect with other food lovers',
        'Get personalized recommendations'
      ],
      color: '#FFB88C',
      colorDark: '#D97C46',
      glassBg: 'linear-gradient(135deg, rgba(255,184,140,0.3) 0%, rgba(217,124,70,0.15) 100%)'
    },
    {
      id: 'normal_user',
      title: 'Regular Users',
      icon: User,
      description: 'Everyday users looking for great places to eat, make reservations, and enjoy seamless dining experiences.',
      features: [
        'Browse and search restaurants',
        'View menus and pricing',
        'Make table reservations',
        'Read reviews and ratings',
        'Save favorite places'
      ],
      color: '#F5D760',
      colorDark: '#C4A830',
      glassBg: 'linear-gradient(135deg, rgba(245,215,96,0.3) 0%, rgba(196,168,48,0.15) 100%)'
    },
    {
      id: 'specialist',
      title: 'Culinary Specialists',
      icon: ChefHat,
      description: 'Professional chefs, caterers, and food specialists offering their services for events and special occasions.',
      features: [
        'Showcase your culinary portfolio',
        'Manage availability and bookings',
        'Set service rates and packages',
        'Build your professional reputation',
        'Connect with clients for events'
      ],
      color: '#F0B5BA',
      colorDark: '#C77A82',
      glassBg: 'linear-gradient(135deg, rgba(240,181,186,0.3) 0%, rgba(199,122,130,0.15) 100%)'
    }
  ];
}
