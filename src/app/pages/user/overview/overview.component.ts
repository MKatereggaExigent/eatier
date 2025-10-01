import { Component, inject } from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { NormalUser } from '../../../shared/models/user.model';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-user-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class UserOverviewComponent {
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;

  // Mock data - replace with actual service calls
  stats = {
    reviewsWritten: 23,
    favoriteRestaurants: 12,
    photosUploaded: 45,
    helpfulVotes: 156
  };

  recentActivity = [
    {
      type: 'review',
      restaurant: 'Bella Italia',
      action: 'Wrote a review',
      date: new Date('2024-01-15'),
      rating: 5
    },
    {
      type: 'favorite',
      restaurant: 'Sushi Zen',
      action: 'Added to favorites',
      date: new Date('2024-01-14')
    },
    {
      type: 'photo',
      restaurant: 'The Burger Joint',
      action: 'Uploaded photos',
      date: new Date('2024-01-13')
    }
  ];

  recommendedRestaurants = [
    {
      id: '1',
      name: 'Mediterranean Delight',
      cuisine: 'Mediterranean',
      rating: 4.5,
      image: 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=300&h=200&fit=crop',
      distance: '0.8 miles'
    },
    {
      id: '2',
      name: 'Tokyo Ramen House',
      cuisine: 'Japanese',
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&h=200&fit=crop',
      distance: '1.2 miles'
    },
    {
      id: '3',
      name: 'Farm to Table',
      cuisine: 'American',
      rating: 4.3,
      image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=300&h=200&fit=crop',
      distance: '2.1 miles'
    }
  ];

  getActivityIcon(type: string): string {
    const icons = {
      review: '📝',
      favorite: '❤️',
      photo: '📸',
      booking: '📅'
    };
    return icons[type as keyof typeof icons] || '📍';
  }

  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < Math.floor(rating));
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
