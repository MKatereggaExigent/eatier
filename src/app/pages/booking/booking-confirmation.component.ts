import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Booking {
  id: string;
  booking_reference: string;
  business_name: string;
  business_phone?: string;
  business_email?: string;
  business_address?: string;
  booking_date: string;
  booking_time: string;
  party_size: number;
  status: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  occasion?: string;
  special_requests?: string;
  booking_tier: string;
  created_at: string;
}

@Component({
  selector: 'app-booking-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './booking-confirmation.component.html',
  styleUrls: ['./booking-confirmation.component.scss']
})
export class BookingConfirmationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  booking = signal<Booking | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  currentYear = new Date().getFullYear();

  ngOnInit(): void {
    const reference = this.route.snapshot.paramMap.get('reference');
    if (reference) {
      this.loadBooking(reference);
    } else {
      this.error.set('No booking reference provided');
      this.loading.set(false);
    }
  }

  loadBooking(reference: string): void {
    this.http.get<any>(`${environment.apiUrl}/bookings/reference/${reference}`)
      .subscribe({
        next: (response) => {
          this.booking.set(response.booking);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading booking:', err);
          this.error.set('Booking not found. Please check your booking reference.');
          this.loading.set(false);
        }
      });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-ZA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTime(timeStr: string): string {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'status-pending',
      confirmed: 'status-confirmed',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      no_show: 'status-no-show'
    };
    return classes[status] || '';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending Confirmation',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No Show'
    };
    return labels[status] || status;
  }
}

