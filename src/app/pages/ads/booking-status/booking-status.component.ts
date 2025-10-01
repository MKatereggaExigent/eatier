import { Component, inject, signal, computed, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AdManagementService } from '../../../core/services/ad-management.service';
import {
  BookingStatus,
  CalendarSlot,
  AvailabilityType,
  ContactInquiry,
  InquiryType
} from '../../../core/models/ad-management.models';

@Component({
  selector: 'app-booking-status',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-status.component.html',
  styleUrls: ['./booking-status.component.scss']
})
export class BookingStatusComponent implements OnInit {
  @Input() userId: string = '';
  @Input() showFullInterface: boolean = true;

  private authService = inject(AuthService);
  private adService = inject(AdManagementService);

  // Make Math available in template
  Math = Math;

  // Signals
  currentUser = this.authService.currentUser;
  bookingStatus = signal<BookingStatus | null>(null);
  isLoading = signal(false);
  showInquiryForm = signal(false);
  showCalendar = signal(false);
  selectedDate = signal<Date | null>(null);
  inquiryForm = signal({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    inquiryType: 'booking' as InquiryType
  });

  // Computed properties
  availabilityStatus = computed(() => {
    const status = this.bookingStatus();
    if (!status) return 'loading';
    return status.isAvailable ? 'available' : 'fully_booked';
  });

  availabilityMessage = computed(() => {
    const status = this.bookingStatus();
    if (!status) return 'Loading availability...';

    if (status.isAvailable) {
      return 'Available for bookings';
    } else {
      const nextDate = status.nextAvailableDate;
      if (nextDate) {
        return `Next available: ${this.formatDate(nextDate)}`;
      }
      return 'Currently fully booked';
    }
  });

  primaryAction = computed(() => {
    const status = this.bookingStatus();
    if (!status) return { text: 'Loading...', disabled: true };

    if (status.isAvailable) {
      return { text: 'Book Now', disabled: false };
    } else {
      return { text: 'Join Waitlist', disabled: false };
    }
  });

  secondaryActions = computed(() => {
    return [
      { text: 'Enquire Now', action: 'enquire' },
      { text: 'Get a Quote', action: 'quote' },
      { text: 'See Calendar', action: 'calendar' }
    ];
  });

  upcomingSlots = computed(() => {
    const status = this.bookingStatus();
    if (!status) return [];

    return status.calendar
      .filter(slot => slot.isAvailable && new Date(slot.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  });

  ngOnInit(): void {
    this.loadBookingStatus();
  }

  async loadBookingStatus(): Promise<void> {
    if (!this.userId) {
      this.userId = this.currentUser()?.id || '';
    }

    if (!this.userId) return;

    this.isLoading.set(true);
    try {
      const status = await this.adService.getBookingStatus(this.userId);
      this.bookingStatus.set(status);
    } catch (error) {
      console.error('Error loading booking status:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Action handlers
  handlePrimaryAction(): void {
    const status = this.bookingStatus();
    if (!status) return;

    if (status.isAvailable) {
      this.openBookingFlow();
    } else {
      this.openWaitlistForm();
    }
  }

  handleSecondaryAction(action: string): void {
    switch (action) {
      case 'enquire':
        this.openInquiryForm('general');
        break;
      case 'quote':
        this.openInquiryForm('quote');
        break;
      case 'calendar':
        this.toggleCalendar();
        break;
    }
  }

  private openBookingFlow(): void {
    // In a real implementation, this would open a booking modal or navigate to booking page
    this.openInquiryForm('booking');
  }

  private openWaitlistForm(): void {
    this.openInquiryForm('booking');
  }

  private openInquiryForm(type: InquiryType): void {
    this.inquiryForm.update(form => ({
      ...form,
      inquiryType: type,
      subject: this.getDefaultSubject(type)
    }));
    this.showInquiryForm.set(true);
  }

  private getDefaultSubject(type: InquiryType): string {
    switch (type) {
      case 'booking': return 'Booking Inquiry';
      case 'quote': return 'Quote Request';
      case 'general': return 'General Inquiry';
      default: return 'Inquiry';
    }
  }

  toggleCalendar(): void {
    this.showCalendar.update(show => !show);
  }

  selectTimeSlot(slot: CalendarSlot): void {
    this.selectedDate.set(slot.date);
    this.openInquiryForm('booking');
  }

  // Form handlers
  async submitInquiry(): Promise<void> {
    const form = this.inquiryForm();
    if (!form.name || !form.email || !form.message) {
      return;
    }

    try {
      const inquiry = await this.adService.submitInquiry({
        recipientId: this.userId,
        inquirerName: form.name,
        inquirerEmail: form.email,
        inquirerPhone: form.phone,
        subject: form.subject,
        message: form.message,
        inquiryType: form.inquiryType,
        priority: 'medium',
        followUpRequired: true,
        tags: []
      });

      // Show success message
      alert('Thank you for your inquiry! We\'ll get back to you soon.');
      this.closeInquiryForm();
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      alert('Sorry, there was an error submitting your inquiry. Please try again.');
    }
  }

  closeInquiryForm(): void {
    this.showInquiryForm.set(false);
    this.inquiryForm.set({
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
      inquiryType: 'booking'
    });
  }

  updateInquiryForm(field: string, value: string): void {
    this.inquiryForm.update(form => ({
      ...form,
      [field]: value
    }));
  }

  // Event handler for input events
  onInputChange(event: Event, field: string): void {
    const target = event.target as HTMLInputElement;
    this.updateInquiryForm(field, target.value);
  }

  // Utility methods
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  }

  formatTime(time: string): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(`2000-01-01T${time}`));
  }

  getAvailabilityClass(): string {
    switch (this.availabilityStatus()) {
      case 'available': return 'status-available';
      case 'fully_booked': return 'status-booked';
      default: return 'status-loading';
    }
  }

  getAvailabilityIcon(): string {
    switch (this.availabilityStatus()) {
      case 'available': return '✅';
      case 'fully_booked': return '📅';
      default: return '⏳';
    }
  }
}
