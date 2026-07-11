import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  AdBudget,
  AdContent,
  AdCreationForm,
  AdSchedule,
  AdType,
  BillingCycle,
  CTAType,
  Currency,
  DemographicTargeting,
  GeographicTargeting
} from '../../../core/models/ad-management.models';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { AdManagementService } from '../../../core/services/ad-management.service';
import { AuthService } from '../../../core/services/auth.service';
import { CurrencyService, CurrencyInfo, Country } from '../../../core/services/currency.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { LucideAngularModule, Edit, Rocket, Image, Video, X, Check, ChevronLeft, ChevronRight } from 'lucide-angular';

interface StepValidation {
  isValid: boolean;
  errors: string[];
}

interface UploadedMedia {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video';
  file?: File;
}

@Component({
  selector: 'app-ad-creation',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './ad-creation.component.html',
  styleUrls: ['./ad-creation.component.scss']
})
export class AdCreationComponent implements OnInit {
  private authService = inject(AuthService);
  private adService = inject(AdManagementService);
  private currencyService = inject(CurrencyService);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Make Math available in template
  Math = Math;

  // Lucide Icons
  readonly Edit = Edit;
  readonly Rocket = Rocket;
  readonly Image = Image;
  readonly Video = Video;
  readonly X = X;
  readonly Check = Check;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;

  // Edit mode signals
  isEditMode = signal(false);
  editCampaignId = signal<string | null>(null);
  isLoadingCampaign = signal(false);

  // Signals
  currentUser = this.authService.currentUser;
  currentStep = signal(1);
  totalSteps = signal(6); // Added tier/placement step
  isLoading = signal(false);
  isSubmitting = signal(false);
  formsInitialized = signal(false); // Track form initialization
  formChangeCounter = signal(0); // Trigger reactivity on form changes

  // Ad Tiers and Placements
  adTiers = signal<any[]>([]);
  adPlacements = signal<any[]>([]);
  selectedTier = signal<any | null>(null);
  selectedPlacement = signal<any | null>(null);

  // Form groups for each step - initialize with empty form groups
  basicInfoForm: FormGroup = new FormGroup({});
  tierPlacementForm: FormGroup = new FormGroup({});
  targetingForm: FormGroup = new FormGroup({});
  contentForm: FormGroup = new FormGroup({});
  budgetForm: FormGroup = new FormGroup({});
  scheduleForm: FormGroup = new FormGroup({});

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

  // Dynamic data from API
  currencies: { value: Currency; label: string; symbol: string }[] = [];
  regions: { id: string; value: string; label: string; code: string }[] = [];
  countries: Country[] = [];
  cities: { id: string; name: string; country_id: string; country_name: string; country_code: string }[] = [];

  // Grouped cities by country for easy lookup
  citiesByCountry: { [countryId: string]: any[] } = {};

  ctaTypes: { value: CTAType; label: string }[] = [
    { value: 'book_now', label: 'Book Now' },
    { value: 'enquire_now', label: 'Enquire Now' },
    { value: 'get_quote', label: 'Get Quote' },
    { value: 'see_calendar', label: 'See Calendar' },
    { value: 'visit_website', label: 'Visit Website' },
    { value: 'call_now', label: 'Call Now' },
    { value: 'email_now', label: 'Email Now' }
  ];

  // User type options for multi-select
  userTypeOptions = [
    { value: 'food_enthusiast', label: 'Food Enthusiasts' },
    { value: 'normal_user', label: 'Regular Users' },
    { value: 'business_owner', label: 'Business Owners' },
    { value: 'specialist', label: 'Food Specialists' }
  ];

  // Objective options
  objectiveOptions = [
    { value: 'brand-awareness', label: 'Increase Brand Awareness' },
    { value: 'drive-bookings', label: 'Drive Bookings' },
    { value: 'promote-menu', label: 'Promote New Menu Items' },
    { value: 'increase-followers', label: 'Increase Social Media Followers' },
    { value: 'website-traffic', label: 'Drive Website Traffic' }
  ];

  // Uploaded media
  uploadedImages = signal<UploadedMedia[]>([]);
  uploadedVideos = signal<UploadedMedia[]>([]);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Computed properties
  // Writable signals for reactive form dependencies
  currentRegionValue = signal<string>('');
  currentCountriesValue = signal<string[]>([]);

  selectedAdType = computed(() => {
    const typeValue = this.basicInfoForm?.get('type')?.value;
    return this.adTypes.find(type => type.value === typeValue);
  });

  selectedRegion = computed(() => {
    const regionValue = this.currentRegionValue();
    return this.regions.find(region => region.value === regionValue || region.code === regionValue);
  });

  availableCountries = computed(() => {
    const regionValue = this.currentRegionValue();
    if (!regionValue) return [];

    // Filter countries by selected region
    return this.countries.filter(country => {
      const region = this.regions.find(r => r.value === regionValue || r.code === regionValue);
      return region && country.region_id === region.id;
    });
  });

  availableCities = computed(() => {
    const selectedCountries = this.currentCountriesValue();
    if (!selectedCountries || selectedCountries.length === 0) return [];

    // Get cities for selected countries
    const cities: any[] = [];
    selectedCountries.forEach((countryId: string) => {
      if (this.citiesByCountry[countryId]) {
        cities.push(...this.citiesByCountry[countryId]);
      }
    });
    return cities;
  });

  stepValidation = computed(() => {
    // Trigger reactivity on formsInitialized signal and form changes
    const initialized = this.formsInitialized();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _changeCounter = this.formChangeCounter(); // Track form changes

    // If forms aren't initialized yet, return default invalid state
    if (!initialized) {
      return [
        { isValid: true, errors: [] }, // Step 0 (placeholder)
        { isValid: false, errors: ['Form not yet initialized'] },
        { isValid: false, errors: [] },
        { isValid: false, errors: [] },
        { isValid: false, errors: [] },
        { isValid: false, errors: [] },
        { isValid: false, errors: [] }
      ] as StepValidation[];
    }

    const validations: StepValidation[] = [
      { isValid: true, errors: [] }, // Step 0 (placeholder)
      {
        isValid: this.basicInfoForm.valid,
        errors: this.getFormErrors(this.basicInfoForm)
      },
      {
        isValid: this.tierPlacementForm.valid,
        errors: this.getFormErrors(this.tierPlacementForm)
      },
      {
        isValid: this.targetingForm.valid,
        errors: this.getFormErrors(this.targetingForm)
      },
      {
        isValid: this.contentForm.valid,
        errors: this.getFormErrors(this.contentForm)
      },
      {
        isValid: this.budgetForm.valid,
        errors: this.getFormErrors(this.budgetForm)
      },
      {
        isValid: this.scheduleForm.valid,
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
    this.formsInitialized.set(true); // Signal that forms are ready
    this.loadTiersAndPlacements();
    this.loadGeoData(); // Load regions, countries, and cities
    this.loadCurrencies(); // Load available currencies

    // Check if we're in edit mode
    const adId = this.route.snapshot.paramMap.get('adId');
    if (adId) {
      this.isEditMode.set(true);
      this.editCampaignId.set(adId);
      this.loadCampaignForEdit(adId);
    }
  }

  // Load campaign data for editing
  private async loadCampaignForEdit(campaignId: string): Promise<void> {
    this.isLoadingCampaign.set(true);
    try {
      const campaign = await this.adService.getCampaignById(campaignId);
      if (campaign) {
        this.populateFormsWithCampaign(campaign);
      } else {
        this.errorMessage.set('Campaign not found');
        this.router.navigate(['../'], { relativeTo: this.route });
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      this.errorMessage.set('Failed to load campaign data');
    } finally {
      this.isLoadingCampaign.set(false);
    }
  }

  // Populate forms with campaign data
  private populateFormsWithCampaign(campaign: any): void {
    // Basic Info
    this.basicInfoForm.patchValue({
      title: campaign.title || '',
      description: campaign.description || '',
      type: campaign.type || 'promoted',
      category: campaign.category || 'restaurant',
      objectives: campaign.objectives || ['brand-awareness']
    });

    // Tier and Placement
    if (campaign.tierId && campaign.placementId) {
      this.tierPlacementForm.patchValue({
        tierId: campaign.tierId,
        placementId: campaign.placementId
      });
    }

    // Targeting
    this.targetingForm.patchValue({
      region: campaign.targeting?.geographic?.regions?.[0] || '',
      countries: campaign.targeting?.geographic?.countries || [],
      cities: campaign.targeting?.geographic?.cities || [],
      radius: campaign.targeting?.geographic?.radius || 25,
      ageMin: campaign.targeting?.demographic?.ageRange?.min || 18,
      ageMax: campaign.targeting?.demographic?.ageRange?.max || 65,
      gender: campaign.targeting?.demographic?.gender || ['all'],
      languages: campaign.targeting?.demographic?.languages || ['English'],
      userTypes: campaign.targeting?.targetAudience || ['food_enthusiast', 'normal_user'],
      interests: campaign.targeting?.interests || [],
      keywords: campaign.targeting?.keywords || [],
      excludedKeywords: campaign.targeting?.excludedKeywords || []
    });

    // Content
    this.contentForm.patchValue({
      headline: campaign.content?.text?.headline || '',
      description: campaign.content?.text?.description || '',
      subheading: campaign.content?.text?.subheading || '',
      ctaType: campaign.content?.callToAction?.type || 'book_now',
      ctaText: campaign.content?.callToAction?.text || 'Book Now',
      ctaUrl: campaign.content?.callToAction?.url || '',
      ctaPhone: campaign.content?.callToAction?.phoneNumber || '',
      ctaEmail: campaign.content?.callToAction?.email || ''
    });

    // Load existing images
    if (campaign.content?.images?.length > 0) {
      const images = campaign.content.images.map((img: any, index: number) => ({
        id: img.id || `existing-${index}`,
        url: img.url,
        name: `Image ${index + 1}`,
        type: 'image' as const
      }));
      this.uploadedImages.set(images);
      this.contentForm.patchValue({ images: campaign.content.images });
    }

    // Load existing videos
    if (campaign.content?.videos?.length > 0) {
      const videos = campaign.content.videos.map((vid: any, index: number) => ({
        id: vid.id || `existing-video-${index}`,
        url: vid.url,
        name: `Video ${index + 1}`,
        type: 'video' as const
      }));
      this.uploadedVideos.set(videos);
      this.contentForm.patchValue({ videos: campaign.content.videos });
    }

    // Budget
    this.budgetForm.patchValue({
      totalBudget: campaign.budget?.totalBudget || 100,
      dailyBudget: campaign.budget?.dailyBudget || 10,
      currency: campaign.budget?.currency || 'ZAR',
      billingCycle: campaign.budget?.billingCycle || 'daily'
    });

    // Schedule - use direct properties from transformed campaign
    const startDateValue = campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const endDateValue = campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '';
    this.scheduleForm.patchValue({
      startDate: startDateValue,
      endDate: endDateValue,
      runContinuously: !campaign.endDate,
      timezone: 'UTC'
    });

    // Trigger form change counter to update validation
    this.formChangeCounter.update(c => c + 1);
  }

  // Load ad tiers and placements from backend
  private async loadTiersAndPlacements(): Promise<void> {
    try {
      const tiers = await this.adService.getAdTiers();
      this.adTiers.set(tiers);
      // Select first tier by default
      if (tiers.length > 0) {
        this.selectTier(tiers[0]);
      }
    } catch (error) {
      console.error('Error loading tiers:', error);
    }
  }

  selectTier(tier: any): void {
    this.selectedTier.set(tier);
    this.tierPlacementForm.patchValue({ tierId: tier.id });
    // Load placements for this tier
    this.loadPlacementsForTier(tier.id);
  }

  private async loadPlacementsForTier(tierId: string): Promise<void> {
    try {
      const placements = await this.adService.getAdPlacements(tierId);
      this.adPlacements.set(placements);
      // Select first placement by default
      if (placements.length > 0) {
        this.selectPlacement(placements[0]);
      }
    } catch (error) {
      console.error('Error loading placements:', error);
    }
  }

  selectPlacement(placement: any): void {
    this.selectedPlacement.set(placement);
    this.tierPlacementForm.patchValue({ placementId: placement.id });
  }

  // Load geo-targeting data (regions, countries, cities)
  private async loadGeoData(): Promise<void> {
    try {
      const apiUrl = environment.apiUrl;

      // Load regions
      this.http.get<any[]>(`${apiUrl}/business-ads/regions`).subscribe({
        next: (regions) => {
          this.regions = regions.map(r => ({
            id: r.id,
            value: r.code,
            label: r.name,
            code: r.code
          }));

          // Set default region to Southern Africa (where business is registered)
          const defaultRegion = this.regions.find(r => r.code === 'southern-africa');
          if (defaultRegion && !this.isEditMode()) {
            this.currentRegionValue.set(defaultRegion.value);
            this.targetingForm.patchValue({ region: defaultRegion.value });
          }
        },
        error: (error) => console.error('Error loading regions:', error)
      });

      // Load countries
      this.http.get<Country[]>(`${apiUrl}/business-ads/countries`).subscribe({
        next: (countries) => {
          this.countries = countries;

          // Set default country to South Africa (where business is registered)
          const southAfrica = countries.find(c => c.code === 'ZA');
          if (southAfrica && !this.isEditMode()) {
            this.currentCountriesValue.set([southAfrica.id]);
            this.targetingForm.patchValue({ countries: [southAfrica.id] });
          }
        },
        error: (error) => console.error('Error loading countries:', error)
      });

      // Load cities
      this.http.get<any[]>(`${apiUrl}/business-ads/cities`).subscribe({
        next: (cities) => {
          this.cities = cities;

          // Group cities by country for easy lookup
          this.citiesByCountry = {};
          cities.forEach(city => {
            if (!this.citiesByCountry[city.country_id]) {
              this.citiesByCountry[city.country_id] = [];
            }
            this.citiesByCountry[city.country_id].push(city);
          });
        },
        error: (error) => console.error('Error loading cities:', error)
      });
    } catch (error) {
      console.error('Error in loadGeoData:', error);
    }
  }

  // Load available currencies
  private loadCurrencies(): void {
    this.currencyService.getAvailableCurrencies().subscribe({
      next: (currencies) => {
        this.currencies = currencies.map(c => ({
          value: c.code as Currency,
          label: c.name,
          symbol: c.symbol
        }));

        // Set default currency based on user's location or business country (ZAR)
        const currentCurrency = this.currencyService.getCurrentCurrency();
        if (currentCurrency && !this.isEditMode()) {
          this.budgetForm.patchValue({ currency: currentCurrency.code as Currency });
        }
      },
      error: (error) => console.error('Error loading currencies:', error)
    });
  }

  // Custom validator for non-empty arrays
  private arrayNotEmpty(control: any): { [key: string]: boolean } | null {
    if (!control.value || !Array.isArray(control.value) || control.value.length === 0) {
      return { required: true };
    }
    return null;
  }

  private initializeForms(): void {
    // Basic Info Form
    this.basicInfoForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      type: ['promoted', Validators.required],
      category: ['restaurant', Validators.required],
      objectives: [['brand-awareness'], this.arrayNotEmpty.bind(this)]
    });

    // Tier and Placement Form (Step 2)
    this.tierPlacementForm = this.fb.group({
      tierId: ['', Validators.required],
      placementId: ['', Validators.required]
    });

    // Targeting Form
    this.targetingForm = this.fb.group({
      region: ['', Validators.required], // Will be set to 'southern-africa' after data loads
      countries: [[], this.arrayNotEmpty.bind(this)], // Will be set to South Africa after data loads
      cities: [[]],
      radius: [25, [Validators.min(5), Validators.max(100)]],
      ageMin: [18, [Validators.min(13), Validators.max(100)]],
      ageMax: [65, [Validators.min(13), Validators.max(100)]],
      gender: [['all'], Validators.required],
      languages: [['English'], Validators.required],
      userTypes: [['food_enthusiast', 'normal_user'], this.arrayNotEmpty.bind(this)],
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

    // Budget Form - Use detected currency from CurrencyService
    const detectedCurrency = this.currencyService.getCurrentCurrency();
    this.budgetForm = this.fb.group({
      totalBudget: [100, [Validators.required, Validators.min(5)]],
      dailyBudget: [10, [Validators.required, Validators.min(5)]],
      currency: [detectedCurrency.code, Validators.required],
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
    // Track all form changes to trigger validation updates
    const triggerValidation = () => {
      this.formChangeCounter.update(c => c + 1);
    };

    // Watch all forms for changes
    this.basicInfoForm.valueChanges.subscribe(triggerValidation);
    this.tierPlacementForm.valueChanges.subscribe(triggerValidation);
    this.targetingForm.valueChanges.subscribe(triggerValidation);
    this.contentForm.valueChanges.subscribe(triggerValidation);
    this.budgetForm.valueChanges.subscribe(triggerValidation);
    this.scheduleForm.valueChanges.subscribe(triggerValidation);

    // Update region signal when form value changes (for computed signals to react)
    this.targetingForm.get('region')?.valueChanges.subscribe(regionValue => {
      this.currentRegionValue.set(regionValue);
    });
    // Initialize signal with current form value
    this.currentRegionValue.set(this.targetingForm.get('region')?.value || 'east-africa');

    // Update countries signal when form value changes (for computed signals to react)
    this.targetingForm.get('countries')?.valueChanges.subscribe(countriesValue => {
      this.currentCountriesValue.set(countriesValue || []);
    });
    // Initialize signal with current form value
    this.currentCountriesValue.set(this.targetingForm.get('countries')?.value || []);

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
    console.log('=== CAMPAIGN SUBMIT INITIATED ===');
    this.errorMessage.set(null);
    this.successMessage.set(null);

    // Detailed validation logging
    console.log('Form validation check:');
    console.log('  - basicInfoForm valid:', this.basicInfoForm.valid, this.basicInfoForm.errors);
    console.log('  - tierPlacementForm valid:', this.tierPlacementForm.valid, this.tierPlacementForm.errors);
    console.log('  - targetingForm valid:', this.targetingForm.valid, this.targetingForm.errors);
    console.log('  - contentForm valid:', this.contentForm.valid, this.contentForm.errors);
    console.log('  - budgetForm valid:', this.budgetForm.valid, this.budgetForm.errors);
    console.log('  - scheduleForm valid:', this.scheduleForm.valid, this.scheduleForm.errors);

    if (!this.isFormValid()) {
      const invalidForms: string[] = [];
      if (!this.basicInfoForm.valid) invalidForms.push('Basic Info');
      if (!this.tierPlacementForm.valid) invalidForms.push('Tier/Placement');
      if (!this.targetingForm.valid) invalidForms.push('Targeting');
      if (!this.contentForm.valid) invalidForms.push('Content');
      if (!this.budgetForm.valid) invalidForms.push('Budget');
      if (!this.scheduleForm.valid) invalidForms.push('Schedule');

      this.errorMessage.set(`Please complete all required fields before launching the campaign. Invalid sections: ${invalidForms.join(', ')}`);
      console.log('Form validation failed. Invalid forms:', invalidForms);
      return;
    }

    this.isSubmitting.set(true);
    console.log('Submitting campaign...');

    try {
      const campaignData = this.buildCampaignData();
      console.log('Campaign data built:', campaignData);

      let campaign;
      if (this.isEditMode() && this.editCampaignId()) {
        // Update existing campaign
        console.log('Updating existing campaign:', this.editCampaignId());
        campaign = await this.adService.updateCampaign(this.editCampaignId()!, campaignData);
        this.successMessage.set('Campaign updated successfully! Redirecting...');
      } else {
        // Create new campaign
        console.log('Creating new campaign...');
        campaign = await this.adService.createCampaign(campaignData);
        console.log('Campaign created successfully:', campaign);
        this.successMessage.set('Campaign created successfully! Redirecting...');
      }

      // Navigate back to ad management dashboard based on user role
      const adsRoute = this.getAdsRoute();
      console.log('Navigating to:', adsRoute);
      setTimeout(() => {
        this.router.navigate([adsRoute], {
          queryParams: { [this.isEditMode() ? 'updated' : 'created']: campaign.id }
        });
      }, 1500);
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      this.errorMessage.set(error?.message || `Failed to ${this.isEditMode() ? 'update' : 'create'} campaign. Please try again.`);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // Get the correct ads route based on user role
  private getAdsRoute(): string {
    const user = this.currentUser();
    if (!user) return '/business/ads';

    switch (user.role) {
      case 'specialist':
        return '/dashboard/specialist/ads';
      case 'business_owner':
        return '/dashboard/business/ads';
      case 'food_enthusiast':
        return '/dashboard/food-enthusiast/ads';
      case 'normal_user':
        return '/dashboard/user/ads';
      case 'itiyum_admin':
        return '/admin/ads';
      default:
        return '/business/ads';
    }
  }

  private isFormValid(): boolean {
    return [
      this.basicInfoForm,
      this.tierPlacementForm,
      this.targetingForm,
      this.contentForm,
      this.budgetForm,
      this.scheduleForm
    ].every(form => form.valid);
  }

  private buildCampaignData(): AdCreationForm {
    const basicInfo = this.basicInfoForm.value;
    const tierPlacement = this.tierPlacementForm.value;
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
      tierPlacement: {
        tierId: tierPlacement.tierId,
        placementId: tierPlacement.placementId,
        tierName: this.selectedTier()?.displayName || '',
        placementName: this.selectedPlacement()?.displayName || ''
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
      'Ad Tier & Placement',
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

  // File upload methods
  onImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const newImages: UploadedMedia[] = [];
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          const media: UploadedMedia = {
            id: crypto.randomUUID(),
            url: e.target?.result as string,
            name: file.name,
            type: 'image',
            file: file
          };
          this.uploadedImages.update(images => [...images, media]);
          // Update form control
          const currentImages = this.contentForm.get('images')?.value || [];
          this.contentForm.patchValue({ images: [...currentImages, { url: media.url, id: media.id }] });
        };
        reader.readAsDataURL(file);
      }
    }
  }

  onVideoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          const media: UploadedMedia = {
            id: crypto.randomUUID(),
            url: e.target?.result as string,
            name: file.name,
            type: 'video',
            file: file
          };
          this.uploadedVideos.update(videos => [...videos, media]);
          // Update form control
          const currentVideos = this.contentForm.get('videos')?.value || [];
          this.contentForm.patchValue({ videos: [...currentVideos, { url: media.url, id: media.id }] });
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removeImage(imageId: string): void {
    this.uploadedImages.update(images => images.filter(img => img.id !== imageId));
    const currentImages = this.contentForm.get('images')?.value || [];
    this.contentForm.patchValue({ images: currentImages.filter((img: any) => img.id !== imageId) });
  }

  removeVideo(videoId: string): void {
    this.uploadedVideos.update(videos => videos.filter(vid => vid.id !== videoId));
    const currentVideos = this.contentForm.get('videos')?.value || [];
    this.contentForm.patchValue({ videos: currentVideos.filter((vid: any) => vid.id !== videoId) });
  }

  // Multi-select helper methods
  toggleCountry(country: Country): void {
    const currentCountries = this.targetingForm.get('countries')?.value || [];
    const countryId = country.id;
    const index = currentCountries.indexOf(countryId);
    if (index === -1) {
      this.targetingForm.patchValue({ countries: [...currentCountries, countryId] });
    } else {
      this.targetingForm.patchValue({ countries: currentCountries.filter((c: string) => c !== countryId) });
    }
    // Reset cities when countries change
    this.targetingForm.patchValue({ cities: [] });
    // Load cities for selected countries
    this.loadCitiesForSelectedCountries();
  }

  isCountrySelected(country: Country): boolean {
    const countries = this.targetingForm.get('countries')?.value || [];
    return countries.includes(country.id);
  }

  toggleCity(city: any): void {
    const currentCities = this.targetingForm.get('cities')?.value || [];
    const cityId = city.id;
    const index = currentCities.indexOf(cityId);
    if (index === -1) {
      this.targetingForm.patchValue({ cities: [...currentCities, cityId] });
    } else {
      this.targetingForm.patchValue({ cities: currentCities.filter((c: string) => c !== cityId) });
    }
  }

  isCitySelected(city: any): boolean {
    const cities = this.targetingForm.get('cities')?.value || [];
    return cities.includes(city.id);
  }

  loadCitiesForSelectedCountries(): void {
    // Cities are already loaded and filtered by the availableCities computed signal
    // This method is here for future enhancements if needed
  }

  toggleUserType(userType: string): void {
    const currentTypes = this.targetingForm.get('userTypes')?.value || [];
    const index = currentTypes.indexOf(userType);
    if (index === -1) {
      this.targetingForm.patchValue({ userTypes: [...currentTypes, userType] });
    } else {
      this.targetingForm.patchValue({ userTypes: currentTypes.filter((t: string) => t !== userType) });
    }
  }

  isUserTypeSelected(userType: string): boolean {
    const types = this.targetingForm.get('userTypes')?.value || [];
    return types.includes(userType);
  }

  toggleObjective(objective: string): void {
    const currentObjectives = this.basicInfoForm.get('objectives')?.value || [];
    const index = currentObjectives.indexOf(objective);
    if (index === -1) {
      this.basicInfoForm.patchValue({ objectives: [...currentObjectives, objective] });
    } else {
      this.basicInfoForm.patchValue({ objectives: currentObjectives.filter((o: string) => o !== objective) });
    }
  }

  isObjectiveSelected(objective: string): boolean {
    const objectives = this.basicInfoForm.get('objectives')?.value || [];
    return objectives.includes(objective);
  }

  // Cancel creation
  cancelCreation(): void {
    if (confirm('Are you sure you want to cancel? All progress will be lost.')) {
      this.router.navigate([this.getAdsRoute()]);
    }
  }

  // Get today's date in YYYY-MM-DD format for date input min attribute
  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}
