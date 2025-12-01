import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserRegistrationData, UserRole } from '../../shared/models/user.model';

import { AuthService } from '../../core/services/auth.service';
import { GoogleMapsService } from '../../core/services/google-maps.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private googleMapsService = inject(GoogleMapsService);

  registerForm: FormGroup;
  isLoading = this.authService.isLoading;
  errorMessage = signal<string | null>(null);
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);
  selectedRole = signal<UserRole>(UserRole.NORMAL_USER);
  addressSuggestions = signal<any[]>([]);
  selectedPlaceId = signal<string | null>(null);
  addressDetails = signal<any>(null);

  readonly UserRole = UserRole;

  constructor() {
    this.registerForm = this.fb.group({
      role: [UserRole.NORMAL_USER, Validators.required],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      businessName: [''], // For business owners
      businessType: [''], // For business owners
      businessAddress: [''], // For business owners
      businessCountry: [''], // For business owners
      experience: [0], // For chefs and waitstaff
      specialties: [[]], // For chefs
      agreeToTerms: [false, Validators.requiredTrue],
      agreeToMarketing: [false]
    }, { validators: this.passwordMatchValidator });

    // Watch for role changes to update form validation
    this.registerForm.get('role')?.valueChanges.subscribe(role => {
      this.selectedRole.set(role);
      this.updateFormValidation(role);
    });
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.errorMessage.set(null);

      const formValue = this.registerForm.value;
      const registrationData: UserRegistrationData = {
        email: formValue.email,
        password: formValue.password,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        phone: formValue.phone || undefined,
        role: formValue.role,
        businessName: formValue.businessName || undefined,
        businessType: formValue.businessType || undefined,
        businessAddress: formValue.businessAddress || undefined,
        businessCountry: formValue.businessCountry || undefined,
        experience: formValue.experience || undefined,
        specialties: formValue.specialties || undefined
      };

      // Add address details if available
      if (this.addressDetails()) {
        (registrationData as any).addressDetails = {
          placeId: this.addressDetails().placeId,
          latitude: this.addressDetails().latitude,
          longitude: this.addressDetails().longitude,
          formattedAddress: this.addressDetails().formattedAddress
        };
      }

      this.authService.register(registrationData).subscribe({
        next: (response) => {
          // Handle successful registration
          const redirectUrl = this.getDefaultRoute(response.user.role);
          this.router.navigateByUrl(redirectUrl);
        },
        error: (error) => {
          this.errorMessage.set(error.message || 'Registration failed. Please try again.');
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.showPassword.update(show => !show);
    } else {
      this.showConfirmPassword.update(show => !show);
    }
  }

  getFieldError(fieldName: string): string | null {
    const field = this.registerForm.get(fieldName);
    if (field && field.invalid && (field.dirty || field.touched)) {
      if (field.errors?.['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors?.['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors?.['minlength']) {
        const requiredLength = field.errors?.['minlength'].requiredLength;
        return `${this.getFieldLabel(fieldName)} must be at least ${requiredLength} characters`;
      }
      if (field.errors?.['passwordMismatch']) {
        return 'Passwords do not match';
      }
    }
    return null;
  }

  getRoleDescription(role: UserRole): string {
    const descriptions = {
      [UserRole.EATIER]: 'Platform administrator with full system access to manage all accounts and content',
      [UserRole.BUSINESS]: 'Restaurant owners showcasing businesses, menus, services, rates, and specials',
      [UserRole.FOOD_ENTHUSIAST]: 'Food lovers exploring cuisines, finding restaurants, rating, reviewing, and critiquing',
      [UserRole.NORMAL_USER]: 'Regular users looking for nearby food options for breakfast, lunch, or dinner',
      [UserRole.SPECIALIST]: 'Individual chefs, waiters, and waitresses advertising private services and events'
    };
    return descriptions[role] || '';
  }

  getRoleIcon(role: UserRole): string {
    const icons = {
      [UserRole.EATIER]: '👑',
      [UserRole.BUSINESS]: '🏢',
      [UserRole.FOOD_ENTHUSIAST]: '🍽️',
      [UserRole.NORMAL_USER]: '🔍',
      [UserRole.SPECIALIST]: '👨‍🍳'
    };
    return icons[role] || '👤';
  }

  private updateFormValidation(role: UserRole): void {
    const businessNameControl = this.registerForm.get('businessName');
    const businessTypeControl = this.registerForm.get('businessType');
    const businessAddressControl = this.registerForm.get('businessAddress');
    const businessCountryControl = this.registerForm.get('businessCountry');
    const experienceControl = this.registerForm.get('experience');
    const specialtiesControl = this.registerForm.get('specialties');

    // Reset all conditional validators
    businessNameControl?.clearValidators();
    businessTypeControl?.clearValidators();
    businessAddressControl?.clearValidators();
    businessCountryControl?.clearValidators();
    experienceControl?.clearValidators();
    specialtiesControl?.clearValidators();

    // Add role-specific validators
    switch (role) {
      case UserRole.BUSINESS:
        businessNameControl?.setValidators([Validators.required, Validators.minLength(2)]);
        businessTypeControl?.setValidators([Validators.required]);
        businessAddressControl?.setValidators([Validators.required]);
        businessCountryControl?.setValidators([Validators.required]);
        break;
      case UserRole.SPECIALIST:
        experienceControl?.setValidators([Validators.required, Validators.min(0)]);
        specialtiesControl?.setValidators([Validators.required]);
        break;
    }

    // Update validity
    businessNameControl?.updateValueAndValidity();
    businessTypeControl?.updateValueAndValidity();
    businessAddressControl?.updateValueAndValidity();
    businessCountryControl?.updateValueAndValidity();
    experienceControl?.updateValueAndValidity();
    specialtiesControl?.updateValueAndValidity();
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    if (confirmPassword?.errors?.['passwordMismatch']) {
      delete confirmPassword.errors['passwordMismatch'];
      if (Object.keys(confirmPassword.errors).length === 0) {
        confirmPassword.setErrors(null);
      }
    }

    return null;
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      phone: 'Phone',
      password: 'Password',
      confirmPassword: 'Confirm password',
      businessName: 'Business name',
      experience: 'Experience',
      specialties: 'Specialties'
    };
    return labels[fieldName] || fieldName;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }

  private getDefaultRoute(role: string): string {
    switch (role) {
      case 'itiyum_admin':
      case 'itiyum':
        return '/admin/overview';
      case 'business_owner':
      case 'business':
        return '/dashboard/business/overview';
      case 'food_enthusiast':
        return '/dashboard/food-enthusiast/overview';
      case 'specialist':
        return '/dashboard/specialist/overview';
      case 'normal_user':
        return '/dashboard/user/overview';
      default:
        return '/dashboard/user/overview';
    }
  }

  // Google Maps Address Autocomplete
  async onAddressInput(value: string): Promise<void> {
    if (!value || value.length < 3) {
      this.addressSuggestions.set([]);
      return;
    }

    try {
      const predictions = await this.googleMapsService.getPlacePredictions(value);
      this.addressSuggestions.set(predictions);
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      this.addressSuggestions.set([]);
    }
  }

  async selectAddress(suggestion: any): Promise<void> {
    try {
      const placeDetails = await this.googleMapsService.getPlaceDetails(suggestion.place_id);

      // Update form with address details
      this.registerForm.patchValue({
        businessAddress: placeDetails.formattedAddress,
        businessCountry: placeDetails.addressComponents.country || ''
      });

      // Store place details for submission
      this.selectedPlaceId.set(placeDetails.placeId);
      this.addressDetails.set(placeDetails);

      // Clear suggestions
      this.addressSuggestions.set([]);
    } catch (error) {
      console.error('Error fetching place details:', error);
      this.errorMessage.set('Failed to fetch address details. Please try again.');
    }
  }
}
