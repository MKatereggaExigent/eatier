import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BusinessInsights } from '../../../shared/models/business-profile.model';

@Component({
  selector: 'app-business-insights',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './business-insights.component.html',
  styleUrls: ['./business-insights.component.scss']
})
export class BusinessInsightsComponent implements OnInit {
  private fb = inject(FormBuilder);

  // State management
  insights = signal<BusinessInsights | null>(null);
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
