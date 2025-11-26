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
          const redirectUrl = localStorage.getItem('itiyum_redirect_url') || this.getDefaultRoute(response.user.role);
          localStorage.removeItem('itiyum_redirect_url');
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
        return '/dashboard/user/overview'; // Default to user overview
    }
  }

  // Social Login Methods
  loginWithGoogle(): void {
    this.errorMessage.set(null);
    console.log('Initiating Google OAuth login...');

    // TODO: Implement Google OAuth integration
    // Will use Google Identity Services (GIS) or Firebase Auth
    this.authService.loginWithSocialProvider('google').subscribe({
      next: (response) => {
        const redirectUrl = localStorage.getItem('itiyum_redirect_url') || this.getDefaultRoute(response.user.role);
        localStorage.removeItem('itiyum_redirect_url');
        this.router.navigateByUrl(redirectUrl);
      },
      error: (error) => {
        this.errorMessage.set('Google login failed. Please try again.');
        console.error('Google login error:', error);
      }
    });
  }

  loginWithFacebook(): void {
    this.errorMessage.set(null);
    console.log('Initiating Facebook OAuth login...');

    // TODO: Implement Facebook OAuth integration
    // Will use Facebook Login SDK
    this.authService.loginWithSocialProvider('facebook').subscribe({
      next: (response) => {
        const redirectUrl = localStorage.getItem('itiyum_redirect_url') || this.getDefaultRoute(response.user.role);
        localStorage.removeItem('itiyum_redirect_url');
        this.router.navigateByUrl(redirectUrl);
      },
      error: (error) => {
        this.errorMessage.set('Facebook login failed. Please try again.');
        console.error('Facebook login error:', error);
      }
    });
  }

  loginWithMicrosoft(): void {
    this.errorMessage.set(null);
    console.log('Initiating Microsoft OAuth login...');

    // TODO: Implement Microsoft OAuth integration
    // Will use Microsoft Authentication Library (MSAL)
    this.authService.loginWithSocialProvider('microsoft').subscribe({
      next: (response) => {
        const redirectUrl = localStorage.getItem('itiyum_redirect_url') || this.getDefaultRoute(response.user.role);
        localStorage.removeItem('itiyum_redirect_url');
        this.router.navigateByUrl(redirectUrl);
      },
      error: (error) => {
        this.errorMessage.set('Microsoft login failed. Please try again.');
        console.error('Microsoft login error:', error);
      }
    });
  }

  loginWithApple(): void {
    this.errorMessage.set(null);
    console.log('Initiating Apple OAuth login...');

    // TODO: Implement Apple Sign In
    // Will use Sign in with Apple JS
    this.authService.loginWithSocialProvider('apple').subscribe({
      next: (response) => {
        const redirectUrl = localStorage.getItem('itiyum_redirect_url') || this.getDefaultRoute(response.user.role);
        localStorage.removeItem('itiyum_redirect_url');
        this.router.navigateByUrl(redirectUrl);
      },
      error: (error) => {
        this.errorMessage.set('Apple login failed. Please try again.');
        console.error('Apple login error:', error);
      }
    });
  }

  loginWithTwitter(): void {
    this.errorMessage.set(null);
    console.log('Initiating Twitter/X OAuth login...');

    // TODO: Implement Twitter OAuth 2.0 integration
    this.authService.loginWithSocialProvider('twitter').subscribe({
      next: (response) => {
        const redirectUrl = localStorage.getItem('itiyum_redirect_url') || this.getDefaultRoute(response.user.role);
        localStorage.removeItem('itiyum_redirect_url');
        this.router.navigateByUrl(redirectUrl);
      },
      error: (error) => {
        this.errorMessage.set('Twitter login failed. Please try again.');
        console.error('Twitter login error:', error);
      }
    });
  }

  loginWithLinkedIn(): void {
    this.errorMessage.set(null);
    console.log('Initiating LinkedIn OAuth login...');

    // TODO: Implement LinkedIn OAuth integration
    this.authService.loginWithSocialProvider('linkedin').subscribe({
      next: (response) => {
        const redirectUrl = localStorage.getItem('itiyum_redirect_url') || this.getDefaultRoute(response.user.role);
        localStorage.removeItem('itiyum_redirect_url');
        this.router.navigateByUrl(redirectUrl);
      },
      error: (error) => {
        this.errorMessage.set('LinkedIn login failed. Please try again.');
        console.error('LinkedIn login error:', error);
      }
    });
  }

  loginWithGitHub(): void {
    this.errorMessage.set(null);
    console.log('Initiating GitHub OAuth login...');

    // TODO: Implement GitHub OAuth integration
    this.authService.loginWithSocialProvider('github').subscribe({
      next: (response) => {
        const redirectUrl = localStorage.getItem('itiyum_redirect_url') || this.getDefaultRoute(response.user.role);
        localStorage.removeItem('itiyum_redirect_url');
        this.router.navigateByUrl(redirectUrl);
      },
      error: (error) => {
        this.errorMessage.set('GitHub login failed. Please try again.');
        console.error('GitHub login error:', error);
      }
    });
  }

  loginWithInstagram(): void {
    this.errorMessage.set(null);
    console.log('Initiating Instagram OAuth login...');

    // TODO: Implement Instagram OAuth integration (via Facebook)
    this.authService.loginWithSocialProvider('instagram').subscribe({
      next: (response) => {
        const redirectUrl = localStorage.getItem('itiyum_redirect_url') || this.getDefaultRoute(response.user.role);
        localStorage.removeItem('itiyum_redirect_url');
        this.router.navigateByUrl(redirectUrl);
      },
      error: (error) => {
        this.errorMessage.set('Instagram login failed. Please try again.');
        console.error('Instagram login error:', error);
      }
    });
  }
}
