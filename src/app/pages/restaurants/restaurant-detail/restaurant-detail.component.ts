import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

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
      image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=300&h=200&fit=crop'
    },
    {
      name: 'Margherita Pizza',
      price: '$16.99',
      description: 'Traditional pizza with fresh mozzarella, tomatoes, and basil',
      image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=300&h=200&fit=crop'
    },
    {
      name: 'Tiramisu',
      price: '$8.99',
      description: 'Classic Italian dessert with coffee-soaked ladyfingers',
      image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=300&h=200&fit=crop'
    }
  ];

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
}
