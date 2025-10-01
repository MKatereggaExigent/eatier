import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { LoginCredentials } from '../../shared/models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm: FormGroup;
  isLoading = this.authService.isLoading;
  errorMessage = signal<string | null>(null);
  showPassword = signal<boolean>(false);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.errorMessage.set(null);

      const credentials: LoginCredentials = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password
      };

      this.authService.login(credentials).subscribe({
        next: (response) => {
          // Handle successful login
          const redirectUrl = localStorage.getItem('eatier_redirect_url') || this.getDefaultRoute(response.user.role);
          localStorage.removeItem('eatier_redirect_url');
          this.router.navigateByUrl(redirectUrl);
        },
        error: (error) => {
          this.errorMessage.set(error.message || 'Login failed. Please try again.');
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(show => !show);
  }

  getFieldError(fieldName: string): string | null {
    const field = this.loginForm.get(fieldName);
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
    }
    return null;
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      email: 'Email',
      password: 'Password'
    };
    return labels[fieldName] || fieldName;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  private getDefaultRoute(role: string): string {
    switch (role) {
      case 'eatier':
        return '/admin';
      case 'business':
        return '/dashboard/business';
      case 'food_enthusiast':
        return '/dashboard/food-enthusiast';
      case 'normal_user':
        return '/dashboard/user';
      case 'specialist':
        return '/dashboard/specialist';
      default:
        return '/dashboard/user'; // Default to user dashboard instead of home
    }
  }

  // Demo login methods for testing
  loginAsBusinessOwner(): void {
    this.loginForm.patchValue({
      email: 'business@example.com',
      password: 'password123'
    });
    this.onSubmit();
  }

  loginAsIndividualUser(): void {
    this.loginForm.patchValue({
      email: 'user@example.com',
      password: 'password123'
    });
    this.onSubmit();
  }

  loginAsChef(): void {
    this.loginForm.patchValue({
      email: 'chef@example.com',
      password: 'password123'
    });
    this.onSubmit();
  }

  loginAsNormalUser(): void {
    this.loginForm.patchValue({
      email: 'normaluser@example.com',
      password: 'password123'
    });
    this.onSubmit();
  }

  loginAsAdmin(): void {
    this.loginForm.patchValue({
      email: 'admin@example.com',
      password: 'password123'
    });
    this.onSubmit();
  }
}
