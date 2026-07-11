import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule, Rocket, Star, Handshake, Target, TrendingUp, Globe, DollarSign, BarChart3, Zap, Wrench } from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';
import { BannerAdComponent } from '../../shared/components/ads/banner-ad/banner-ad.component';
import { CommonModule } from '@angular/common';
import { InlineAdComponent } from '../../shared/components/ads/inline-ad/inline-ad.component';

interface CarouselSlide {
  image: string;
  title: string;
  category: 'advertising' | 'analytics' | 'success';
}

@Component({
  selector: 'app-advertise',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, BannerAdComponent, InlineAdComponent],
  templateUrl: './advertise.component.html',
  styleUrl: './advertise.component.scss'
})
export class AdvertiseComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Lucide Icons
  readonly Rocket = Rocket;
  readonly Star = Star;
  readonly Handshake = Handshake;
  readonly Target = Target;
  readonly TrendingUp = TrendingUp;
  readonly Globe = Globe;
  readonly DollarSign = DollarSign;
  readonly BarChart3 = BarChart3;
  readonly Zap = Zap;
  readonly Wrench = Wrench;

  isAuthenticated = this.authService.isAuthenticated;
  currentUser = this.authService.currentUser;

  // Carousel state
  currentSlide = signal<number>(0);
  private carouselInterval: any;

  carouselSlides: CarouselSlide[] = [
    {
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1600&h=900&fit=crop',
      title: 'Reach Your Target Audience',
      category: 'advertising'
    },
    {
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&h=900&fit=crop',
      title: 'Track Your Success',
      category: 'analytics'
    },
    {
      image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1600&h=900&fit=crop',
      title: 'Grow Your Business',
      category: 'success'
    }
  ];

  stats = [
    { value: '50K+', label: 'Active Users' },
    { value: '120+', label: 'Countries' },
    { value: '95%', label: 'Satisfaction Rate' }
  ];

  ngOnInit(): void {
    this.startCarousel();
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
    this.currentSlide.update(current =>
      current === this.carouselSlides.length - 1 ? 0 : current + 1
    );
  }

  prevSlide(): void {
    this.currentSlide.update(current =>
      current === 0 ? this.carouselSlides.length - 1 : current - 1
    );
  }

  goToSlide(index: number): void {
    this.currentSlide.set(index);
  }

  adTypes = [
    {
      id: 'promoted',
      icon: '🚀',
      title: 'Promoted',
      description: 'Boost your visibility with premium placement across the platform',
      features: [
        'Homepage banner placement',
        'Priority in search results',
        'Featured in category listings',
        'Mobile app visibility'
      ],
      badge: 'Most Popular',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      id: 'sponsored',
      icon: '⭐',
      title: 'Sponsored',
      description: 'Appear as sponsored content in relevant sections and feeds',
      features: [
        'Native ad integration',
        'Contextual placement',
        'Feed integration',
        'Story highlights'
      ],
      badge: 'Best ROI',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      id: 'in_partnership_with',
      icon: '🤝',
      title: 'In Partnership With',
      description: 'Collaborate with Itiyum for co-branded marketing campaigns',
      features: [
        'Co-branded content',
        'Joint marketing initiatives',
        'Exclusive partnerships',
        'Custom campaign design'
      ],
      badge: 'Premium',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    }
  ];

  benefits = [
    {
      icon: '🎯',
      title: 'Targeted Reach',
      description: 'Connect with your ideal audience through precise geo-targeting across 116 countries and 11 regions'
    },
    {
      icon: '📊',
      title: 'Real-Time Analytics',
      description: 'Track impressions, clicks, and conversions with comprehensive analytics dashboard'
    },
    {
      icon: '💰',
      title: 'Flexible Budgets',
      description: 'Start from just R5 with no long-term commitments. Set daily limits and pause anytime'
    },
    {
      icon: '🌍',
      title: 'Global Audience',
      description: 'Reach food enthusiasts, business owners, and culinary professionals worldwide'
    },
    {
      icon: '⚡',
      title: 'Instant Activation',
      description: 'Your ads go live immediately after payment. No waiting, no approval delays'
    },
    {
      icon: '🔧',
      title: 'Easy Management',
      description: 'Create, edit, pause, and resume campaigns from your dashboard with just a few clicks'
    }
  ];

  canAdvertise(): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return user.role === 'business_owner' || user.role === 'specialist';
  }

  navigateToCreateAd(): void {
    const user = this.currentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    // Navigate to appropriate dashboard based on role
    if (user.role === 'business_owner') {
      this.router.navigate(['/dashboard/business-owner/ads/create']);
    } else if (user.role === 'specialist') {
      this.router.navigate(['/dashboard/specialist/ads/create']);
    }
  }

  getAdTypeIcon(adTypeId: string): any {
    switch(adTypeId) {
      case 'promoted': return this.Rocket;
      case 'sponsored': return this.Star;
      case 'in_partnership_with': return this.Handshake;
      default: return this.Target;
    }
  }

  getBenefitIcon(title: string): any {
    const iconMap: Record<string, any> = {
      'Targeted Reach': this.Target,
      'Real-Time Analytics': this.BarChart3,
      'Flexible Budgets': this.DollarSign,
      'Global Audience': this.Globe,
      'Instant Activation': this.Zap,
      'Easy Management': this.Wrench
    };
    return iconMap[title] || this.Target;
  }
}
