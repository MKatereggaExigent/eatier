import { Business, BusinessOwnerService } from '../../../core/services/business-owner.service';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, catchError, finalize, of, takeUntil } from 'rxjs';

import { BusinessProfile } from '../../../shared/models/business-profile.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-digital-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './digital-card.component.html',
  styleUrls: ['./digital-card.component.scss']
})
export class DigitalCardComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private businessOwnerService = inject(BusinessOwnerService);
  private destroy$ = new Subject<void>();

  // State management
  businessProfile = signal<BusinessProfile | null>(null);
  business = signal<Business | null>(null);
  qrCodeUrl = signal<string>('');
  isGenerating = signal<boolean>(false);
  isDownloading = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
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

          // Map Business to BusinessProfile for the digital card
          const mappedProfile: BusinessProfile = {
            id: response.business.id,
            userId: response.business.id, // Using business ID as user ID
            businessName: response.business.business_name,
            country: response.business.country || 'United States',
            address: {
              street: response.business.address || '',
              city: '', // TODO: Parse from address
              state: '', // TODO: Parse from address
              country: response.business.country || 'United States',
              zipCode: '' // TODO: Parse from address
            },
            email: response.business.email,
            contactNumber: response.business.phone,
            bio: response.business.sustainability_ethos || '',
            facilities: {
              parking: false,
              petFriendly: false,
              carWash: false,
              swimming: false,
              wifi: false,
              airConditioning: false,
              outdoorSeating: false,
              wheelchairAccessible: false
            },
            profilePhotos: [],
            backgroundImage: '',
            businessHours: [],
            isVerified: false,
            verificationBadges: [],
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://itiyum.com/business/${response.business.id}`,
            businessCardCustomization: {
              primaryColor: '#0284c7',
              secondaryColor: '#0369a1',
              logoPosition: 'top',
              includeQR: true,
              includeContact: true,
              includeSocial: true
            }
          };

          this.businessProfile.set(mappedProfile);
          this.qrCodeUrl.set(mappedProfile.qrCodeUrl || '');

          // Populate form with existing customization
          if (mappedProfile.businessCardCustomization) {
            this.customizationForm.patchValue(mappedProfile.businessCardCustomization);
          }
        }
      });
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
      const businessUrl = `https://itiyum.com/business/${this.businessProfile()?.id}`;
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
    const businessUrl = `https://itiyum.com/business/${this.businessProfile()?.id}`;

    if (navigator.share) {
      navigator.share({
        title: `${this.businessProfile()?.businessName} - Digital Business Card`,
        text: `Check out ${this.businessProfile()?.businessName} on Itiyum!`,
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
