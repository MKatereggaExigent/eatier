import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { UserInsights } from '../../../shared/models/user-profile.model';

@Component({
  selector: 'app-user-insights',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-insights.component.html',
  styleUrls: ['./user-insights.component.scss']
})
export class UserInsightsComponent implements OnInit {
  private fb = inject(FormBuilder);

  // State management
  insights = signal<UserInsights | null>(null);
  isLoading = signal<boolean>(false);
  selectedPeriod = signal<string>('monthly');
  isExporting = signal<boolean>(false);
  
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
  mockInsights: UserInsights = {
    userId: 'user-1',
    period: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31'),
      type: 'monthly'
    },
    metrics: {
      profileViews: 1234,
      uniqueVisitors: 892,
      contactClicks: 156,
      qrScans: 89,
      portfolioViews: 567,
      businessCardShares: 45
    },
    engagement: {
      averageSessionDuration: 185, // seconds
      returnVisitorRate: 0.34,
      peakHours: ['10:00', '14:00', '18:00', '20:00'],
      topReferrers: ['Google Search', 'LinkedIn', 'Instagram', 'Direct']
    },
    professional: {
      inquiries: 23,
      bookingRequests: 12,
      reviewsReceived: 8,
      averageRating: 4.7
    },
    demographics: {
      topCountries: [
        { country: 'United States', count: 456 },
        { country: 'Canada', count: 123 },
        { country: 'United Kingdom', count: 89 },
        { country: 'Australia', count: 67 }
      ],
      deviceTypes: [
        { type: 'Mobile', percentage: 72 },
        { type: 'Desktop', percentage: 21 },
        { type: 'Tablet', percentage: 7 }
      ],
      ageGroups: [
        { range: '25-34', percentage: 35 },
        { range: '35-44', percentage: 28 },
        { range: '45-54', percentage: 22 },
        { range: '18-24', percentage: 15 }
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
    this.loadInsights();
  }

  loadInsights(): void {
    this.isLoading.set(true);
    
    // Mock API call
    setTimeout(() => {
      // Update mock data based on selected period
      const updatedInsights = {
        ...this.mockInsights,
        period: {
          ...this.mockInsights.period,
          type: this.selectedPeriod() as any
        }
      };
      
      this.insights.set(updatedInsights);
      this.isLoading.set(false);
    }, 1000);
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
      const insights = this.insights();
      if (insights) {
        const filename = `user-insights-${insights.period.type}-${Date.now()}.pdf`;
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

  getPeriodLabel(): string {
    const period = this.selectedPeriod();
    return this.periodOptions.find(p => p.value === period)?.label || 'Unknown';
  }

  getPeriodIcon(): string {
    const period = this.selectedPeriod();
    return this.periodOptions.find(p => p.value === period)?.icon || '📊';
  }

  getEngagementLevel(rate: number): { label: string; class: string } {
    if (rate >= 0.5) return { label: 'Excellent', class: 'excellent' };
    if (rate >= 0.3) return { label: 'Good', class: 'good' };
    if (rate >= 0.2) return { label: 'Average', class: 'average' };
    return { label: 'Needs Improvement', class: 'poor' };
  }

  getRatingLevel(rating: number): { label: string; class: string } {
    if (rating >= 4.5) return { label: 'Excellent', class: 'excellent' };
    if (rating >= 4.0) return { label: 'Very Good', class: 'good' };
    if (rating >= 3.5) return { label: 'Good', class: 'average' };
    return { label: 'Needs Improvement', class: 'poor' };
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

  getReferrerIcon(source: string): string {
    const icons: Record<string, string> = {
      'Google Search': '🔍',
      'LinkedIn': '💼',
      'Instagram': '📸',
      'Facebook': '📘',
      'Twitter': '🐦',
      'Direct': '🌐'
    };
    return icons[source] || '🌐';
  }

  getInquiryConversionRate(): number {
    const insights = this.insights();
    if (!insights) return 0;
    
    const { inquiries, bookingRequests } = insights.professional;
    return inquiries > 0 ? (bookingRequests / inquiries) * 100 : 0;
  }

  getProfileCompletionScore(): number {
    // Mock calculation based on profile completeness
    // In real app, this would be calculated based on filled fields
    return 85;
  }

  getProfileCompletionLevel(score: number): { label: string; class: string } {
    if (score >= 90) return { label: 'Complete', class: 'excellent' };
    if (score >= 70) return { label: 'Good', class: 'good' };
    if (score >= 50) return { label: 'Needs Work', class: 'average' };
    return { label: 'Incomplete', class: 'poor' };
  }
}
