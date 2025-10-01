import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

interface AdminBooking {
  id: string;
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  businessName: string;
  businessType: 'restaurant' | 'specialist';
  serviceType: string;
  bookingDate: Date;
  bookingTime: string;
  partySize: number;
  totalAmount: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no_show';
  paymentStatus: 'paid' | 'pending' | 'refunded' | 'failed';
  createdAt: Date;
  specialRequests?: string;
  location: string;
}

interface BookingStats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageBookingValue: number;
  noShowRate: number;
}

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="admin-bookings" role="main" aria-label="Admin Bookings Management">
      <header class="bookings-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              <span class="title-icon">📅</span>
              Bookings Management
            </h1>
            <p class="page-subtitle">
              Monitor and manage all platform bookings across restaurants and services
            </p>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">📅</div>
            <div class="stat-content">
              <div class="stat-number">{{ formatNumber(bookingStats().totalBookings) }}</div>
              <div class="stat-label">Total Bookings</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <div class="stat-number">{{ formatNumber(bookingStats().confirmedBookings) }}</div>
              <div class="stat-label">Confirmed</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">⏳</div>
            <div class="stat-content">
              <div class="stat-number">{{ formatNumber(bookingStats().pendingBookings) }}</div>
              <div class="stat-label">Pending</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-content">
              <div class="stat-number">{{ formatCurrency(bookingStats().totalRevenue) }}</div>
              <div class="stat-label">Total Revenue</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <div class="stat-number">{{ formatCurrency(bookingStats().averageBookingValue) }}</div>
              <div class="stat-label">Avg Booking Value</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">📈</div>
            <div class="stat-content">
              <div class="stat-number">{{ bookingStats().noShowRate.toFixed(1) }}%</div>
              <div class="stat-label">No-Show Rate</div>
            </div>
          </div>
        </div>
      </header>

      <!-- Controls Section -->
      <section class="controls-section">
        <div class="controls-content">
          <div class="search-controls">
            <div class="search-input-wrapper">
              <input
                type="text"
                class="search-input"
                placeholder="Search bookings by customer, business, or booking number..."
                [(ngModel)]="searchQuery"
                aria-label="Search bookings">
              <span class="search-icon">🔍</span>
            </div>
          </div>

          <div class="filter-controls">
            <select class="filter-select" [(ngModel)]="statusFilter">
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
              <option value="no_show">No Show</option>
            </select>

            <select class="filter-select" [(ngModel)]="businessTypeFilter">
              <option value="all">All Types</option>
              <option value="restaurant">Restaurants</option>
              <option value="specialist">Specialists</option>
            </select>
          </div>
        </div>
      </section>

      <!-- Bookings List -->
      <section class="bookings-section">
        <div class="bookings-table-container">
          <table class="bookings-table">
            <thead>
              <tr>
                <th>Booking #</th>
                <th>Customer</th>
                <th>Business</th>
                <th>Date & Time</th>
                <th>Party Size</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (booking of filteredBookings(); track booking.id) {
                <tr class="booking-row" [class]="'status-' + booking.status">
                  <td class="booking-number">
                    <strong>{{ booking.bookingNumber }}</strong>
                  </td>

                  <td class="customer-info">
                    <div class="customer-name">{{ booking.customerName }}</div>
                    <div class="customer-email">{{ booking.customerEmail }}</div>
                  </td>

                  <td class="business-info">
                    <div class="business-name">{{ booking.businessName }}</div>
                    <div class="business-type">{{ booking.businessType | titlecase }}</div>
                    <div class="business-location">{{ booking.location }}</div>
                  </td>

                  <td class="booking-datetime">
                    <div class="booking-date">{{ formatDate(booking.bookingDate) }}</div>
                    <div class="booking-time">{{ booking.bookingTime }}</div>
                  </td>

                  <td class="party-size">
                    {{ booking.partySize }} {{ booking.partySize === 1 ? 'person' : 'people' }}
                  </td>

                  <td class="booking-amount">
                    {{ formatCurrency(booking.totalAmount) }}
                  </td>

                  <td class="booking-status">
                    <div class="status-badge" [class]="'status-' + booking.status">
                      {{ booking.status | titlecase }}
                    </div>
                  </td>

                  <td class="payment-status">
                    <div class="payment-badge" [class]="'payment-' + booking.paymentStatus">
                      {{ booking.paymentStatus | titlecase }}
                    </div>
                  </td>

                  <td class="booking-actions">
                    <div class="action-buttons">
                      <button
                        type="button"
                        class="btn-action view-btn"
                        (click)="viewBookingDetails(booking)"
                        title="View Details">
                        👁️
                      </button>

                      @if (booking.status === 'pending') {
                        <button
                          type="button"
                          class="btn-action confirm-btn"
                          (click)="confirmBooking(booking)"
                          title="Confirm Booking">
                          ✅
                        </button>
                      }

                      @if (booking.status !== 'cancelled' && booking.status !== 'completed') {
                        <button
                          type="button"
                          class="btn-action cancel-btn"
                          (click)="cancelBooking(booking)"
                          title="Cancel Booking">
                          ❌
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .admin-bookings {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
      font-family: 'Inter', sans-serif;
    }

    .bookings-header {
      margin-bottom: 2rem;

      .header-content {
        margin-bottom: 2rem;

        .title-section {
          .page-title {
            font-family: 'Playfair Display', serif;
            font-size: 2rem;
            font-weight: 700;
            color: white;
            margin: 0 0 0.5rem 0;
            display: flex;
            align-items: center;
            gap: 1rem;

            .title-icon {
              font-size: 1.5rem;
            }
          }

          .page-subtitle {
            font-size: 1.125rem;
            color: rgba(255, 255, 255, 0.8);
            margin: 0;
          }
        }
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem;

        .stat-card {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 1rem;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.3s ease;

          &:hover {
            background: rgba(255, 255, 255, 0.35);
            transform: translateY(-2px);
          }

          .stat-icon {
            font-size: 1.25rem;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 0.75rem;
          }

          .stat-content {
            .stat-number {
              font-size: 1.25rem;
              font-weight: 700;
              color: white;
              line-height: 1;
              margin-bottom: 0.25rem;
            }

            .stat-label {
              font-size: 0.875rem;
              color: rgba(255, 255, 255, 0.8);
              font-weight: 500;
            }
          }
        }
      }
    }

    .controls-section {
      background: rgba(255, 255, 255, 0.25);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;

      .controls-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;

        .search-controls {
          flex: 1;

          .search-input-wrapper {
            position: relative;
            max-width: 400px;

            .search-input {
              width: 100%;
              padding: 0.75rem 1rem 0.75rem 3rem;
              border: 1px solid rgba(255, 255, 255, 0.3);
              border-radius: 0.75rem;
              background: rgba(255, 255, 255, 0.1);
              color: white;
              font-size: 1rem;

              &::placeholder {
                color: rgba(255, 255, 255, 0.6);
              }

              &:focus {
                outline: none;
                border-color: rgba(255, 255, 255, 0.5);
                background: rgba(255, 255, 255, 0.15);
              }
            }

            .search-icon {
              position: absolute;
              left: 1rem;
              top: 50%;
              transform: translateY(-50%);
              color: rgba(255, 255, 255, 0.6);
            }
          }
        }

        .filter-controls {
          display: flex;
          gap: 0.75rem;

          .filter-select {
            padding: 0.5rem 0.75rem;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 0.5rem;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-size: 0.875rem;

            &:focus {
              outline: none;
              border-color: rgba(255, 255, 255, 0.5);
            }

            option {
              background: #1f2937;
              color: white;
            }
          }
        }
      }
    }

    .bookings-section {
      .bookings-table-container {
        background: rgba(255, 255, 255, 0.25);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 1rem;
        overflow: hidden;

        .bookings-table {
          width: 100%;
          border-collapse: collapse;

          thead {
            background: rgba(255, 255, 255, 0.1);

            th {
              padding: 1rem;
              text-align: left;
              font-weight: 600;
              color: white;
              font-size: 0.875rem;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            }
          }

          tbody {
            .booking-row {
              transition: all 0.3s ease;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);

              &:hover {
                background: rgba(255, 255, 255, 0.1);
              }

              td {
                padding: 1rem;
                vertical-align: middle;
                color: white;
                font-size: 0.875rem;
              }

              .customer-name, .business-name {
                font-weight: 600;
                margin-bottom: 0.25rem;
              }

              .customer-email, .business-type, .business-location {
                color: rgba(255, 255, 255, 0.7);
                font-size: 0.75rem;
              }

              .booking-date {
                font-weight: 600;
                margin-bottom: 0.25rem;
              }

              .booking-time {
                color: rgba(255, 255, 255, 0.7);
                font-size: 0.75rem;
              }

              .status-badge, .payment-badge {
                padding: 0.25rem 0.75rem;
                border-radius: 0.5rem;
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
              }

              .status-confirmed { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
              .status-pending { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
              .status-cancelled { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
              .status-completed { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
              .status-no_show { background: rgba(156, 163, 175, 0.2); color: #9ca3af; }

              .payment-paid { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
              .payment-pending { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
              .payment-refunded { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
              .payment-failed { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

              .action-buttons {
                display: flex;
                gap: 0.5rem;

                .btn-action {
                  width: 32px;
                  height: 32px;
                  border-radius: 0.5rem;
                  border: none;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  cursor: pointer;
                  transition: all 0.3s ease;

                  &.view-btn {
                    background: rgba(59, 130, 246, 0.2);
                    color: #3b82f6;
                    &:hover { background: rgba(59, 130, 246, 0.3); }
                  }

                  &.confirm-btn {
                    background: rgba(34, 197, 94, 0.2);
                    color: #22c55e;
                    &:hover { background: rgba(34, 197, 94, 0.3); }
                  }

                  &.cancel-btn {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                    &:hover { background: rgba(239, 68, 68, 0.3); }
                  }
                }
              }
            }
          }
        }
      }
    }
  `]
})
export class AdminBookingsComponent {
  private authService = inject(AuthService);
  currentUser = this.authService.currentUser;

  // State management
  searchQuery = '';
  statusFilter = 'all';
  businessTypeFilter = 'all';

  // Mock data
  bookingStats = signal<BookingStats>({
    totalBookings: 1247,
    confirmedBookings: 892,
    pendingBookings: 156,
    cancelledBookings: 89,
    completedBookings: 734,
    totalRevenue: 234567,
    monthlyRevenue: 45678,
    averageBookingValue: 187.50,
    noShowRate: 8.3
  });

  mockBookings = signal<AdminBooking[]>([
    {
      id: '1',
      bookingNumber: 'BK-2024-001',
      customerName: 'Sarah Johnson',
      customerEmail: 'sarah.j@email.com',
      businessName: 'The Golden Spoon',
      businessType: 'restaurant',
      serviceType: 'Dinner Reservation',
      bookingDate: new Date('2024-02-15'),
      bookingTime: '7:30 PM',
      partySize: 4,
      totalAmount: 280,
      status: 'confirmed',
      paymentStatus: 'paid',
      createdAt: new Date('2024-01-20'),
      location: 'Manhattan, NY'
    },
    {
      id: '2',
      bookingNumber: 'BK-2024-002',
      customerName: 'Michael Chen',
      customerEmail: 'michael.chen@email.com',
      businessName: 'Chef Mario Rossi',
      businessType: 'specialist',
      serviceType: 'Private Chef Service',
      bookingDate: new Date('2024-02-18'),
      bookingTime: '6:00 PM',
      partySize: 8,
      totalAmount: 650,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date('2024-01-22'),
      location: 'Brooklyn, NY'
    }
  ]);

  // Computed properties
  filteredBookings = computed(() => {
    let filtered = this.mockBookings();

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.customerName.toLowerCase().includes(query) ||
        booking.businessName.toLowerCase().includes(query) ||
        booking.bookingNumber.toLowerCase().includes(query)
      );
    }

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === this.statusFilter);
    }

    if (this.businessTypeFilter !== 'all') {
      filtered = filtered.filter(booking => booking.businessType === this.businessTypeFilter);
    }

    return filtered;
  });

  // Action methods
  viewBookingDetails(booking: AdminBooking): void {
    console.log('View booking details:', booking);
  }

  confirmBooking(booking: AdminBooking): void {
    console.log('Confirm booking:', booking);
  }

  cancelBooking(booking: AdminBooking): void {
    console.log('Cancel booking:', booking);
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }
}
