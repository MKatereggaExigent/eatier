import { Component, OnDestroy, OnInit, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface UserGroup {
  id: string;
  title: string;
  icon: string;
  description: string;
  features: string[];
  color: string;
  gradient: string;
}

interface CarouselSlide {
  image: string;
  title: string;
  category: 'restaurant' | 'cuisine' | 'people';
}

interface AdCarouselSlide {
  gradient: string;
  icon: string;
  stat: string;
  label: string;
  trend: string;
  description: string;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent implements OnInit, OnDestroy {
  currentSlide = signal<number>(0);
  currentAdSlide = signal<number>(0);
  private carouselInterval: any;
  private adCarouselInterval: any;

  carouselSlides: CarouselSlide[] = [
    {
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&h=900&fit=crop',
      title: 'Discover Amazing Restaurants',
      category: 'restaurant'
    },
    {
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&h=900&fit=crop',
      title: 'Explore Delicious Cuisines',
      category: 'cuisine'
    },
    {
      image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&h=900&fit=crop',
      title: 'Connect with Food Lovers',
      category: 'people'
    },
    {
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&h=900&fit=crop',
      title: 'Experience Fine Dining',
      category: 'restaurant'
    },
    {
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1600&h=900&fit=crop',
      title: 'Savor Every Flavor',
      category: 'cuisine'
    },
    {
      image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1600&h=900&fit=crop',
      title: 'Join the Community',
      category: 'people'
    }
  ];

  adCarouselSlides: AdCarouselSlide[] = [
    {
      gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
      icon: '📈',
      stat: '10,000+',
      label: 'Active Users',
      trend: '+25% this month',
      description: 'Join thousands of food enthusiasts discovering new experiences'
    },
    {
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
      icon: '🎯',
      stat: '500+',
      label: 'Partner Restaurants',
      trend: '+15% growth',
      description: 'Reach customers actively searching for dining experiences'
    },
    {
      gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
      icon: '⚡',
      stat: '85%',
      label: 'Conversion Rate',
      trend: 'Industry leading',
      description: 'Turn views into customers with targeted advertising'
    },
    {
      gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      icon: '💰',
      stat: '$2.5M+',
      label: 'Revenue Generated',
      trend: '+40% YoY',
      description: 'Our partners see real ROI from advertising campaigns'
    }
  ];

  ngOnInit(): void {
    this.startCarousel();
    this.startAdCarousel();
  }

  ngOnDestroy(): void {
    this.stopCarousel();
    this.stopAdCarousel();
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

  // Ad Carousel Methods
  startAdCarousel(): void {
    this.adCarouselInterval = setInterval(() => {
      this.nextAdSlide();
    }, 3000); // Change ad slide every 3 seconds
  }

  stopAdCarousel(): void {
    if (this.adCarouselInterval) {
      clearInterval(this.adCarouselInterval);
    }
  }

  nextAdSlide(): void {
    this.currentAdSlide.update(current =>
      current === this.adCarouselSlides.length - 1 ? 0 : current + 1
    );
  }

  pauseAdCarousel(): void {
    this.stopAdCarousel();
  }

  resumeAdCarousel(): void {
    this.startAdCarousel();
  }

  userGroups: UserGroup[] = [
    {
      id: 'itiyum',
      title: 'Itiyum Admins',
      icon: '⚡',
      description: 'Platform administrators with full control and oversight of the entire Itiyum ecosystem.',
      features: [
        'Complete platform oversight and management',
        'User and business verification',
        'Analytics and reporting dashboard',
        'Content moderation and quality control',
        'System configuration and settings'
      ],
      color: '#2d3748',
      gradient: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)'
    },
    {
      id: 'business',
      title: 'Business Owners',
      icon: '🏪',
      description: 'Restaurants, cafes, and food businesses looking to digitize their operations and reach more customers.',
      features: [
        'Digital menu management with real-time updates',
        'Customer engagement through chat and bookings',
        'Advanced analytics and insights dashboard',
        'Advertising and promotional campaigns',
        'Review management and reputation building'
      ],
      color: '#4a5568',
      gradient: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)'
    },
    {
      id: 'food_enthusiast',
      title: 'Food Enthusiasts',
      icon: '🍽️',
      description: 'Passionate foodies who love exploring new cuisines, sharing reviews, and connecting with the culinary community.',
      features: [
        'Discover and explore local eateries',
        'Write reviews and share experiences',
        'Create and share food collections',
        'Connect with other food lovers',
        'Get personalized recommendations'
      ],
      color: '#718096',
      gradient: 'linear-gradient(135deg, #718096 0%, #4a5568 100%)'
    },
    {
      id: 'normal_user',
      title: 'Regular Users',
      icon: '👤',
      description: 'Everyday users looking for great places to eat, make reservations, and enjoy seamless dining experiences.',
      features: [
        'Browse and search restaurants',
        'View menus and pricing',
        'Make table reservations',
        'Read reviews and ratings',
        'Save favorite places'
      ],
      color: '#a0aec0',
      gradient: 'linear-gradient(135deg, #a0aec0 0%, #718096 100%)'
    },
    {
      id: 'specialist',
      title: 'Culinary Specialists',
      icon: '👨‍🍳',
      description: 'Professional chefs, caterers, and food specialists offering their services for events and special occasions.',
      features: [
        'Showcase your culinary portfolio',
        'Manage availability and bookings',
        'Set service rates and packages',
        'Build your professional reputation',
        'Connect with clients for events'
      ],
      color: '#cbd5e0',
      gradient: 'linear-gradient(135deg, #cbd5e0 0%, #a0aec0 100%)'
    }
  ];

  stats = [
    { value: '10K+', label: 'Active Users' },
    { value: '500+', label: 'Restaurants' },
    { value: '50K+', label: 'Reviews' },
    { value: '5K+', label: 'Specialists' }
  ];
}
