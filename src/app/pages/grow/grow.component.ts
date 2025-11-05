import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';

interface AdType {
  id: string;
  title: string;
  description: string;
  icon: string;
  features: string[];
  pricing: string;
}

@Component({
  selector: 'app-grow',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './grow.component.html',
  styleUrl: './grow.component.scss'
})
export class GrowComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);

  isAuthenticated = this.authService.isAuthenticated;
  currentUser = this.authService.currentUser;

  // Carousel state
  currentSlide = signal<number>(0);
  private carouselInterval: any;

  carouselSlides = [
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
    { value: '50K+', label: 'Active Diners' },
    { value: '120+', label: 'Countries' },
    { value: '95%', label: 'Success Rate' }
  ];

  adTypes: AdType[] = [
    {
      id: 'promoted',
      title: 'Promoted',
      description: 'Highlight your listing in search and category feeds',
      icon: '🎯',
      features: [
        'Priority placement in search results',
        'Featured in category listings',
        'Increased visibility to target audience',
        'Real-time performance tracking'
      ],
      pricing: 'Starting at $5 / €5 / £5'
    },
    {
      id: 'sponsored',
      title: 'Sponsored',
      description: 'Branded placements across high-intent pages',
      icon: '⭐',
      features: [
        'Premium placement on high-traffic pages',
        'Branded content integration',
        'Advanced targeting options',
        'Detailed analytics dashboard'
      ],
      pricing: 'Starting at $5 / €5 / £5'
    },
    {
      id: 'partnership',
      title: 'In Partnership With',
      description: 'Co-branded features with our editorial and partners',
      icon: '🤝',
      features: [
        'Editorial collaboration',
        'Co-branded content',
        'Partner network exposure',
        'Custom campaign design'
      ],
      pricing: 'Starting at $5 / €5 / £5'
    }
  ];

  regions = [
    { name: 'East Africa', countries: ['Kenya', 'Ethiopia', 'Tanzania', 'Uganda'] },
    { name: 'West Africa', countries: ['Nigeria', 'Ghana', 'Senegal', 'Ivory Coast'] },
    { name: 'MENA', countries: ['UAE', 'Saudi Arabia', 'Egypt', 'Morocco'] },
    { name: 'Europe', countries: ['UK', 'France', 'Germany', 'Spain'] }
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
    }, 5000);
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

  canAdvertise(): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return user.role === 'business_owner' || user.role === 'specialist';
  }

  navigateToManageAds(): void {
    const user = this.currentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    // Navigate to Manage My Ads page based on role
    if (user.role === 'business_owner') {
      this.router.navigate(['/business-owner/ads']);
    } else if (user.role === 'specialist') {
      this.router.navigate(['/dashboard/specialist/ads']);
    } else {
      // For other users, show upgrade message or redirect to dashboard
      this.router.navigate(['/dashboard/user']);
    }
  }

  navigateToCreateAd(): void {
    const user = this.currentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    // Navigate to Create Ad page based on role
    if (user.role === 'business_owner') {
      this.router.navigate(['/business-owner/ads/create']);
    } else if (user.role === 'specialist') {
      this.router.navigate(['/dashboard/specialist/ads/create']);
    }
  }
}

