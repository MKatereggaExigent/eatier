import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { USER_PROFILE_CONSTRAINTS, UserProfile, UserProfileUpdateData } from '../../../shared/models/user-profile.model';

import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private userService = inject(UserService);

  // State management
  profileForm: FormGroup;
  isLoading = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  activeSection = signal<string>('basic');
  currentProfile = signal<UserProfile | null>(null);

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
    const user = this.authService.currentUser();

    if (user) {
      // Create profile from authenticated user data
      const profile: UserProfile = {
        id: user.id,
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        country: '',
        email: user.email,
        phone: '',
        specialtyDishes: [],
        bio: '',
        experience: 0,
        profilePhoto: '',
        status: 'active',
        isVerified: false,
        createdAt: new Date(),
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

      this.currentProfile.set(profile);
      this.populateForm(profile);
      this.profilePhoto.set(profile.profilePhoto || null);
      this.backgroundPhoto.set(profile.backgroundPhoto || null);
      this.portfolioImages.set(profile.portfolioImages || []);
    }
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
      const user = this.currentUser();

      if (!user?.id) {
        this.errorMessage.set('User not found. Please log in again.');
        this.isLoading.set(false);
        return;
      }

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

      // Call the real API
      this.userService.updateUserProfile(user.id, updateData).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.successMessage.set('Profile updated successfully!');
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          this.isLoading.set(false);
          this.errorMessage.set('Failed to update profile. Please try again.');
        }
      });
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
    const profile = this.currentProfile();
    if (dish.trim() && profile?.specialtyDishes && profile.specialtyDishes.length < this.constraints.MAX_SPECIALTY_DISHES) {
      profile.specialtyDishes.push(dish.trim());
      this.currentProfile.set(profile);
    }
  }

  removeSpecialtyDish(index: number): void {
    const profile = this.currentProfile();
    if (profile?.specialtyDishes) {
      profile.specialtyDishes.splice(index, 1);
      this.currentProfile.set(profile);
    }
  }

  addCertification(cert: string): void {
    const profile = this.currentProfile();
    if (cert.trim() && profile?.certifications && profile.certifications.length < this.constraints.MAX_CERTIFICATIONS) {
      profile.certifications.push(cert.trim());
      this.currentProfile.set(profile);
    }
  }

  removeCertification(index: number): void {
    const profile = this.currentProfile();
    if (profile?.certifications) {
      profile.certifications.splice(index, 1);
      this.currentProfile.set(profile);
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
    const profile = this.currentProfile();
    const birthDate = profile?.dateOfBirth;
    if (!birthDate) return null;

    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }

    return age;
  }

  // Date of birth constraints - allow users from age 13 to 120
  getMinBirthDate(): string {
    const today = new Date();
    const minYear = today.getFullYear() - 120; // 120 years ago
    return `${minYear}-01-01`;
  }

  getMaxBirthDate(): string {
    const today = new Date();
    const maxYear = today.getFullYear() - 13; // Must be at least 13 years old
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${maxYear}-${month}-${day}`;
  }
}
