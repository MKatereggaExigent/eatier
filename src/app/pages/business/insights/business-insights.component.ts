import { Business, BusinessOwnerService } from '../../../core/services/business-owner.service';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, catchError, finalize, of, takeUntil } from 'rxjs';

import { BusinessInsights } from '../../../shared/models/business-profile.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-business-insights',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './business-insights.component.html',
  styleUrls: ['./business-insights.component.scss']
})
export class BusinessInsightsComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private businessOwnerService = inject(BusinessOwnerService);
  private destroy$ = new Subject<void>();

  // State management
  business = signal<Business | null>(null);
  insights = signal<BusinessInsights | null>(null);
  isLoading = signal<boolean>(false);
  selectedPeriod = signal<string>('monthly');
  isExporting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Form for custom date range
  dateRangeForm: FormGroup;

  // Period options
  readonly periodOptions = [
    { value: 'daily', label: 'Daily', icon: '📅' },
    { value: 'monthly', label: 'Monthly', icon: '📊' },
    { value: 'quarterly', label: 'Quarterly', icon: '📈' },
    { value: 'yearly', label: 'Yearly', icon: '📋' },
    { value: 'custom', label: 'Custom Range', icon: '🗓️' }
  ];

  // Mock insights data
  mockInsights: BusinessInsights = {
    businessId: 'business-1',
    period: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31'),
      type: 'monthly'
    },
    metrics: {
      totalViews: 2456,
      uniqueVisitors: 1834,
      menuViews: 1567,
      profileViews: 889,
      contactClicks: 234,
      qrScans: 156,
      shareCount: 89
    },
    engagement: {
      averageSessionDuration: 145, // seconds
      bounceRate: 0.32,
      returnVisitorRate: 0.28,
      peakHours: ['12:00', '13:00', '19:00', '20:00'],
      popularMenuItems: ['Margherita Pizza', 'Caesar Salad', 'Tiramisu', 'Pasta Carbonara']
    },
    growth: {
      viewsGrowth: 0.18, // 18% increase
      engagementGrowth: 0.12, // 12% increase
      customerGrowth: 0.25 // 25% increase
    },
    demographics: {
      topCountries: [
        { country: 'United States', count: 1245 },
        { country: 'Canada', count: 234 },
        { country: 'United Kingdom', count: 189 },
        { country: 'Australia', count: 166 }
      ],
      deviceTypes: [
        { type: 'Mobile', percentage: 68 },
        { type: 'Desktop', percentage: 24 },
        { type: 'Tablet', percentage: 8 }
      ],
      referralSources: [
        { source: 'Google Search', count: 892 },
        { source: 'Social Media', count: 456 },
        { source: 'Direct', count: 334 },
        { source: 'Referral', count: 152 }
      ]
    }
  };

  constructor() {
    this.dateRangeForm = this.fb.group({
      startDate: [''],
      endDate: ['']
    });
  }

  ngOnInit(): void {
    this.loadBusinessData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBusinessData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.businessOwnerService.getMyBusiness()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading business data:', error);
          this.errorMessage.set('Failed to load business data. Please try again.');
          return of({ business: null });
        }),
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe(response => {
        if (response && response.business) {
          this.business.set(response.business);
          this.generateInsights(response.business);
        }
      });
  }

  generateInsights(business: Business): void {
    // Generate insights from real business data
    // TODO: Replace with actual analytics API when available
    const insights: BusinessInsights = {
      businessId: business.id,
      period: {
        start: new Date(new Date().setDate(1)), // First day of current month
        end: new Date(),
        type: this.selectedPeriod() as 'daily' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
      },
      metrics: {
        totalViews: business.total_bookings ? business.total_bookings * 10 : 0, // Estimate
        uniqueVisitors: business.total_bookings ? business.total_bookings * 7 : 0,
        menuViews: business.total_menu_items ? business.total_menu_items * 50 : 0,
        profileViews: business.total_reviews ? business.total_reviews * 15 : 0,
        contactClicks: business.total_bookings || 0,
        qrScans: Math.floor((business.total_bookings || 0) * 0.3),
        shareCount: Math.floor((business.total_reviews || 0) * 0.5)
      },
      engagement: {
        averageSessionDuration: 145, // TODO: Get from analytics
        bounceRate: 0.32,
        returnVisitorRate: 0.28,
        peakHours: ['12:00', '13:00', '19:00', '20:00'],
        popularMenuItems: [] // TODO: Get from menu analytics
      },
      growth: {
        viewsGrowth: 0.18,
        engagementGrowth: 0.12,
        customerGrowth: 0.25
      },
      demographics: {
        topCountries: [
          { country: business.country || 'United States', count: business.total_bookings || 0 }
        ],
        deviceTypes: [
          { type: 'Mobile', percentage: 68 },
          { type: 'Desktop', percentage: 24 },
          { type: 'Tablet', percentage: 8 }
        ],
        referralSources: [
          { source: 'Google Search', count: Math.floor((business.total_bookings || 0) * 0.5) },
          { source: 'Social Media', count: Math.floor((business.total_bookings || 0) * 0.3) },
          { source: 'Direct', count: Math.floor((business.total_bookings || 0) * 0.2) }
        ]
      }
    };

    this.insights.set(insights);
  }

  loadInsights(): void {
    // Reload business data when period changes
    this.loadBusinessData();
  }

  onPeriodChange(period: string): void {
    this.selectedPeriod.set(period);
    this.loadInsights();
  }

  onCustomDateRange(): void {
    if (this.dateRangeForm.valid) {
      const { startDate, endDate } = this.dateRangeForm.value;
      if (startDate && endDate) {
        this.selectedPeriod.set('custom');
        this.loadInsights();
      }
    }
  }

  exportToPDF(): void {
    this.isExporting.set(true);

    // Mock PDF export
    setTimeout(() => {
      // In a real app, this would generate and download a PDF
      const insights = this.insights();
      if (insights) {
        const filename = `business-insights-${insights.period.type}-${Date.now()}.pdf`;
        console.log(`Exporting insights to ${filename}`);

        // Create a mock download
        const link = document.createElement('a');
        link.href = '#';
        link.download = filename;
        link.click();
      }

      this.isExporting.set(false);
    }, 2000);
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatPercentage(decimal: number): string {
    return (decimal * 100).toFixed(1) + '%';
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  getGrowthIcon(growth: number): string {
    return growth > 0 ? '📈' : growth < 0 ? '📉' : '➡️';
  }

  getGrowthClass(growth: number): string {
    return growth > 0 ? 'positive' : growth < 0 ? 'negative' : 'neutral';
  }

  getPeriodLabel(): string {
    const period = this.selectedPeriod();
    return this.periodOptions.find(p => p.value === period)?.label || 'Unknown';
  }

  getPeriodIcon(): string {
    const period = this.selectedPeriod();
    return this.periodOptions.find(p => p.value === period)?.icon || '📊';
  }

  getEngagementLevel(rate: number): { label: string; class: string } {
    if (rate >= 0.7) return { label: 'Excellent', class: 'excellent' };
    if (rate >= 0.5) return { label: 'Good', class: 'good' };
    if (rate >= 0.3) return { label: 'Average', class: 'average' };
    return { label: 'Needs Improvement', class: 'poor' };
  }

  getBounceRateLevel(rate: number): { label: string; class: string } {
    if (rate <= 0.2) return { label: 'Excellent', class: 'excellent' };
    if (rate <= 0.4) return { label: 'Good', class: 'good' };
    if (rate <= 0.6) return { label: 'Average', class: 'average' };
    return { label: 'High', class: 'poor' };
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getDeviceIcon(deviceType: string): string {
    const icons: Record<string, string> = {
      'Mobile': '📱',
      'Desktop': '💻',
      'Tablet': '📱'
    };
    return icons[deviceType] || '📱';
  }

  getReferralIcon(source: string): string {
    const icons: Record<string, string> = {
      'Google Search': '🔍',
      'Social Media': '📱',
      'Direct': '🌐',
      'Referral': '🔗'
    };
    return icons[source] || '🌐';
  }
}
