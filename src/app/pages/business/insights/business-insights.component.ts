import { Business, BusinessOwnerService } from '../../../core/services/business-owner.service';
import { BusinessInsightsResponse, InsightsService } from '../../../core/services/insights.service';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, catchError, finalize, forkJoin, of, switchMap, takeUntil } from 'rxjs';

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
  private insightsService = inject(InsightsService);
  private destroy$ = new Subject<void>();

  // State management
  business = signal<Business | null>(null);
  insights = signal<BusinessInsights | null>(null);
  insightsData = signal<BusinessInsightsResponse | null>(null);
  isLoading = signal<boolean>(false);
  selectedPeriod = signal<string>('monthly');
  isExporting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Form for custom date range
  dateRangeForm: FormGroup;

  // Period options
  readonly periodOptions = [
    { value: 'daily', label: 'Daily', icon: '📅' },
    { value: 'weekly', label: 'Weekly', icon: '📆' },
    { value: 'monthly', label: 'Monthly', icon: '📊' },
    { value: 'yearly', label: 'Yearly', icon: '📋' },
    { value: 'custom', label: 'Custom Range', icon: '🗓️' }
  ];



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
          this.fetchInsights(response.business.id);
        }
      });
  }

  fetchInsights(businessId: string): void {
    const period = this.selectedPeriod() as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (period === 'custom') {
      const formValue = this.dateRangeForm.value;
      startDate = formValue.startDate;
      endDate = formValue.endDate;
    }

    this.insightsService.getBusinessInsights(businessId, period, startDate, endDate)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error fetching insights:', error);
          this.errorMessage.set('Failed to load insights. Please try again.');
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.insightsData.set(response);
          this.convertToBusinessInsights(response);
        }
      });
  }

  convertToBusinessInsights(data: BusinessInsightsResponse): void {
    // Map 'weekly' to 'daily' for the BusinessInsights type which doesn't support 'weekly'
    const periodType = data.period.type === 'weekly' ? 'daily' : data.period.type;

    const insights: BusinessInsights = {
      businessId: data.businessId,
      period: {
        start: new Date(data.period.start),
        end: new Date(data.period.end),
        type: periodType as 'daily' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
      },
      metrics: data.metrics,
      engagement: data.engagement,
      growth: data.growth,
      demographics: data.demographics
    };
    this.insights.set(insights);
  }



  loadInsights(): void {
    const business = this.business();
    if (business) {
      this.isLoading.set(true);
      this.fetchInsights(business.id);
      setTimeout(() => this.isLoading.set(false), 1000);
    } else {
      this.loadBusinessData();
    }
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
