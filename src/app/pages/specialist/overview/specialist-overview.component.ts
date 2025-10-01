import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Specialist } from '../../../shared/models/user.model';

interface BookingRequest {
  id: string;
  clientName: string;
  clientAvatar?: string;
  eventType: string;
  eventDate: Date;
  location: string;
  guests: number;
  budget: number;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  message: string;
  requestDate: Date;
}

interface Earning {
  id: string;
  clientName: string;
  eventType: string;
  amount: number;
  date: Date;
  status: 'pending' | 'paid' | 'processing';
}

interface Review {
  id: string;
  clientName: string;
  clientAvatar?: string;
  rating: number;
  comment: string;
  eventType: string;
  date: Date;
}

@Component({
  selector: 'app-specialist-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './specialist-overview.component.html',
  styleUrls: ['./specialist-overview.component.scss']
})
export class SpecialistOverviewComponent {
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;
  specialist = computed(() => this.currentUser() as Specialist);

  // Loading states
  loading = signal(false);
  
  // Business metrics
  businessMetrics = signal({
    totalBookings: 156,
    completedBookings: 142,
    totalEarnings: 28750,
    monthlyEarnings: 4200,
    averageRating: 4.8,
    totalReviews: 89,
    responseRate: 95,
    repeatClientRate: 78,
    upcomingBookings: 8,
    pendingRequests: 5
  });

  // Recent booking requests
  recentRequests = signal<BookingRequest[]>([
    {
      id: '1',
      clientName: 'Sarah Johnson',
      clientAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=60&h=60&fit=crop&crop=face',
      eventType: 'Private Dinner Party',
      eventDate: new Date('2024-02-15'),
      location: 'Manhattan, NY',
      guests: 8,
      budget: 1200,
      status: 'pending',
      message: 'Looking for an Italian chef for a romantic anniversary dinner for 8 people. Would love authentic regional dishes.',
      requestDate: new Date('2024-01-20')
    },
    {
      id: '2',
      clientName: 'Michael Chen',
      clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face',
      eventType: 'Corporate Event',
      eventDate: new Date('2024-02-22'),
      location: 'Brooklyn, NY',
      guests: 25,
      budget: 3500,
      status: 'pending',
      message: 'Need catering for a corporate lunch meeting. Mediterranean cuisine preferred.',
      requestDate: new Date('2024-01-19')
    },
    {
      id: '3',
      clientName: 'Emily Davis',
      eventType: 'Wedding Reception',
      eventDate: new Date('2024-03-10'),
      location: 'Queens, NY',
      guests: 50,
      budget: 8000,
      status: 'accepted',
      message: 'Wedding reception catering needed. Mix of Italian and American cuisine.',
      requestDate: new Date('2024-01-18')
    }
  ]);

  // Upcoming bookings
  upcomingBookings = signal([
    {
      id: '1',
      clientName: 'Robert Wilson',
      eventType: 'Birthday Party',
      eventDate: new Date('2024-01-25'),
      location: 'Manhattan, NY',
      guests: 12,
      amount: 1500,
      status: 'confirmed'
    },
    {
      id: '2',
      clientName: 'Lisa Rodriguez',
      eventType: 'Private Dinner',
      eventDate: new Date('2024-01-28'),
      location: 'Brooklyn, NY',
      guests: 6,
      amount: 800,
      status: 'confirmed'
    },
    {
      id: '3',
      clientName: 'David Kim',
      eventType: 'Cooking Class',
      eventDate: new Date('2024-02-02'),
      location: 'Manhattan, NY',
      guests: 4,
      amount: 600,
      status: 'confirmed'
    }
  ]);

  // Recent earnings
  recentEarnings = signal<Earning[]>([
    {
      id: '1',
      clientName: 'Jennifer Brown',
      eventType: 'Private Dinner',
      amount: 950,
      date: new Date('2024-01-15'),
      status: 'paid'
    },
    {
      id: '2',
      clientName: 'Thomas Anderson',
      eventType: 'Corporate Lunch',
      amount: 2200,
      date: new Date('2024-01-12'),
      status: 'paid'
    },
    {
      id: '3',
      clientName: 'Maria Garcia',
      eventType: 'Cooking Class',
      amount: 400,
      date: new Date('2024-01-10'),
      status: 'processing'
    }
  ]);

  // Recent reviews
  recentReviews = signal<Review[]>([
    {
      id: '1',
      clientName: 'Amanda Taylor',
      clientAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face',
      rating: 5,
      comment: 'Absolutely incredible! Mario created the most amazing Italian feast for our anniversary. Every dish was perfect and the presentation was restaurant-quality.',
      eventType: 'Private Dinner',
      date: new Date('2024-01-16')
    },
    {
      id: '2',
      clientName: 'James Wilson',
      rating: 5,
      comment: 'Professional, punctual, and the food was outstanding. Our corporate event was a huge success thanks to Mario\'s excellent catering.',
      eventType: 'Corporate Event',
      date: new Date('2024-01-14')
    },
    {
      id: '3',
      clientName: 'Sophie Martin',
      clientAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&h=60&fit=crop&crop=face',
      rating: 4,
      comment: 'Great cooking class! Learned so much about authentic Italian techniques. Mario is a patient and knowledgeable teacher.',
      eventType: 'Cooking Class',
      date: new Date('2024-01-12')
    }
  ]);

  // Computed properties
  pendingRequests = computed(() => 
    this.recentRequests().filter(req => req.status === 'pending')
  );

  thisMonthEarnings = computed(() => {
    const thisMonth = new Date().getMonth();
    return this.recentEarnings()
      .filter(earning => earning.date.getMonth() === thisMonth)
      .reduce((total, earning) => total + earning.amount, 0);
  });

  // Utility methods
  getStatusClass(status: string): string {
    const classes = {
      pending: 'status-pending',
      accepted: 'status-accepted',
      declined: 'status-declined',
      completed: 'status-completed',
      confirmed: 'status-confirmed',
      paid: 'status-paid',
      processing: 'status-processing'
    };
    return classes[status as keyof typeof classes] || 'status-default';
  }

  getStatusText(status: string): string {
    const texts = {
      pending: 'Pending',
      accepted: 'Accepted',
      declined: 'Declined',
      completed: 'Completed',
      confirmed: 'Confirmed',
      paid: 'Paid',
      processing: 'Processing'
    };
    return texts[status as keyof typeof texts] || status;
  }

  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < Math.floor(rating));
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDateRelative(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return this.formatDate(date);
  }

  // Action methods
  acceptRequest(requestId: string): void {
    const requests = this.recentRequests();
    const updatedRequests = requests.map(req => 
      req.id === requestId ? { ...req, status: 'accepted' as const } : req
    );
    this.recentRequests.set(updatedRequests);
  }

  declineRequest(requestId: string): void {
    const requests = this.recentRequests();
    const updatedRequests = requests.map(req => 
      req.id === requestId ? { ...req, status: 'declined' as const } : req
    );
    this.recentRequests.set(updatedRequests);
  }

  viewBookingDetails(bookingId: string): void {
    console.log('View booking details:', bookingId);
    // TODO: Navigate to booking details page
  }

  viewAllRequests(): void {
    console.log('Navigate to all requests');
    // TODO: Navigate to requests page
  }

  viewAllBookings(): void {
    console.log('Navigate to all bookings');
    // TODO: Navigate to bookings page
  }

  viewAllEarnings(): void {
    console.log('Navigate to earnings page');
    // TODO: Navigate to earnings page
  }

  viewAllReviews(): void {
    console.log('Navigate to reviews page');
    // TODO: Navigate to reviews page
  }
}
