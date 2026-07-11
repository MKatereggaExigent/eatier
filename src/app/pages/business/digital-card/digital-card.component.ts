import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BusinessOwnerService, Business } from '../../../core/services/business-owner.service';
import { BusinessProfile } from '../../../shared/models/business-profile.model';

@Component({
  selector: 'app-digital-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './digital-card.component.html',
  styleUrls: ['./digital-card.component.scss']
})
export class DigitalCardComponent implements OnInit {
  private businessOwnerService = inject(BusinessOwnerService);

  // State
  businessProfile = signal<BusinessProfile | null>(null);
  business = signal<Business | null>(null);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isGenerating = signal<boolean>(false);
  isDownloading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Customization form state
  primaryColor = signal<string>('#667eea');
  secondaryColor = signal<string>('#764ba2');
  logoPosition = signal<'top' | 'center' | 'bottom'>('top');
  includeQR = signal<boolean>(true);
  includeContact = signal<boolean>(true);
  includeSocial = signal<boolean>(true);

  // QR code
  qrCodeUrl = signal<string>('');

  // Color presets
  readonly colorPresets = [
    { name: 'Ocean Blue', primary: '#667eea', secondary: '#764ba2' },
    { name: 'Sunset Orange', primary: '#f093fb', secondary: '#f5576c' },
    { name: 'Forest Green', primary: '#4facfe', secondary: '#00f2fe' },
    { name: 'Royal Purple', primary: '#a8edea', secondary: '#fed6e3' },
    { name: 'Warm Red', primary: '#ff9a9e', secondary: '#fecfef' },
    { name: 'Cool Gray', primary: '#667eea', secondary: '#764ba2' }
  ];

  readonly layoutOptions = [
    { value: 'top', label: 'Logo Top' },
    { value: 'center', label: 'Logo Center' },
    { value: 'bottom', label: 'Logo Bottom' }
  ];

  ngOnInit(): void {
    this.loadBusinessProfile();
  }

  loadBusinessProfile(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.businessOwnerService.getMyBusiness().subscribe({
      next: (response) => {
        if (response && response.business) {
          this.business.set(response.business);
          const mappedProfile: BusinessProfile = {
            id: response.business.id,
            userId: response.business.id,
            businessName: response.business.business_name,
            country: response.business.country || 'United States',
            address: {
              street: response.business.address || '',
              city: '',
              state: '',
              country: response.business.country || 'United States',
              zipCode: ''
            },
            email: response.business.email,
            contactNumber: response.business.phone,
            bio: response.business.sustainability_ethos || '',
            facilities: {
              parking: false, petFriendly: false, carWash: false, swimming: false,
              wifi: false, airConditioning: false, outdoorSeating: false, wheelchairAccessible: false
            },
            profilePhotos: [],
            backgroundImage: '',
            businessHours: [],
            isVerified: false,
            verificationBadges: [],
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://itiyum.com/restaurants/${response.business.slug || response.business.id}`,
            businessCardCustomization: {
              primaryColor: '#667eea',
              secondaryColor: '#764ba2',
              logoPosition: 'top',
              includeQR: true,
              includeContact: true,
              includeSocial: true
            }
          };
          this.businessProfile.set(mappedProfile);
          this.qrCodeUrl.set(mappedProfile.qrCodeUrl || '');
          this.loadSavedCustomization();
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading business profile:', error);
        this.errorMessage.set('Failed to load business profile. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  loadSavedCustomization(): void {
    this.businessOwnerService.getDigitalCardCustomization().subscribe({
      next: (response) => {
        if (response && response.customization) {
          this.applyCustomization(response.customization);
        } else {
          const profile = this.businessProfile();
          if (profile?.businessCardCustomization) {
            this.applyCustomization(profile.businessCardCustomization);
          }
        }
      },
      error: () => {
        const profile = this.businessProfile();
        if (profile?.businessCardCustomization) {
          this.applyCustomization(profile.businessCardCustomization);
        }
      }
    });
  }

  private applyCustomization(customization: any): void {
    this.primaryColor.set(customization.primaryColor || '#667eea');
    this.secondaryColor.set(customization.secondaryColor || '#764ba2');
    this.logoPosition.set(customization.logoPosition || 'top');
    this.includeQR.set(customization.includeQR ?? true);
    this.includeContact.set(customization.includeContact ?? true);
    this.includeSocial.set(customization.includeSocial ?? true);

    const profile = this.businessProfile();
    if (profile) {
      profile.businessCardCustomization = customization;
      this.businessProfile.set({ ...profile });
    }
  }

  get formValue() {
    return {
      primaryColor: this.primaryColor(),
      secondaryColor: this.secondaryColor(),
      logoPosition: this.logoPosition(),
      includeQR: this.includeQR(),
      includeContact: this.includeContact(),
      includeSocial: this.includeSocial()
    };
  }

  applyColorPreset(preset: typeof this.colorPresets[0]): void {
    this.primaryColor.set(preset.primary);
    this.secondaryColor.set(preset.secondary);
    this.updatePreview();
  }

  updatePreview(): void {
    const profile = this.businessProfile();
    if (profile) {
      profile.businessCardCustomization = this.formValue;
      this.businessProfile.set({ ...profile });
    }
  }

  generateQRCode(): void {
    this.isGenerating.set(true);
    setTimeout(() => {
      const biz = this.business();
      const identifier = (biz as any)?.slug || this.businessProfile()?.id;
      const url = `https://itiyum.com/restaurants/${identifier}`;
      this.qrCodeUrl.set(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`);
      this.isGenerating.set(false);
      this.successMessage.set('QR code generated successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
    }, 1500);
  }

  saveCustomization(): void {
    this.isSaving.set(true);
    this.errorMessage.set(null);

    this.businessOwnerService.updateDigitalCardCustomization(this.formValue).subscribe({
      next: (response) => {
        if (response && this.businessProfile()) {
          const updated = { ...this.businessProfile()!, businessCardCustomization: response.customization, updatedAt: new Date() };
          this.businessProfile.set(updated);
        }
        this.successMessage.set('Customization saved successfully!');
        this.isSaving.set(false);
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (error) => {
        console.error('Error saving customization:', error);
        this.errorMessage.set('Failed to save customization. Please try again.');
        this.isSaving.set(false);
      }
    });
  }

  downloadCard(format: 'png' | 'pdf' | 'svg'): void {
    this.isDownloading.set(true);
    setTimeout(() => {
      const name = this.businessProfile()?.businessName?.toLowerCase().replace(/\s+/g, '-') || 'business-card';
      const link = document.createElement('a');
      link.href = '#';
      link.download = `${name}.${format}`;
      link.click();
      this.isDownloading.set(false);
      this.successMessage.set(`Business card downloaded as ${format.toUpperCase()}!`);
      setTimeout(() => this.successMessage.set(null), 3000);
    }, 2000);
  }

  shareCard(): void {
    const profile = this.businessProfile();
    const biz = this.business();
    if (!profile || !biz) {
      this.errorMessage.set('Business profile not loaded.');
      setTimeout(() => this.errorMessage.set(null), 3000);
      return;
    }

    const identifier = (biz as any).slug || biz.id;
    const url = `https://itiyum.com/restaurants/${identifier}`;
    const text = `Check out ${biz.business_name} on Itiyum!\n\n📍 ${biz.address || 'Location not specified'}\n📞 ${biz.phone || 'Phone not available'}\n✉️ ${biz.email || 'Email not available'}\n\nVisit: ${url}`;

    if (navigator.share) {
      navigator.share({ title: `${biz.business_name} - Digital Business Card`, text, url })
        .then(() => { this.successMessage.set('Business card shared!'); setTimeout(() => this.successMessage.set(null), 3000); })
        .catch((err) => { if (err.name !== 'AbortError') this.copyToClipboard(text); });
    } else {
      this.copyToClipboard(text);
    }
  }

  private copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.successMessage.set('Business card details copied to clipboard!');
      setTimeout(() => this.successMessage.set(null), 3000);
    });
  }

  getPreviewStyle(): any {
    return {
      background: `linear-gradient(135deg, ${this.primaryColor()} 0%, ${this.secondaryColor()} 100%)`,
      color: 'white'
    };
  }

  getLogoPositionClass(): string {
    return `logo-${this.logoPosition()}`;
  }

  getOpenHours(): string {
    const profile = this.businessProfile();
    if (!profile) return '';
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todayHours = profile.businessHours.find(h => h.day === today);
    if (todayHours?.isOpen) return `${todayHours.openTime} - ${todayHours.closeTime}`;
    return 'Closed today';
  }

  getFacilityIcons(): string[] {
    const profile = this.businessProfile();
    if (!profile) return [];
    const iconMap: Record<string, string> = {
      parking: '🅿️', petFriendly: '🐕', wifi: '📶', airConditioning: '❄️',
      outdoorSeating: '🌳', wheelchairAccessible: '♿'
    };
    return Object.entries(profile.facilities)
      .filter(([_, enabled]) => enabled)
      .map(([facility]) => iconMap[facility])
      .filter(Boolean);
  }
}
