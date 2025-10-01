import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AdManagementService } from '../../../core/services/ad-management.service';
import {
  AdType,
  Currency,
  BillingCycle,
  AdCreationForm,
  GeographicTargeting,
  DemographicTargeting,
  AdContent,
  AdBudget,
  AdSchedule,
  CTAType
} from '../../../core/models/ad-management.models';

interface StepValidation {
  isValid: boolean;
  errors: string[];
}

@Component({
  selector: 'app-ad-creation',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './ad-creation.component.html',
  styleUrls: ['./ad-creation.component.scss']
})
export class AdCreationComponent implements OnInit {
  private authService = inject(AuthService);
  private adService = inject(AdManagementService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // Make Math available in template
  Math = Math;

  // Signals
  currentUser = this.authService.currentUser;
  currentStep = signal(1);
  totalSteps = signal(5);
  isLoading = signal(false);
  isSubmitting = signal(false);

  // Form groups for each step
  basicInfoForm!: FormGroup;
  targetingForm!: FormGroup;
  contentForm!: FormGroup;
  budgetForm!: FormGroup;
  scheduleForm!: FormGroup;

  // Data options
  adTypes: { value: AdType; label: string; description: string; minBudget: number }[] = [
    {
      value: 'promoted',
      label: 'Promoted',
      description: 'Boost your content to reach more people in your target audience',
      minBudget: 5
    },
    {
      value: 'sponsored',
      label: 'Sponsored',
      description: 'Professional advertising with advanced targeting options',
      minBudget: 10
    },
    {
      value: 'partnership',
      label: 'In Partnership with',
      description: 'Collaborative advertising with partner businesses',
      minBudget: 25
    }
  ];

  currencies: { value: Currency; label: string; symbol: string }[] = [
    { value: 'USD', label: 'US Dollar', symbol: '$' },
    { value: 'EUR', label: 'Euro', symbol: '€' },
    { value: 'GBP', label: 'British Pound', symbol: '£' },
    { value: 'KES', label: 'Kenyan Shilling', symbol: 'KSh' },
    { value: 'ETB', label: 'Ethiopian Birr', symbol: 'Br' },
    { value: 'UGX', label: 'Ugandan Shilling', symbol: 'USh' },
    { value: 'TZS', label: 'Tanzanian Shilling', symbol: 'TSh' }
  ];

  regions = [
    { value: 'east-africa', label: 'East Africa', countries: ['Kenya', 'Uganda', 'Tanzania', 'Ethiopia', 'Rwanda'] },
    { value: 'west-africa', label: 'West Africa', countries: ['Nigeria', 'Ghana', 'Senegal', 'Mali', 'Burkina Faso'] },
    { value: 'north-america', label: 'North America', countries: ['United States', 'Canada', 'Mexico'] },
    { value: 'europe', label: 'Europe', countries: ['United Kingdom', 'Germany', 'France', 'Spain', 'Italy'] }
  ];

  cities: { [country: string]: string[] } = {
    'Kenya': ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'],
    'Uganda': ['Kampala', 'Entebbe', 'Jinja', 'Mbale', 'Gulu'],
    'Tanzania': ['Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Mbeya'],
    'Ethiopia': ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Gondar', 'Hawassa'],
    'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
    'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow']
  };

  ctaTypes: { value: CTAType; label: string }[] = [
    { value: 'book_now', label: 'Book Now' },
    { value: 'enquire_now', label: 'Enquire Now' },
    { value: 'get_quote', label: 'Get Quote' },
    { value: 'see_calendar', label: 'See Calendar' },
    { value: 'visit_website', label: 'Visit Website' },
    { value: 'call_now', label: 'Call Now' },
    { value: 'email_now', label: 'Email Now' }
  ];

  // Computed properties
  selectedAdType = computed(() => {
    const typeValue = this.basicInfoForm?.get('type')?.value;
    return this.adTypes.find(type => type.value === typeValue);
  });

  selectedRegion = computed(() => {
    const regionValue = this.targetingForm?.get('region')?.value;
    return this.regions.find(region => region.value === regionValue);
  });

  availableCountries = computed(() => {
    return this.selectedRegion()?.countries || [];
  });

  availableCities = computed(() => {
    const selectedCountries = this.targetingForm?.get('countries')?.value || [];
    const cities: string[] = [];
    selectedCountries.forEach((country: string) => {
      if (this.cities[country]) {
        cities.push(...this.cities[country]);
      }
    });
    return cities;
  });

  stepValidation = computed(() => {
    const validations: StepValidation[] = [
      { isValid: true, errors: [] }, // Step 0 (placeholder)
      {
        isValid: this.basicInfoForm?.valid || false,
        errors: this.getFormErrors(this.basicInfoForm)
      },
      {
        isValid: this.targetingForm?.valid || false,
        errors: this.getFormErrors(this.targetingForm)
      },
      {
        isValid: this.contentForm?.valid || false,
        errors: this.getFormErrors(this.contentForm)
      },
      {
        isValid: this.budgetForm?.valid || false,
        errors: this.getFormErrors(this.budgetForm)
      },
      {
        isValid: this.scheduleForm?.valid || false,
        errors: this.getFormErrors(this.scheduleForm)
      }
    ];
    return validations;
  });

  canProceedToNext = computed(() => {
    const currentStepValidation = this.stepValidation()[this.currentStep()];
    return currentStepValidation?.isValid || false;
  });

  ngOnInit(): void {
    this.initializeForms();
  }

  private initializeForms(): void {
    // Basic Info Form
    this.basicInfoForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      type: ['promoted', Validators.required],
      category: ['', Validators.required],
      objectives: [[], Validators.required]
    });

    // Targeting Form
    this.targetingForm = this.fb.group({
      region: ['east-africa', Validators.required],
      countries: [[], Validators.required],
      cities: [[]],
      radius: [25, [Validators.min(5), Validators.max(100)]],
      ageMin: [18, [Validators.min(13), Validators.max(100)]],
      ageMax: [65, [Validators.min(13), Validators.max(100)]],
      gender: [['all'], Validators.required],
      languages: [['English'], Validators.required],
      userTypes: [['food_enthusiast', 'normal_user'], Validators.required],
      interests: [[]],
      keywords: [[]],
      excludedKeywords: [[]]
    });

    // Content Form
    this.contentForm = this.fb.group({
      headline: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(300)]],
      subheading: ['', Validators.maxLength(150)],
      ctaType: ['book_now', Validators.required],
      ctaText: ['Book Now', Validators.required],
      ctaUrl: [''],
      ctaPhone: [''],
      ctaEmail: [''],
      images: [[]],
      videos: [[]]
    });

    // Budget Form
    this.budgetForm = this.fb.group({
      totalBudget: [100, [Validators.required, Validators.min(5)]],
      dailyBudget: [10, [Validators.required, Validators.min(5)]],
      currency: ['USD', Validators.required],
      billingCycle: ['daily', Validators.required]
    });

    // Schedule Form
    this.scheduleForm = this.fb.group({
      startDate: [new Date().toISOString().split('T')[0], Validators.required],
      endDate: [''],
      runContinuously: [false],
      timezone: ['UTC', Validators.required]
    });

    // Set up form watchers
    this.setupFormWatchers();
  }

  private setupFormWatchers(): void {
    // Update CTA text when CTA type changes
    this.contentForm.get('ctaType')?.valueChanges.subscribe(ctaType => {
      const ctaOption = this.ctaTypes.find(option => option.value === ctaType);
      if (ctaOption) {
        this.contentForm.patchValue({ ctaText: ctaOption.label });
      }
    });

    // Update daily budget when total budget changes
    this.budgetForm.get('totalBudget')?.valueChanges.subscribe(totalBudget => {
      if (totalBudget) {
        const dailyBudget = Math.min(totalBudget / 10, totalBudget);
        this.budgetForm.patchValue({ dailyBudget: Math.max(5, dailyBudget) });
      }
    });

    // Clear end date when run continuously is checked
    this.scheduleForm.get('runContinuously')?.valueChanges.subscribe(runContinuously => {
      if (runContinuously) {
        this.scheduleForm.patchValue({ endDate: '' });
      }
    });
  }

  // Navigation methods
  nextStep(): void {
    if (this.canProceedToNext() && this.currentStep() < this.totalSteps()) {
      this.currentStep.update(step => step + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(step => step - 1);
    }
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps()) {
      this.currentStep.set(step);
    }
  }

  // Form submission
  async submitCampaign(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    this.isSubmitting.set(true);

    try {
      const campaignData = this.buildCampaignData();
      const campaign = await this.adService.createCampaign(campaignData);

      // Navigate back to ad management dashboard
      this.router.navigate(['/dashboard/business/ads'], {
        queryParams: { created: campaign.id }
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
      // Handle error (show toast, etc.)
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private isFormValid(): boolean {
    return [
      this.basicInfoForm,
      this.targetingForm,
      this.contentForm,
      this.budgetForm,
      this.scheduleForm
    ].every(form => form.valid);
  }

  private buildCampaignData(): AdCreationForm {
    const basicInfo = this.basicInfoForm.value;
    const targeting = this.targetingForm.value;
    const content = this.contentForm.value;
    const budget = this.budgetForm.value;
    const schedule = this.scheduleForm.value;

    return {
      basic: {
        title: basicInfo.title,
        description: basicInfo.description,
        type: basicInfo.type,
        category: basicInfo.category,
        objectives: basicInfo.objectives
      },
      targeting: {
        geographic: {
          regions: [targeting.region],
          countries: targeting.countries,
          cities: targeting.cities,
          radius: targeting.radius
        },
        demographic: {
          ageRange: {
            min: targeting.ageMin,
            max: targeting.ageMax
          },
          gender: targeting.gender,
          languages: targeting.languages,
          userTypes: targeting.userTypes
        },
        interests: targeting.interests,
        keywords: targeting.keywords,
        excludedKeywords: targeting.excludedKeywords
      },
      content: {
        images: content.images || [],
        videos: content.videos || [],
        text: {
          headline: content.headline,
          description: content.description,
          subheading: content.subheading
        },
        callToAction: {
          type: content.ctaType,
          text: content.ctaText,
          url: content.ctaUrl,
          phoneNumber: content.ctaPhone,
          email: content.ctaEmail
        }
      },
      budget: {
        totalBudget: budget.totalBudget,
        dailyBudget: budget.dailyBudget,
        spentAmount: 0,
        remainingAmount: budget.totalBudget,
        currency: budget.currency,
        billingCycle: budget.billingCycle,
        minimumSpend: this.selectedAdType()?.minBudget || 5
      },
      schedule: {
        startDate: new Date(schedule.startDate),
        endDate: schedule.endDate ? new Date(schedule.endDate) : undefined,
        timezone: schedule.timezone,
        runContinuously: schedule.runContinuously
      }
    };
  }

  // Utility methods
  private getFormErrors(form: FormGroup): string[] {
    const errors: string[] = [];
    if (!form) return errors;

    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control?.errors) {
        Object.keys(control.errors).forEach(errorKey => {
          errors.push(`${key}: ${errorKey}`);
        });
      }
    });

    return errors;
  }

  getStepTitle(step: number): string {
    const titles = [
      '',
      'Basic Information',
      'Targeting & Audience',
      'Ad Content & Creative',
      'Budget & Pricing',
      'Schedule & Launch'
    ];
    return titles[step] || '';
  }

  getProgressPercentage(): number {
    return (this.currentStep() / this.totalSteps()) * 100;
  }

  // File upload methods (placeholder)
  onImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      // Handle image upload
      console.log('Image upload:', input.files);
    }
  }

  onVideoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      // Handle video upload
      console.log('Video upload:', input.files);
    }
  }

  // Cancel creation
  cancelCreation(): void {
    if (confirm('Are you sure you want to cancel? All progress will be lost.')) {
      this.router.navigate(['/dashboard/business/ads']);
    }
  }
}
