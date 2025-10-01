import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BusinessProfile } from '../../../shared/models/business-profile.model';

@Component({
  selector: 'app-digital-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './digital-card.component.html',
  styleUrls: ['./digital-card.component.scss']
})
export class DigitalCardComponent implements OnInit {
  private fb = inject(FormBuilder);

  // State management
  businessProfile = signal<BusinessProfile | null>(null);
  qrCodeUrl = signal<string>('');
  isGenerating = signal<boolean>(false);
  isDownloading = signal<boolean>(false);
  successMessage = signal<string | null>(null);

  // Customization form
  customizationForm: FormGroup;

  // Color presets
  readonly colorPresets = [
    { name: 'Ocean Blue', primary: '#667eea', secondary: '#764ba2' },
    { name: 'Sunset Orange', primary: '#f093fb', secondary: '#f5576c' },
    { name: 'Forest Green', primary: '#4facfe', secondary: '#00f2fe' },
    { name: 'Royal Purple', primary: '#a8edea', secondary: '#fed6e3' },
    { name: 'Warm Red', primary: '#ff9a9e', secondary: '#fecfef' },
    { name: 'Cool Gray', primary: '#667eea', secondary: '#764ba2' }
  ];

  // Layout options
  readonly layoutOptions = [
    { value: 'top', label: 'Logo Top', preview: '🔝' },
    { value: 'center', label: 'Logo Center', preview: '🎯' },
    { value: 'bottom', label: 'Logo Bottom', preview: '🔻' }
  ];

  // Mock business profile
  mockProfile: BusinessProfile = {
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
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop'
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
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://eatier.com/business/bella-italia',
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
    this.customizationForm = this.fb.group({
      primaryColor: ['#667eea'],
      secondaryColor: ['#764ba2'],
      logoPosition: ['top'],
      includeQR: [true],
      includeContact: [true],
      includeSocial: [true]
    });

    // Watch for form changes to update preview
    this.customizationForm.valueChanges.subscribe(() => {
      this.updatePreview();
    });
  }

  ngOnInit(): void {
    this.loadBusinessProfile();
  }

  loadBusinessProfile(): void {
    // Mock API call
    setTimeout(() => {
      this.businessProfile.set(this.mockProfile);
      this.qrCodeUrl.set(this.mockProfile.qrCodeUrl || '');

      // Populate form with existing customization
      if (this.mockProfile.businessCardCustomization) {
        this.customizationForm.patchValue(this.mockProfile.businessCardCustomization);
      }
    }, 500);
  }

  updatePreview(): void {
    // This would update the preview in real-time
    // For now, we'll just trigger a re-render
  }

  applyColorPreset(preset: typeof this.colorPresets[0]): void {
    this.customizationForm.patchValue({
      primaryColor: preset.primary,
      secondaryColor: preset.secondary
    });
  }

  generateQRCode(): void {
    this.isGenerating.set(true);

    // Mock QR code generation
    setTimeout(() => {
      const businessUrl = `https://eatier.com/business/${this.businessProfile()?.id}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(businessUrl)}`;

      this.qrCodeUrl.set(qrUrl);
      this.isGenerating.set(false);
      this.successMessage.set('QR code generated successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
    }, 1500);
  }

  downloadCard(format: 'png' | 'pdf' | 'svg'): void {
    this.isDownloading.set(true);

    // Mock download process
    setTimeout(() => {
      const filename = `business-card-${this.businessProfile()?.businessName?.toLowerCase().replace(/\s+/g, '-')}.${format}`;
      console.log(`Downloading business card as ${filename}`);

      // Create mock download
      const link = document.createElement('a');
      link.href = '#';
      link.download = filename;
      link.click();

      this.isDownloading.set(false);
      this.successMessage.set(`Business card downloaded as ${format.toUpperCase()}!`);
      setTimeout(() => this.successMessage.set(null), 3000);
    }, 2000);
  }

  shareCard(): void {
    const businessUrl = `https://eatier.com/business/${this.businessProfile()?.id}`;

    if (navigator.share) {
      navigator.share({
        title: `${this.businessProfile()?.businessName} - Digital Business Card`,
        text: `Check out ${this.businessProfile()?.businessName} on Eatier!`,
        url: businessUrl
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(businessUrl).then(() => {
        this.successMessage.set('Business card link copied to clipboard!');
        setTimeout(() => this.successMessage.set(null), 3000);
      });
    }
  }

  saveCustomization(): void {
    const formValue = this.customizationForm.value;

    // Mock API call to save customization
    setTimeout(() => {
      if (this.businessProfile()) {
        const updatedProfile = {
          ...this.businessProfile()!,
          businessCardCustomization: formValue,
          updatedAt: new Date()
        };
        this.businessProfile.set(updatedProfile);
      }

      this.successMessage.set('Customization saved successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
    }, 1000);
  }

  getPreviewStyle(): any {
    const form = this.customizationForm.value;
    return {
      background: `linear-gradient(135deg, ${form.primaryColor} 0%, ${form.secondaryColor} 100%)`,
      color: 'white'
    };
  }

  getOpenHours(): string {
    const profile = this.businessProfile();
    if (!profile) return '';

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todayHours = profile.businessHours.find(h => h.day === today);

    if (todayHours && todayHours.isOpen) {
      return `${todayHours.openTime} - ${todayHours.closeTime}`;
    }

    return 'Closed today';
  }

  getFacilityIcons(): string[] {
    const profile = this.businessProfile();
    if (!profile) return [];

    const iconMap: Record<string, string> = {
      parking: '🅿️',
      petFriendly: '🐕',
      wifi: '📶',
      airConditioning: '❄️',
      outdoorSeating: '🌳',
      wheelchairAccessible: '♿'
    };

    return Object.entries(profile.facilities)
      .filter(([_, enabled]) => enabled)
      .map(([facility, _]) => iconMap[facility])
      .filter(Boolean);
  }
}
