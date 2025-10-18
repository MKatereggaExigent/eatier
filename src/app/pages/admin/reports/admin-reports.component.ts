import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';

interface ReportStats {
  availableReports: number;
  scheduledReports: number;
  generatedThisMonth: number;
  dataExported: string;
}

interface ReportData {
  title: string;
  generatedAt: Date;
  totalRecords: number;
  data: any[];
}

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-reports.component.html',
  styleUrls: ['./admin-reports.component.scss']
})
export class AdminReportsComponent implements OnInit {
  private authService = inject(AuthService);
  private adminService = inject(AdminService);

  currentUser = this.authService.currentUser;

  // State management
  isLoading = signal(false);
  generatingReport = signal<string | null>(null);
  showReportPreview = signal(false);

  // Report stats
  reportStats = signal<ReportStats>({
    availableReports: 6,
    scheduledReports: 0,
    generatedThisMonth: 0,
    dataExported: '0 MB'
  });

  // Current report data
  currentReport = signal<ReportData>({
    title: '',
    generatedAt: new Date(),
    totalRecords: 0,
    data: []
  });

  // Date filters
  usersDateFrom: string = '';
  usersDateTo: string = '';
  businessesDateFrom: string = '';
  businessesDateTo: string = '';
  bookingsDateFrom: string = '';
  bookingsDateTo: string = '';
  bookingsStatus: string = 'all';
  financialDateFrom: string = '';
  financialDateTo: string = '';
  analyticsDateFrom: string = '';
  analyticsDateTo: string = '';
  activityDateFrom: string = '';
  activityDateTo: string = '';
  activityActionType: string = 'all';

  ngOnInit() {
    this.loadReportStats();
  }

  loadReportStats(): void {
    this.isLoading.set(true);

    this.adminService.getReportStats().subscribe({
      next: (response: any) => {
        this.reportStats.set({
          availableReports: response.availableReports || 6,
          scheduledReports: response.scheduledReports || 0,
          generatedThisMonth: response.generatedThisMonth || 0,
          dataExported: response.dataExported || '0 MB'
        });
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading report stats:', error);
        this.isLoading.set(false);
      }
    });
  }

  generateUsersReport(format: string): void {
    this.generatingReport.set('users');

    this.adminService.generateUsersReport(
      format,
      this.usersDateFrom || undefined,
      this.usersDateTo || undefined
    ).subscribe({
      next: (response: any) => {
        if (format === 'csv') {
          // Download CSV
          this.downloadCSV(response, 'users-report.csv');
        } else {
          // Show preview
          this.currentReport.set({
            title: 'Users Report',
            generatedAt: new Date(response.generatedAt),
            totalRecords: response.totalRecords,
            data: response.data
          });
          this.showReportPreview.set(true);
        }
        this.generatingReport.set(null);
      },
      error: (error) => {
        console.error('Error generating users report:', error);
        alert('Failed to generate users report. Please try again.');
        this.generatingReport.set(null);
      }
    });
  }

  generateBusinessesReport(format: string): void {
    this.generatingReport.set('businesses');

    this.adminService.generateBusinessesReport(
      format,
      this.businessesDateFrom || undefined,
      this.businessesDateTo || undefined
    ).subscribe({
      next: (response: any) => {
        if (format === 'csv') {
          // Download CSV
          this.downloadCSV(response, 'businesses-report.csv');
        } else {
          // Show preview
          this.currentReport.set({
            title: 'Businesses Report',
            generatedAt: new Date(response.generatedAt),
            totalRecords: response.totalRecords,
            data: response.data
          });
          this.showReportPreview.set(true);
        }
        this.generatingReport.set(null);
      },
      error: (error) => {
        console.error('Error generating businesses report:', error);
        alert('Failed to generate businesses report. Please try again.');
        this.generatingReport.set(null);
      }
    });
  }

  generateBookingsReport(format: string): void {
    this.generatingReport.set('bookings');

    this.adminService.generateBookingsReport(
      format,
      this.bookingsDateFrom || undefined,
      this.bookingsDateTo || undefined,
      this.bookingsStatus !== 'all' ? this.bookingsStatus : undefined
    ).subscribe({
      next: (response: any) => {
        if (format === 'csv') {
          // Download CSV
          this.downloadCSV(response, 'bookings-report.csv');
        } else {
          // Show preview
          this.currentReport.set({
            title: 'Bookings Report',
            generatedAt: new Date(response.generatedAt),
            totalRecords: response.totalRecords,
            data: response.data
          });
          this.showReportPreview.set(true);
        }
        this.generatingReport.set(null);
      },
      error: (error) => {
        console.error('Error generating bookings report:', error);
        alert('Failed to generate bookings report. Please try again.');
        this.generatingReport.set(null);
      }
    });
  }

  generateFinancialReport(format: string): void {
    this.generatingReport.set('financial');

    this.adminService.generateFinancialReport(
      format,
      this.financialDateFrom || undefined,
      this.financialDateTo || undefined
    ).subscribe({
      next: (response: any) => {
        if (format === 'csv') {
          // Download CSV
          this.downloadCSV(response, 'financial-report.csv');
        } else {
          // Show preview
          this.currentReport.set({
            title: 'Financial Report',
            generatedAt: new Date(response.generatedAt),
            totalRecords: response.totalRecords,
            data: response.data
          });
          this.showReportPreview.set(true);
        }
        this.generatingReport.set(null);
      },
      error: (error) => {
        console.error('Error generating financial report:', error);
        alert('Failed to generate financial report. Please try again.');
        this.generatingReport.set(null);
      }
    });
  }

  generateAnalyticsReport(format: string): void {
    this.generatingReport.set('analytics');

    this.adminService.generateAnalyticsReport(
      format,
      this.analyticsDateFrom || undefined,
      this.analyticsDateTo || undefined
    ).subscribe({
      next: (response: any) => {
        if (format === 'csv') {
          // Download CSV
          this.downloadCSV(response, 'analytics-report.csv');
        } else {
          // Show preview
          this.currentReport.set({
            title: 'Analytics Report',
            generatedAt: new Date(response.generatedAt),
            totalRecords: response.totalRecords,
            data: response.data
          });
          this.showReportPreview.set(true);
        }
        this.generatingReport.set(null);
      },
      error: (error) => {
        console.error('Error generating analytics report:', error);
        alert('Failed to generate analytics report. Please try again.');
        this.generatingReport.set(null);
      }
    });
  }

  generateActivityReport(format: string): void {
    this.generatingReport.set('activity');

    this.adminService.generateActivityReport(
      format,
      this.activityDateFrom || undefined,
      this.activityDateTo || undefined,
      this.activityActionType !== 'all' ? this.activityActionType : undefined
    ).subscribe({
      next: (response: any) => {
        if (format === 'csv') {
          // Download CSV
          this.downloadCSV(response, 'activity-report.csv');
        } else {
          // Show preview
          this.currentReport.set({
            title: 'Activity Report',
            generatedAt: new Date(response.generatedAt),
            totalRecords: response.totalRecords,
            data: response.data
          });
          this.showReportPreview.set(true);
        }
        this.generatingReport.set(null);
      },
      error: (error) => {
        console.error('Error generating activity report:', error);
        alert('Failed to generate activity report. Please try again.');
        this.generatingReport.set(null);
      }
    });
  }

  closeReportPreview(): void {
    this.showReportPreview.set(false);
  }

  private downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}

