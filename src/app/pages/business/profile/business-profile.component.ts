import { BUSINESS_PROFILE_CONSTRAINTS, BusinessProfile, BusinessProfileUpdateData } from '../../../shared/models/business-profile.model';
import { Business, BusinessOwnerService } from '../../../core/services/business-owner.service';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, finalize, of, takeUntil } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-business-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './business-profile.component.html',
  styleUrls: ['./business-profile.component.scss']
})
export class BusinessProfileComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private businessOwnerService = inject(BusinessOwnerService);
  private destroy$ = new Subject<void>();

  profileForm: FormGroup;
  hoursForm: FormGroup;
  isLoading = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Business data from API
  business = signal<Business | null>(null);

  // Form sections
  activeSection = signal<string>('basic');

  // File uploads
  profilePhotos = signal<string[]>([]);
  backgroundImage = signal<string | null>(null);

  // Constants
  readonly constraints = BUSINESS_PROFILE_CONSTRAINTS;
  readonly countries = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
    'France', 'Italy', 'Spain', 'Japan', 'South Korea', 'India', 'Brazil'
  ];

  // Business types as specified
  readonly businessTypes = [
    'Restaurant', 'Cafe', 'Bar', 'Food Truck', 'Catering', 'Bakery',
    'Fast Food', 'Fine Dining', 'Buffet', 'Takeaway', 'Other'
  ];

  readonly facilityIcons = {
    parking: '🅿️',
    petFriendly: '🐕',
    carWash: '🚗',
    swimming: '🏊',
    wifi: '📶',
    airConditioning: '❄️',
    outdoorSeating: '🌳',
    wheelchairAccessible: '♿'
  };

  // Make Object available in template
  readonly Object = Object;

  constructor() {
    this.profileForm = this.fb.group({
      // Basic Information
      businessName: ['', [Validators.required, Validators.minLength(2)]],
      businessType: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      contactNumber: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
      country: ['', Validators.required],
      sustainabilityEthos: ['', Validators.maxLength(200)],

      // Address
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: [''],

      // Details
      bio: ['', [Validators.required, Validators.maxLength(500)]],
      description: ['', Validators.maxLength(500)],
      website: [''],

      // Facilities
      parking: [false],
      petFriendly: [false],
      carWash: [false],
      swimming: [false],
      wifi: [false],
      airConditioning: [false],
      outdoorSeating: [false],
      wheelchairAccessible: [false],

      // Business Hours
      mondayOpen: [false],
      mondayOpenTime: [''],
      mondayCloseTime: [''],
      tuesdayOpen: [false],
      tuesdayOpenTime: [''],
      tuesdayCloseTime: [''],
      wednesdayOpen: [false],
      wednesdayOpenTime: [''],
      wednesdayCloseTime: [''],
      thursdayOpen: [false],
      thursdayOpenTime: [''],
      thursdayCloseTime: [''],
      fridayOpen: [false],
      fridayOpenTime: [''],
      fridayCloseTime: [''],
      saturdayOpen: [false],
      saturdayOpenTime: [''],
      saturdayCloseTime: [''],
      sundayOpen: [false],
      sundayOpenTime: [''],
      sundayCloseTime: ['']
    });

    // Keep hoursForm for backward compatibility if needed
    this.hoursForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.loadBusinessProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBusinessProfile(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.businessOwnerService.getMyBusiness()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading business profile:', error);
          this.errorMessage.set('Failed to load business profile. Please try again.');
          return of({ business: null });
        }),
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe(response => {
        if (response && response.business) {
          this.business.set(response.business);
          this.populateForm(response.business);
        }
      });
  }

  populateForm(business: any): void {
    this.profileForm.patchValue({
      businessName: business.business_name || '',
      businessType: business.business_type || '',
      email: business.email || '',
      contactNumber: business.phone || '',
      country: business.country || '',
      sustainabilityEthos: business.sustainability_ethos || '',
      street: business.address || '',
      city: business.city || '',
      state: business.state || '',
      zipCode: business.postal_code || '',
      bio: business.description || business.sustainability_ethos || '',
      description: business.description || '',
      website: business.website || ''
    });
  }

  resetForm(): void {
    const currentBusiness = this.business();
    if (currentBusiness) {
      this.populateForm(currentBusiness);
    } else {
      this.profileForm.reset();
    }
  }

  setActiveSection(section: string): void {
    this.activeSection.set(section);
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      const formValue = this.profileForm.value;
      const updateData = {
        businessName: formValue.businessName,
        businessType: formValue.businessType,
        email: formValue.email,
        phone: formValue.contactNumber, // Fixed: use 'phone' instead of 'contact_number'
        address: formValue.street,
        city: formValue.city,
        state: formValue.state,
        zipCode: formValue.zipCode,
        sustainabilityEthos: formValue.sustainabilityEthos,
        bio: formValue.bio,
        website: formValue.website
      };

      this.businessOwnerService.updateMyBusiness(updateData)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            console.error('Error updating business profile:', error);
            this.errorMessage.set('Failed to update business profile. Please try again.');
            return of(null);
          }),
          finalize(() => {
            this.isLoading.set(false);
          })
        )
        .subscribe(response => {
          if (response) {
            this.successMessage.set('Profile updated successfully!');
            this.loadBusinessProfile(); // Reload to get updated data
            setTimeout(() => this.successMessage.set(null), 3000);
          }
        });
    } else {
      this.markFormGroupTouched();
    }
  }

  private getBusinessHoursFromForm(formValue: any) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days.map(day => ({
      day: day.charAt(0).toUpperCase() + day.slice(1),
      isOpen: formValue[`${day}Open`],
      openTime: formValue[`${day}OpenTime`],
      closeTime: formValue[`${day}CloseTime`]
    }));
  }

  onFileUpload(event: Event, type: 'profile' | 'background'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file
      if (!this.validateFile(file)) {
        return;
      }

      // Mock file upload - in real app, upload to cloud storage
      const mockUrl = URL.createObjectURL(file);

      if (type === 'profile') {
        const current = this.profilePhotos();
        if (current.length < this.constraints.MAX_PROFILE_PHOTOS) {
          this.profilePhotos.set([...current, mockUrl]);
        }
      } else {
        this.backgroundImage.set(mockUrl);
      }
    }
  }

  removeProfilePhoto(index: number): void {
    const current = this.profilePhotos();
    this.profilePhotos.set(current.filter((_, i) => i !== index));
  }

  removeBackgroundImage(): void {
    this.backgroundImage.set(null);
  }

  private validateFile(file: File): boolean {
    const validTypes = this.constraints.SUPPORTED_IMAGE_FORMATS.map(format => `image/${format}`);
    if (!validTypes.includes(file.type)) {
      this.errorMessage.set('Please upload a valid image file (JPG, PNG, WebP)');
      return false;
    }

    if (file.size > this.constraints.MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      this.errorMessage.set(`File size must be less than ${this.constraints.MAX_IMAGE_SIZE_MB}MB`);
      return false;
    }

    return true;
  }

  getFieldError(fieldName: string): string | null {
    const field = this.profileForm.get(fieldName);
    if (field && field.invalid && (field.dirty || field.touched)) {
      if (field.errors?.['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors?.['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors?.['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors?.['minlength'].requiredLength} characters`;
      }
      if (field.errors?.['maxlength']) {
        return `${this.getFieldLabel(fieldName)} must be less than ${field.errors?.['maxlength'].requiredLength} characters`;
      }
      if (field.errors?.['pattern']) {
        return 'Please enter a valid phone number';
      }
    }
    return null;
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      businessName: 'Business name',
      country: 'Country',
      email: 'Email',
      contactNumber: 'Contact number',
      street: 'Street address',
      city: 'City',
      state: 'State',
      zipCode: 'ZIP code',
      sustainabilityEthos: 'Sustainability ethos',
      bio: 'Bio'
    };
    return labels[fieldName] || fieldName;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.profileForm.controls).forEach(key => {
      const control = this.profileForm.get(key);
      control?.markAsTouched();
    });
  }

  getBioCharacterCount(): number {
    return this.profileForm.get('bio')?.value?.length || 0;
  }

  getSustainabilityCharacterCount(): number {
    return this.profileForm.get('sustainabilityEthos')?.value?.length || 0;
  }

  getFacilityIcon(facility: string): string {
    return this.facilityIcons[facility as keyof typeof this.facilityIcons] || '📋';
  }
}
