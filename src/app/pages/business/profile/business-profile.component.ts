import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessProfile, BusinessProfileUpdateData, BUSINESS_PROFILE_CONSTRAINTS } from '../../../shared/models/business-profile.model';

@Component({
  selector: 'app-business-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './business-profile.component.html',
  styleUrls: ['./business-profile.component.scss']
})
export class BusinessProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  profileForm: FormGroup;
  isLoading = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

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

  // Mock business profile data
  currentProfile: BusinessProfile = {
    id: '1',
    userId: 'user-1',
    businessName: 'Bella Italia Restaurant',
    country: 'United States',
    address: {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      country: 'United States',
      zipCode: '10001'
    },
    email: 'contact@bellaitalia.com',
    contactNumber: '+1 (555) 123-4567',
    sustainabilityEthos: 'We source locally and use eco-friendly packaging',
    bio: 'Authentic Italian cuisine in the heart of NYC. Family recipes passed down through generations.',
    facilities: {
      parking: true,
      petFriendly: false,
      carWash: false,
      swimming: false,
      wifi: true,
      airConditioning: true,
      outdoorSeating: true,
      wheelchairAccessible: true
    },
    profilePhotos: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=300&fit=crop'
    ],
    backgroundImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop',
    businessHours: [
      { day: 'Monday', isOpen: true, openTime: '11:00', closeTime: '22:00' },
      { day: 'Tuesday', isOpen: true, openTime: '11:00', closeTime: '22:00' },
      { day: 'Wednesday', isOpen: true, openTime: '11:00', closeTime: '22:00' },
      { day: 'Thursday', isOpen: true, openTime: '11:00', closeTime: '22:00' },
      { day: 'Friday', isOpen: true, openTime: '11:00', closeTime: '23:00' },
      { day: 'Saturday', isOpen: true, openTime: '11:00', closeTime: '23:00' },
      { day: 'Sunday', isOpen: true, openTime: '12:00', closeTime: '21:00' }
    ],
    isVerified: true,
    verificationBadges: ['health_certified', 'eco_friendly'],
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    businessCardCustomization: {
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      logoPosition: 'top',
      includeQR: true,
      includeContact: true,
      includeSocial: true
    }
  };

  constructor() {
    this.profileForm = this.fb.group({
      // Basic Information
      businessName: ['', [Validators.required, Validators.minLength(2)]],
      country: ['', Validators.required],
      businessType: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      contactNumber: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],

      // Address
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: [''],

      // Optional Information
      sustainabilityEthos: ['', Validators.maxLength(200)],
      bio: ['', Validators.maxLength(this.constraints.BIO_MAX_LENGTH)],

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
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    // In a real app, this would load from a service
    this.populateForm(this.currentProfile);
    this.profilePhotos.set(this.currentProfile.profilePhotos);
    this.backgroundImage.set(this.currentProfile.backgroundImage || null);
  }

  populateForm(profile: BusinessProfile): void {
    this.profileForm.patchValue({
      businessName: profile.businessName,
      country: profile.country,
      email: profile.email,
      contactNumber: profile.contactNumber,
      street: profile.address.street,
      city: profile.address.city,
      state: profile.address.state,
      zipCode: profile.address.zipCode,
      sustainabilityEthos: profile.sustainabilityEthos,
      bio: profile.bio,
      ...profile.facilities
    });

    // Populate business hours
    profile.businessHours.forEach(hours => {
      const dayLower = hours.day.toLowerCase();
      this.profileForm.patchValue({
        [`${dayLower}Open`]: hours.isOpen,
        [`${dayLower}OpenTime`]: hours.openTime,
        [`${dayLower}CloseTime`]: hours.closeTime
      });
    });
  }

  setActiveSection(section: string): void {
    this.activeSection.set(section);
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      const formValue = this.profileForm.value;
      const updateData: BusinessProfileUpdateData = {
        businessName: formValue.businessName,
        country: formValue.country,
        email: formValue.email,
        contactNumber: formValue.contactNumber,
        address: {
          street: formValue.street,
          city: formValue.city,
          state: formValue.state,
          zipCode: formValue.zipCode,
          country: formValue.country
        },
        sustainabilityEthos: formValue.sustainabilityEthos,
        bio: formValue.bio,
        facilities: {
          parking: formValue.parking,
          petFriendly: formValue.petFriendly,
          carWash: formValue.carWash,
          swimming: formValue.swimming,
          wifi: formValue.wifi,
          airConditioning: formValue.airConditioning,
          outdoorSeating: formValue.outdoorSeating,
          wheelchairAccessible: formValue.wheelchairAccessible
        },
        businessHours: this.getBusinessHoursFromForm(formValue),
        profilePhotos: this.profilePhotos(),
        backgroundImage: this.backgroundImage() || undefined
      };

      // Mock API call
      setTimeout(() => {
        this.isLoading.set(false);
        this.successMessage.set('Profile updated successfully!');
        setTimeout(() => this.successMessage.set(null), 3000);
      }, 1000);
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
