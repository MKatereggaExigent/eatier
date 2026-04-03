import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule, Calendar, BarChart3, TrendingUp, ClipboardList, CalendarRange, Eye, Users, Phone, Smartphone, Image, Upload, Briefcase, Star, FileText, Globe, Monitor, Search, type LucideIconData } from 'lucide-angular';

import { CommonModule } from '@angular/common';
import { UserInsights } from '../../../shared/models/user-profile.model';

@Component({
  selector: 'app-user-insights',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './user-insights.component.html',
  styleUrls: ['./user-insights.component.scss']
})
export class UserInsightsComponent implements OnInit {
  private fb = inject(FormBuilder);

  // Lucide Icons
  readonly Calendar = Calendar;
  readonly BarChart3 = BarChart3;
  readonly TrendingUp = TrendingUp;
  readonly ClipboardList = ClipboardList;
  readonly CalendarRange = CalendarRange;
  readonly Eye = Eye;
  readonly Users = Users;
  readonly Phone = Phone;
  readonly Smartphone = Smartphone;
  readonly Image = Image;
  readonly Upload = Upload;
  readonly Briefcase = Briefcase;
  readonly Star = Star;
  readonly FileText = FileText;
  readonly Globe = Globe;
  readonly Monitor = Monitor;
  readonly Search = Search;

  // State management
  insights = signal<UserInsights | null>(null);
  isLoading = signal<boolean>(false);
  selectedPeriod = signal<string>('monthly');
  isExporting = signal<boolean>(false);

  // Form for custom date range
  dateRangeForm: FormGroup;

  // Period options
  readonly periodOptions = [
    { value: 'daily', label: 'Daily', icon: this.Calendar },
    { value: 'monthly', label: 'Monthly', icon: this.BarChart3 },
    { value: 'quarterly', label: 'Quarterly', icon: this.TrendingUp },
    { value: 'yearly', label: 'Yearly', icon: this.ClipboardList },
    { value: 'custom', label: 'Custom Range', icon: this.CalendarRange }
  ];



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

    // TODO: Replace with actual API call when analytics endpoint is available
    setTimeout(() => {
      // Create empty insights structure - data will be populated when analytics API is available
      const emptyInsights: UserInsights = {
        userId: '',
        period: {
          start: new Date(new Date().setDate(1)), // First day of current month
          end: new Date(),
          type: this.selectedPeriod() as 'daily' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
        },
        metrics: {
          profileViews: 0,
          uniqueVisitors: 0,
          contactClicks: 0,
          qrScans: 0,
          portfolioViews: 0,
          businessCardShares: 0
        },
        engagement: {
          averageSessionDuration: 0,
          returnVisitorRate: 0,
          peakHours: [],
          topReferrers: []
        },
        professional: {
          inquiries: 0,
          bookingRequests: 0,
          reviewsReceived: 0,
          averageRating: 0
        },
        demographics: {
          topCountries: [],
          deviceTypes: [],
          ageGroups: []
        }
      };

      this.insights.set(emptyInsights);
      this.isLoading.set(false);
    }, 500);
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

  getPeriodIcon(): any {
    const period = this.selectedPeriod();
    return this.periodOptions.find(p => p.value === period)?.icon || this.BarChart3;
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

  getDeviceIcon(deviceType: string): any {
    const icons: Record<string, any> = {
      'Mobile': this.Smartphone,
      'Desktop': this.Monitor,
      'Tablet': this.Smartphone
    };
    return icons[deviceType] || this.Smartphone;
  }

  getReferrerIcon(source: string): any {
    const icons: Record<string, any> = {
      'Google Search': this.Search,
      'LinkedIn': this.Briefcase,
      'Instagram': this.Image,
      'Facebook': this.Globe,
      'Twitter': this.Globe,
      'Direct': this.Globe
    };
    return icons[source] || this.Globe;
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
