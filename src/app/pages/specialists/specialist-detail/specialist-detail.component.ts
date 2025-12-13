import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  PublicSpecialistService, 
  SpecialistDetail, 
  SpecialistService,
  BookingRequest 
} from '../../../core/services/public-specialist.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-specialist-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './specialist-detail.component.html',
  styleUrls: ['./specialist-detail.component.scss']
})
export class SpecialistDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private publicSpecialistService = inject(PublicSpecialistService);
  private authService = inject(AuthService);

  specialist = signal<SpecialistDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  
  // Booking form
  showBookingForm = signal(false);
  bookingLoading = signal(false);
  bookingSuccess = signal(false);
  bookingError = signal<string | null>(null);
  
  selectedService = signal<SpecialistService | null>(null);
  bookingForm = signal<BookingRequest>({
    bookingDate: '',
    guestCount: 4,
    eventType: 'Private Dinner',
    eventCity: '',
    eventAddress: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    specialRequests: ''
  });

  eventTypes = [
    'Private Dinner',
    'Birthday Party',
    'Corporate Event',
    'Wedding Reception',
    'Cooking Class',
    'Family Gathering',
    'Anniversary Dinner',
    'Other'
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadSpecialist(id);
    }
  }

  loadSpecialist(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.publicSpecialistService.getSpecialistById(id).subscribe({
      next: (specialist) => {
        this.specialist.set(specialist);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading specialist:', err);
        this.error.set('Failed to load specialist details');
        this.loading.set(false);
      }
    });
  }

  selectService(service: SpecialistService): void {
    this.selectedService.set(service);
    this.openBookingForm();
  }

  openBookingForm(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.url } 
      });
      return;
    }
    
    const user = this.authService.currentUser();
    if (user) {
      this.bookingForm.update(form => ({
        ...form,
        contactName: `${user.firstName} ${user.lastName}`,
        contactEmail: user.email
      }));
    }
    this.showBookingForm.set(true);
  }

  closeBookingForm(): void {
    this.showBookingForm.set(false);
    this.bookingSuccess.set(false);
    this.bookingError.set(null);
  }

  updateBookingField(field: keyof BookingRequest, value: any): void {
    this.bookingForm.update(form => ({ ...form, [field]: value }));
  }

  submitBooking(): void {
    const specialist = this.specialist();
    if (!specialist) return;

    this.bookingLoading.set(true);
    this.bookingError.set(null);

    const booking: BookingRequest = {
      ...this.bookingForm(),
      serviceId: this.selectedService()?.id
    };

    this.publicSpecialistService.bookSpecialist(specialist.id, booking).subscribe({
      next: (response) => {
        this.bookingSuccess.set(true);
        this.bookingLoading.set(false);
      },
      error: (err) => {
        console.error('Booking error:', err);
        this.bookingError.set(err.error?.error || 'Failed to submit booking');
        this.bookingLoading.set(false);
      }
    });
  }

  getStarRating(rating: number): string {
    return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '');
  }

  getDefaultAvatar(name: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4ecdc4&color=fff&size=200`;
  }

  calculatePrice(): number {
    const service = this.selectedService();
    const guests = this.bookingForm().guestCount;
    if (!service) return 0;
    return service.basePrice + (service.pricePerPerson * guests);
  }
}

