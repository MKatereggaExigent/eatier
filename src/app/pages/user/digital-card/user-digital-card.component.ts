import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { UserProfile } from '../../../shared/models/user-profile.model';

@Component({
  selector: 'app-user-digital-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-digital-card.component.html',
  styleUrls: ['./user-digital-card.component.scss']
})
export class UserDigitalCardComponent implements OnInit {
  private fb = inject(FormBuilder);

  // State management
  userProfile = signal<UserProfile | null>(null);
  qrCodeUrl = signal<string>('');
  isGenerating = signal<boolean>(false);
  isDownloading = signal<boolean>(false);
  successMessage = signal<string | null>(null);

  // Customization form
  customizationForm: FormGroup;

  // Color presets
  readonly colorPresets = [
    { name: 'Professional Blue', primary: '#667eea', secondary: '#764ba2' },
    { name: 'Creative Purple', primary: '#a8edea', secondary: '#fed6e3' },
    { name: 'Chef Orange', primary: '#f093fb', secondary: '#f5576c' },
    { name: 'Modern Green', primary: '#4facfe', secondary: '#00f2fe' },
    { name: 'Elegant Black', primary: '#434343', secondary: '#000000' },
    { name: 'Warm Gold', primary: '#f7971e', secondary: '#ffd200' }
  ];

  // Layout options
  readonly layoutOptions = [
    { value: 'minimal', label: 'Minimal', preview: '🎯' },
    { value: 'professional', label: 'Professional', preview: '💼' },
    { value: 'creative', label: 'Creative', preview: '🎨' }
  ];

  // Mock user profile
  mockProfile: UserProfile = {
    id: '1',
    userId: 'user-1',
    firstName: 'Marco',
    lastName: 'Rossi',
    country: 'United States',
    email: 'marco.rossi@example.com',
    phone: '+1 (555) 987-6543',
    specialtyDishes: ['Pasta Carbonara', 'Risotto Milanese', 'Tiramisu'],
    bio: 'Professional chef with 15+ years experience in Italian cuisine. Passionate about authentic flavors.',
    experience: 15,
    profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
    status: 'active',
    isVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://eatier.com/chef/marco-rossi',
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
    this.customizationForm = this.fb.group({
      primaryColor: ['#667eea'],
      secondaryColor: ['#764ba2'],
      layout: ['professional'],
      includeQR: [true],
      includeContact: [true],
      includeSpecialties: [true],
      includeBio: [true]
    });

    // Watch for form changes to update preview
    this.customizationForm.valueChanges.subscribe(() => {
      this.updatePreview();
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    // Mock API call
    setTimeout(() => {
      this.userProfile.set(this.mockProfile);
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
      const profileUrl = `https://eatier.com/chef/${this.userProfile()?.firstName?.toLowerCase()}-${this.userProfile()?.lastName?.toLowerCase()}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(profileUrl)}`;
      
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
      const filename = `digital-card-${this.userProfile()?.firstName?.toLowerCase()}-${this.userProfile()?.lastName?.toLowerCase()}.${format}`;
      console.log(`Downloading digital card as ${filename}`);
      
      // Create mock download
      const link = document.createElement('a');
      link.href = '#';
      link.download = filename;
      link.click();
      
      this.isDownloading.set(false);
      this.successMessage.set(`Digital card downloaded as ${format.toUpperCase()}!`);
      setTimeout(() => this.successMessage.set(null), 3000);
    }, 2000);
  }

  shareCard(): void {
    const profileUrl = `https://eatier.com/chef/${this.userProfile()?.firstName?.toLowerCase()}-${this.userProfile()?.lastName?.toLowerCase()}`;
    
    if (navigator.share) {
      navigator.share({
        title: `${this.userProfile()?.firstName} ${this.userProfile()?.lastName} - Professional Chef`,
        text: `Check out ${this.userProfile()?.firstName}'s culinary profile on Eatier!`,
        url: profileUrl
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(profileUrl).then(() => {
        this.successMessage.set('Profile link copied to clipboard!');
        setTimeout(() => this.successMessage.set(null), 3000);
      });
    }
  }

  saveCustomization(): void {
    const formValue = this.customizationForm.value;
    
    // Mock API call to save customization
    setTimeout(() => {
      if (this.userProfile()) {
        const updatedProfile = {
          ...this.userProfile()!,
          businessCardCustomization: formValue,
          updatedAt: new Date()
        };
        this.userProfile.set(updatedProfile);
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

  getFullName(): string {
    const profile = this.userProfile();
    if (!profile) return '';
    return `${profile.firstName} ${profile.lastName}`;
  }

  getExperienceText(): string {
    const profile = this.userProfile();
    if (!profile || !profile.experience) return '';
    return `${profile.experience}+ years experience`;
  }

  getTopSpecialties(): string[] {
    const profile = this.userProfile();
    if (!profile || !profile.specialtyDishes) return [];
    return profile.specialtyDishes.slice(0, 3);
  }

  getLayoutClass(): string {
    const layout = this.customizationForm.get('layout')?.value;
    return `layout-${layout}`;
  }
}
