import { ActivatedRoute, RouterModule } from '@angular/router';
import { Component, OnInit, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './restaurant-detail.component.html',
  styleUrls: ['./restaurant-detail.component.scss']
})
export class RestaurantDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);

  restaurantId = signal<string>('');

  // Mock data - replace with actual service calls
  restaurant = {
    id: '1',
    name: 'Bella Italia',
    cuisine: 'Italian',
    priceRange: '$$',
    rating: 4.5,
    reviewCount: 127,
    images: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=600&fit=crop'
    ],
    address: '123 Main St, Downtown',
    phone: '(555) 123-4567',
    website: 'www.bellaitalia.com',
    hours: [
      { day: 'Monday', hours: '11:00 AM - 10:00 PM' },
      { day: 'Tuesday', hours: '11:00 AM - 10:00 PM' },
      { day: 'Wednesday', hours: '11:00 AM - 10:00 PM' },
      { day: 'Thursday', hours: '11:00 AM - 10:00 PM' },
      { day: 'Friday', hours: '11:00 AM - 11:00 PM' },
      { day: 'Saturday', hours: '11:00 AM - 11:00 PM' },
      { day: 'Sunday', hours: '12:00 PM - 9:00 PM' }
    ],
    description: 'Authentic Italian cuisine in the heart of downtown. Family-owned restaurant serving traditional recipes passed down through generations.',
    features: ['Delivery', 'Takeout', 'Dine-in', 'Outdoor Seating', 'Wine Bar'],
    isOpen: true
  };

  recentReviews = [
    {
      id: '1',
      customerName: 'Sarah Johnson',
      rating: 5,
      comment: 'Amazing food and excellent service! The pasta was perfectly cooked and the tiramisu was heavenly. Will definitely come back.',
      date: new Date('2024-01-15'),
      helpful: 12
    },
    {
      id: '2',
      customerName: 'Mike Chen',
      rating: 4,
      comment: 'Great atmosphere and delicious food. The pizza was authentic and the staff was very friendly. Highly recommended!',
      date: new Date('2024-01-14'),
      helpful: 8
    },
    {
      id: '3',
      customerName: 'Emily Davis',
      rating: 5,
      comment: 'Best Italian restaurant in town! The ingredients are fresh and the flavors are incredible. Love the cozy ambiance.',
      date: new Date('2024-01-13'),
      helpful: 15
    }
  ];

  popularDishes = [
    {
      name: 'Spaghetti Carbonara',
      price: '$18.99',
      description: 'Classic Roman pasta with eggs, cheese, and pancetta',
      image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=300&h=200&fit=crop',
      rating: 4.8,
      orders: 234
    },
    {
      name: 'Margherita Pizza',
      price: '$16.99',
      description: 'Traditional pizza with fresh mozzarella, tomatoes, and basil',
      image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=300&h=200&fit=crop',
      rating: 4.7,
      orders: 189
    },
    {
      name: 'Tiramisu',
      price: '$8.99',
      description: 'Classic Italian dessert with coffee-soaked ladyfingers',
      image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=300&h=200&fit=crop',
      rating: 4.9,
      orders: 156
    },
    {
      name: 'Osso Buco',
      price: '$24.99',
      description: 'Braised veal shanks with vegetables and white wine',
      image: 'https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=300&h=200&fit=crop',
      rating: 4.6,
      orders: 98
    },
    {
      name: 'Panna Cotta',
      price: '$7.99',
      description: 'Creamy Italian dessert with berry compote',
      image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&h=200&fit=crop',
      rating: 4.5,
      orders: 112
    },
    {
      name: 'Lasagna Bolognese',
      price: '$19.99',
      description: 'Layers of pasta with rich meat sauce and béchamel',
      image: 'https://images.unsplash.com/photo-1619895092538-128341789043?w=300&h=200&fit=crop',
      rating: 4.8,
      orders: 203
    }
  ];

  // Track helpful clicks per review
  helpfulClicked = signal<{ [key: string]: boolean }>({});

  // Track if user is replying to a review
  replyingTo = signal<string | null>(null);

  // Track if write review modal is open
  showWriteReviewModal = signal(false);

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.restaurantId.set(params['id']);
      // In a real app, you would fetch restaurant data based on the ID
    });
  }

  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < Math.floor(rating));
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getCurrentDayHours(): string {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todayHours = this.restaurant.hours.find(h => h.day === today);
    return todayHours ? todayHours.hours : 'Hours not available';
  }

  callRestaurant(): void {
    window.open(`tel:${this.restaurant.phone}`, '_self');
  }

  getDirections(): void {
    const address = encodeURIComponent(this.restaurant.address);
    window.open(`https://maps.google.com?q=${address}`, '_blank');
  }

  visitWebsite(): void {
    window.open(`https://${this.restaurant.website}`, '_blank');
  }

  // View full menu - navigate to menu page or open modal
  viewFullMenu(): void {
    // Option 1: Navigate to menu page
    // this.router.navigate(['/restaurants', this.restaurantId(), 'menu']);

    // Option 2: Show alert for now (you can implement a modal later)
    alert('Opening full menu... This will navigate to the menu page or open a modal with the complete menu.');
  }

  // Write a review - open review modal
  openWriteReview(): void {
    this.showWriteReviewModal.set(true);
    // In a real app, this would open a modal or navigate to review page
    alert('Opening review form... This will display a modal where customers can write their review with rating, photos, and comments.');
  }

  // Mark review as helpful
  markHelpful(reviewId: string): void {
    const clicked = this.helpfulClicked();

    if (clicked[reviewId]) {
      // Already clicked, unmark
      const review = this.recentReviews.find(r => r.id === reviewId);
      if (review) {
        review.helpful--;
      }
      this.helpfulClicked.set({ ...clicked, [reviewId]: false });
    } else {
      // Mark as helpful
      const review = this.recentReviews.find(r => r.id === reviewId);
      if (review) {
        review.helpful++;
      }
      this.helpfulClicked.set({ ...clicked, [reviewId]: true });
    }
  }

  // Check if review is marked helpful
  isMarkedHelpful(reviewId: string): boolean {
    return this.helpfulClicked()[reviewId] || false;
  }

  // Reply to review
  replyToReview(reviewId: string): void {
    if (this.replyingTo() === reviewId) {
      // Cancel reply
      this.replyingTo.set(null);
    } else {
      // Start replying
      this.replyingTo.set(reviewId);
      // In a real app, this would show a reply input field
      setTimeout(() => {
        alert(`Reply to review ${reviewId}:\nThis will display an input field where you can type your response to the customer's review.`);
        this.replyingTo.set(null);
      }, 100);
    }
  }

  // View all reviews - navigate to reviews page
  viewAllReviews(): void {
    // Option 1: Navigate to reviews page
    // this.router.navigate(['/restaurants', this.restaurantId(), 'reviews']);

    // Option 2: Show alert for now
    alert(`Viewing all ${this.restaurant.reviewCount} reviews... This will navigate to a dedicated reviews page or expand the current section.`);
  }
}
