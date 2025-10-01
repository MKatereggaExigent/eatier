import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserProfile, UserProfileUpdateData, USER_PROFILE_CONSTRAINTS } from '../../../shared/models/user-profile.model';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
  private fb = inject(FormBuilder);

  // State management
  profileForm: FormGroup;
  isLoading = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  activeSection = signal<string>('basic');

  // File uploads
  profilePhoto = signal<string | null>(null);
  backgroundPhoto = signal<string | null>(null);
  portfolioImages = signal<string[]>([]);

  // Constants
  readonly constraints = USER_PROFILE_CONSTRAINTS;
  readonly countries = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
    'France', 'Italy', 'Spain', 'Japan', 'South Korea', 'India', 'Brazil'
  ];

  readonly genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' }
  ];

  readonly visibilityOptions = [
    { value: 'public', label: 'Public', description: 'Anyone can view your profile' },
    { value: 'private', label: 'Private', description: 'Only you can view your profile' },
    { value: 'connections_only', label: 'Connections Only', description: 'Only your connections can view your profile' }
  ];

  // Mock user profile data
  currentProfile: UserProfile = {
    id: '1',
    userId: 'user-1',
    firstName: 'Marco',
    lastName: 'Rossi',
    country: 'United States',
    dateOfBirth: new Date('1985-06-15'),
    gender: 'male',
    email: 'marco.rossi@example.com',
    phone: '+1 (555) 987-6543',
    address: {
      city: 'New York',
      state: 'NY',
      country: 'United States',
      zipCode: '10001'
    },
    specialtyDishes: ['Pasta Carbonara', 'Risotto Milanese', 'Tiramisu', 'Osso Buco'],
    bio: 'Professional chef with 15+ years experience in Italian cuisine. Passionate about authentic flavors and traditional techniques.',
    experience: 15,
    certifications: ['Culinary Arts Diploma', 'Food Safety Certification', 'Wine Sommelier Level 1'],
    profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
    backgroundPhoto: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=400&fit=crop',
    portfolioImages: [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop'
    ],
    status: 'active',
    isVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    businessCardCustomization: {
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      layout: 'professional',
      includeQR: true,
      includeContact: true,
      includeSpecialties: true,
      includeBio: true
    },
    profileVisibility: 'public',
    showContactInfo: true,
    showLocation: false
  };

  constructor() {
    this.profileForm = this.fb.group({
      // Basic Information
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      country: ['', Validators.required],
      dateOfBirth: [''],
      gender: [''],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.pattern(/^\+?[\d\s\-\(\)]+$/)],

      // Address
      street: [''],
      city: [''],
      state: [''],
      zipCode: [''],

      // Professional Information
      isChef: [false],
      experience: ['', [Validators.min(0), Validators.max(this.constraints.MAX_EXPERIENCE_YEARS)]],
      bio: ['', Validators.maxLength(this.constraints.BIO_MAX_LENGTH)],

      // Privacy Settings
      profileVisibility: ['public', Validators.required],
      showContactInfo: [true],
      showLocation: [false]
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    // In a real app, this would load from a service
    this.populateForm(this.currentProfile);
    this.profilePhoto.set(this.currentProfile.profilePhoto || null);
    this.backgroundPhoto.set(this.currentProfile.backgroundPhoto || null);
    this.portfolioImages.set(this.currentProfile.portfolioImages || []);
  }

  populateForm(profile: UserProfile): void {
    this.profileForm.patchValue({
      firstName: profile.firstName,
      lastName: profile.lastName,
      country: profile.country,
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.toISOString().split('T')[0] : '',
      gender: profile.gender,
      email: profile.email,
      phone: profile.phone,
      street: profile.address?.street,
      city: profile.address?.city,
      state: profile.address?.state,
      zipCode: profile.address?.zipCode,
      experience: profile.experience,
      bio: profile.bio,
      profileVisibility: profile.profileVisibility,
      showContactInfo: profile.showContactInfo,
      showLocation: profile.showLocation
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
      const updateData: UserProfileUpdateData = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        country: formValue.country,
        dateOfBirth: formValue.dateOfBirth ? new Date(formValue.dateOfBirth) : undefined,
        gender: formValue.gender,
        email: formValue.email,
        phone: formValue.phone,
        address: {
          street: formValue.street,
          city: formValue.city,
          state: formValue.state,
          zipCode: formValue.zipCode,
          country: formValue.country
        },
        experience: formValue.experience,
        bio: formValue.bio,
        profilePhoto: this.profilePhoto() || undefined,
        backgroundPhoto: this.backgroundPhoto() || undefined,
        portfolioImages: this.portfolioImages(),
        profileVisibility: formValue.profileVisibility,
        showContactInfo: formValue.showContactInfo,
        showLocation: formValue.showLocation
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

  onFileUpload(event: Event, type: 'profile' | 'background' | 'portfolio'): void {
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
        this.profilePhoto.set(mockUrl);
      } else if (type === 'background') {
        this.backgroundPhoto.set(mockUrl);
      } else if (type === 'portfolio') {
        const current = this.portfolioImages();
        if (current.length < this.constraints.MAX_PORTFOLIO_IMAGES) {
          this.portfolioImages.set([...current, mockUrl]);
        }
      }
    }
  }

  removeProfilePhoto(): void {
    this.profilePhoto.set(null);
  }

  removeBackgroundPhoto(): void {
    this.backgroundPhoto.set(null);
  }

  removePortfolioImage(index: number): void {
    const current = this.portfolioImages();
    this.portfolioImages.set(current.filter((_, i) => i !== index));
  }

  addSpecialtyDish(dish: string): void {
    if (dish.trim() && this.currentProfile.specialtyDishes && this.currentProfile.specialtyDishes.length < this.constraints.MAX_SPECIALTY_DISHES) {
      this.currentProfile.specialtyDishes.push(dish.trim());
    }
  }

  removeSpecialtyDish(index: number): void {
    if (this.currentProfile.specialtyDishes) {
      this.currentProfile.specialtyDishes.splice(index, 1);
    }
  }

  addCertification(cert: string): void {
    if (cert.trim() && this.currentProfile.certifications && this.currentProfile.certifications.length < this.constraints.MAX_CERTIFICATIONS) {
      this.currentProfile.certifications.push(cert.trim());
    }
  }

  removeCertification(index: number): void {
    if (this.currentProfile.certifications) {
      this.currentProfile.certifications.splice(index, 1);
    }
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
      if (field.errors?.['min']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors?.['min'].min}`;
      }
      if (field.errors?.['max']) {
        return `${this.getFieldLabel(fieldName)} must be no more than ${field.errors?.['max'].max}`;
      }
    }
    return null;
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      firstName: 'First name',
      lastName: 'Last name',
      country: 'Country',
      email: 'Email',
      phone: 'Phone number',
      city: 'City',
      state: 'State',
      experience: 'Experience',
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

  calculateAge(): number | null {
    const birthDate = this.currentProfile.dateOfBirth;
    if (!birthDate) return null;

    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }

    return age;
  }
}
