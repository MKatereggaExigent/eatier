import { Business, BusinessOwnerService } from '../../../core/services/business-owner.service';
import { BusinessInsightsResponse, InsightsService } from '../../../core/services/insights.service';
import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  LucideAngularModule, Eye, User, UtensilsCrossed, Phone, QrCode, Share2,
  Calendar, CalendarDays, BarChart3, ClipboardList, CalendarRange,
  TrendingUp, TrendingDown, Minus, Clock, ArrowUpRight, ArrowDownRight,
  MapPin, Smartphone, Globe, BookOpen, Star, MessageSquare, Activity,
  ChevronRight, RefreshCw, Download
} from 'lucide-angular';
import { Subject, catchError, finalize, of, takeUntil } from 'rxjs';

import { BusinessInsights } from '../../../shared/models/business-profile.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-business-insights',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './business-insights.component.html',
  styleUrls: ['./business-insights.component.scss']
})
export class BusinessInsightsComponent implements OnInit, OnDestroy {
  readonly Eye = Eye;
  readonly User = User;
  readonly UtensilsCrossed = UtensilsCrossed;
  readonly Phone = Phone;
  readonly QrCode = QrCode;
  readonly Share2 = Share2;
  readonly Calendar = Calendar;
  readonly CalendarDays = CalendarDays;
  readonly BarChart3 = BarChart3;
  readonly ClipboardList = ClipboardList;
  readonly CalendarRange = CalendarRange;
  readonly TrendingUp = TrendingUp;
  readonly TrendingDown = TrendingDown;
  readonly Minus = Minus;
  readonly Clock = Clock;
  readonly ArrowUpRight = ArrowUpRight;
  readonly ArrowDownRight = ArrowDownRight;
  readonly MapPin = MapPin;
  readonly Smartphone = Smartphone;
  readonly Globe = Globe;
  readonly BookOpen = BookOpen;
  readonly Star = Star;
  readonly MessageSquare = MessageSquare;
  readonly Activity = Activity;
  readonly ChevronRight = ChevronRight;
  readonly RefreshCw = RefreshCw;
  readonly Download = Download;

  private fb = inject(FormBuilder);
  private businessOwnerService = inject(BusinessOwnerService);
  private insightsService = inject(InsightsService);
  private destroy$ = new Subject<void>();

  business = signal<Business | null>(null);
  insights = signal<BusinessInsights | null>(null);
  insightsData = signal<BusinessInsightsResponse | null>(null);
  isLoading = signal<boolean>(false);
  selectedPeriod = signal<string>('monthly');
  isExporting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  dateRangeForm: FormGroup;

  readonly periodOptions = [
    { value: 'daily', label: 'Daily', icon: this.CalendarDays },
    { value: 'weekly', label: 'Weekly', icon: this.Calendar },
    { value: 'monthly', label: 'Monthly', icon: this.BarChart3 },
    { value: 'yearly', label: 'Yearly', icon: this.ClipboardList },
    { value: 'custom', label: 'Custom', icon: this.CalendarRange }
  ];

  statCards = computed(() => {
    const i = this.insights();
    if (!i) return [];
    return [
      { value: this.formatNumber(i.metrics.totalViews), label: 'Total Views', icon: this.Eye, growth: i.growth.viewsGrowth, accent: '#89C4D9' },
      { value: this.formatNumber(i.metrics.uniqueVisitors), label: 'Unique Visitors', icon: this.User, growth: i.growth.customerGrowth, accent: '#8FC9A3' },
      { value: this.formatNumber(i.metrics.menuViews), label: 'Menu Views', icon: this.UtensilsCrossed, growth: null, accent: '#000000' },
      { value: this.formatNumber(i.metrics.contactClicks), label: 'Contact Clicks', icon: this.Phone, growth: null, accent: '#F0B5BA' },
      { value: this.formatNumber(i.metrics.qrScans), label: 'QR Scans', icon: this.QrCode, growth: null, accent: '#000000' },
      { value: this.formatNumber(i.metrics.shareCount), label: 'Shares', icon: this.Share2, growth: null, accent: '#A8D8EA' },
    ];
  });

  data = computed(() => this.insightsData());

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
          this.errorMessage.set(null);
          this.insightsData.set(response);
          this.convertToBusinessInsights(response);
        }
      });
  }

  convertToBusinessInsights(data: BusinessInsightsResponse): void {
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
      this.errorMessage.set(null);
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
    setTimeout(() => {
      const insights = this.insights();
      if (insights) {
        const filename = `business-insights-${insights.period.type}-${Date.now()}.pdf`;
        console.log(`Exporting insights to ${filename}`);
        const link = document.createElement('a');
        link.href = '#';
        link.download = filename;
        link.click();
      }
      this.isExporting.set(false);
    }, 2000);
  }

  formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
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

  getGrowthIcon(growth: number): any {
    return growth > 0 ? this.TrendingUp : growth < 0 ? this.TrendingDown : this.Minus;
  }

  getGrowthClass(growth: number): string {
    return growth > 0 ? 'positive' : growth < 0 ? 'negative' : 'neutral';
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
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  getTrendIcon(value: number, inverse = false): any {
    if (value === 0) return this.Minus;
    const positive = inverse ? value < 0 : value > 0;
    return positive ? this.ArrowUpRight : this.ArrowDownRight;
  }

  getTrendClass(value: number, inverse = false): string {
    if (value === 0) return 'neutral';
    const positive = inverse ? value < 0 : value > 0;
    return positive ? 'positive' : 'negative';
  }

  getRatingStars(rating: number): number[] {
    return [1, 2, 3, 4, 5].map(i => (i <= Math.round(rating) ? 1 : 0));
  }

  getMaxViews(data: any): number {
    if (!data || !data.dailyData || data.dailyData.length === 0) return 1;
    return Math.max(...data.dailyData.map((d: any) => d.views));
  }

  formatGrowthAbs(value: number): string {
    return this.formatPercentage(Math.abs(value));
  }

  formatDayLabel(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
