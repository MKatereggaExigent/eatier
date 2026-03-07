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
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia',
    'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus',
    'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil',
    'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada',
    'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
    'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
    'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia',
    'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada',
    'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India',
    'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan',
    'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia',
    'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives',
    'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova',
    'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal',
    'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
    'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines',
    'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia',
    'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia',
    'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands',
    'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname',
    'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo',
    'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine',
    'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
    'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
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
    // Parse facilities array from database
    const facilities = business.facilities || [];
    const facilitiesMap: any = {
      parking: facilities.includes('parking'),
      petFriendly: facilities.includes('pet_friendly'),
      carWash: facilities.includes('car_wash'),
      swimming: facilities.includes('swimming'),
      wifi: facilities.includes('wifi'),
      airConditioning: facilities.includes('air_conditioning'),
      outdoorSeating: facilities.includes('outdoor_seating'),
      wheelchairAccessible: facilities.includes('wheelchair_accessible')
    };

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
      website: business.website || '',
      ...facilitiesMap
    });

    // Load business hours
    this.loadBusinessHours();
  }

  private loadBusinessHours(): void {
    this.businessOwnerService.getBusinessHours()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading business hours:', error);
          return of({ hours: [] });
        })
      )
      .subscribe(response => {
        if (response && response.hours) {
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const hoursData: any = {};

          response.hours.forEach((hour: any) => {
            // Database uses 0-6 where 0=Sunday, 1=Monday, ..., 6=Saturday
            // Convert to our array index: 0->6 (sunday), 1->0 (monday), 2->1 (tuesday), etc.
            const dayIndex = hour.day_of_week === 0 ? 6 : hour.day_of_week - 1;
            if (dayIndex >= 0 && dayIndex < 7) {
              const dayName = days[dayIndex];
              hoursData[`${dayName}Open`] = !hour.is_closed;
              hoursData[`${dayName}OpenTime`] = hour.open_time || '';
              hoursData[`${dayName}CloseTime`] = hour.close_time || '';
            }
          });

          this.profileForm.patchValue(hoursData);
        }
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

      // Build facilities array from form checkboxes
      const facilities = [];
      if (formValue.parking) facilities.push('parking');
      if (formValue.petFriendly) facilities.push('pet_friendly');
      if (formValue.carWash) facilities.push('car_wash');
      if (formValue.swimming) facilities.push('swimming');
      if (formValue.wifi) facilities.push('wifi');
      if (formValue.airConditioning) facilities.push('air_conditioning');
      if (formValue.outdoorSeating) facilities.push('outdoor_seating');
      if (formValue.wheelchairAccessible) facilities.push('wheelchair_accessible');

      const updateData = {
        businessName: formValue.businessName,
        businessType: formValue.businessType,
        email: formValue.email,
        phone: formValue.contactNumber,
        country: formValue.country,
        address: formValue.street,
        city: formValue.city,
        state: formValue.state,
        zipCode: formValue.zipCode,
        sustainabilityEthos: formValue.sustainabilityEthos,
        bio: formValue.bio,
        website: formValue.website,
        facilities: facilities // Include facilities array
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
            // Also update business hours if they were modified
            this.updateBusinessHours();

            this.successMessage.set('Profile updated successfully!');
            this.loadBusinessProfile(); // Reload to get updated data
            setTimeout(() => this.successMessage.set(null), 3000);
          }
        });
    } else {
      this.markFormGroupTouched();
    }
  }

  private updateBusinessHours(): void {
    const formValue = this.profileForm.value;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const hours = days.map((day, index) => {
      // Database uses 0-6 where 0=Sunday, 1=Monday, ..., 6=Saturday
      // Our array is [monday, tuesday, ..., sunday] so we need to convert:
      // monday (index 0) -> 1, tuesday (index 1) -> 2, ..., saturday (index 5) -> 6, sunday (index 6) -> 0
      const day_of_week = index === 6 ? 0 : index + 1;

      return {
        day_of_week,
        open_time: formValue[`${day}Open`] ? formValue[`${day}OpenTime`] : null,
        close_time: formValue[`${day}Open`] ? formValue[`${day}CloseTime`] : null,
        is_closed: !formValue[`${day}Open`]
      };
    });

    // Only update if at least one day has hours set
    const hasHours = hours.some(h => h.open_time || h.close_time);
    if (hasHours) {
      this.businessOwnerService.updateBusinessHours(hours)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            console.error('Error updating business hours:', error);
            return of(null);
          })
        )
        .subscribe(response => {
          if (response) {
            console.log('Business hours updated successfully');
          }
        });
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
