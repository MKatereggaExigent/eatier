import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  contactForm: FormGroup;
  isSubmitting = signal(false);
  submitSuccess = signal(false);
  submitError = signal('');

  contactReasons = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'support', label: 'Technical Support' },
    { value: 'business', label: 'Business Partnership' },
    { value: 'press', label: 'Press & Media' },
    { value: 'feedback', label: 'Feedback & Suggestions' },
    { value: 'complaint', label: 'Complaint' },
    { value: 'other', label: 'Other' }
  ];

  offices = [
    {
      city: 'Cape Town',
      country: 'South Africa',
      address: '123 Long Street, Cape Town, 8001',
      phone: '+27 (0) 21 123 4567',
      email: 'capetown@itiyum.com',
      hours: 'Monday - Friday: 9:00 AM - 6:00 PM SAST'
    },
    {
      city: 'Johannesburg',
      country: 'South Africa',
      address: '456 Nelson Mandela Square, Sandton, 2196',
      phone: '+27 (0) 11 234 5678',
      email: 'johannesburg@itiyum.com',
      hours: 'Monday - Friday: 9:00 AM - 6:00 PM SAST'
    },
    {
      city: 'Nairobi',
      country: 'Kenya',
      address: 'Westlands Business Park, Nairobi',
      phone: '+254 20 123 4567',
      email: 'nairobi@itiyum.com',
      hours: 'Monday - Friday: 9:00 AM - 6:00 PM EAT'
    }
  ];

  constructor(private fb: FormBuilder) {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      reason: ['general', Validators.required],
      subject: ['', [Validators.required, Validators.minLength(5)]],
      message: ['', [Validators.required, Validators.minLength(20)]],
      consent: [false, Validators.requiredTrue]
    });
  }

  async onSubmit(): Promise<void> {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set('');

    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      this.submitSuccess.set(true);
      this.contactForm.reset();
      
      // Reset success message after 5 seconds
      setTimeout(() => this.submitSuccess.set(false), 5000);
    } catch (error) {
      this.submitError.set('Failed to send message. Please try again or contact us directly via email.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  getFieldError(fieldName: string): string {
    const field = this.contactForm.get(fieldName);
    if (field?.hasError('required')) return 'This field is required';
    if (field?.hasError('email')) return 'Please enter a valid email address';
    if (field?.hasError('minlength')) {
      const minLength = field.errors?.['minlength'].requiredLength;
      return `Minimum ${minLength} characters required`;
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}

