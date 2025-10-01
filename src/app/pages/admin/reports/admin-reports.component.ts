import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'users' | 'businesses' | 'bookings' | 'financial' | 'analytics';
  icon: string;
  lastGenerated?: Date;
  frequency: 'daily' | 'weekly' | 'monthly' | 'on-demand';
  status: 'available' | 'generating' | 'scheduled';
}

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-reports" role="main" aria-label="Admin Reports">
      <header class="reports-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              <span class="title-icon">📋</span>
              Reports & Exports
            </h1>
            <p class="page-subtitle">
              Generate comprehensive reports and export platform data
            </p>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <div class="stat-number">24</div>
              <div class="stat-label">Available Reports</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">⏰</div>
            <div class="stat-content">
              <div class="stat-number">8</div>
              <div class="stat-label">Scheduled Reports</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">📈</div>
            <div class="stat-content">
              <div class="stat-number">156</div>
              <div class="stat-label">Generated This Month</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">💾</div>
            <div class="stat-content">
              <div class="stat-number">2.4 GB</div>
              <div class="stat-label">Data Exported</div>
            </div>
          </div>
        </div>
      </header>

      <!-- Report Categories -->
      <div class="reports-content">
        <div class="reports-grid">
          @for (report of reportTemplates(); track report.id) {
            <div class="report-card" [class]="'category-' + report.category">
              <div class="report-header">
                <div class="report-icon">{{ report.icon }}</div>
                <div class="report-info">
                  <h3 class="report-name">{{ report.name }}</h3>
                  <p class="report-description">{{ report.description }}</p>
                </div>
                <div class="report-status">
                  <div class="status-badge" [class]="'status-' + report.status">
                    {{ report.status | titlecase }}
                  </div>
                </div>
              </div>

              <div class="report-details">
                <div class="report-meta">
                  <div class="meta-item">
                    <span class="meta-label">Frequency:</span>
                    <span class="meta-value">{{ report.frequency | titlecase }}</span>
                  </div>
                  @if (report.lastGenerated) {
                    <div class="meta-item">
                      <span class="meta-label">Last Generated:</span>
                      <span class="meta-value">{{ formatDate(report.lastGenerated) }}</span>
                    </div>
                  }
                </div>
              </div>

              <div class="report-actions">
                <button
                  type="button"
                  class="btn-action generate-btn"
                  (click)="generateReport(report)"
                  [disabled]="report.status === 'generating'">
                  @if (report.status === 'generating') {
                    ⏳ Generating...
                  } @else {
                    🚀 Generate Now
                  }
                </button>

                <button
                  type="button"
                  class="btn-action schedule-btn"
                  (click)="scheduleReport(report)">
                  📅 Schedule
                </button>

                <button
                  type="button"
                  class="btn-action download-btn"
                  (click)="downloadReport(report)"
                  [disabled]="!report.lastGenerated">
                  📥 Download
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-reports {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
      font-family: 'Inter', sans-serif;
    }

    .reports-header {
      margin-bottom: 2rem;

      .header-content {
        margin-bottom: 2rem;

        .title-section {
          .page-title {
            font-family: 'Playfair Display', serif;
            font-size: 2rem;
            font-weight: 700;
            color: white;
            margin: 0 0 0.5rem 0;
            display: flex;
            align-items: center;
            gap: 1rem;

            .title-icon {
              font-size: 1.5rem;
            }
          }

          .page-subtitle {
            font-size: 1.125rem;
            color: rgba(255, 255, 255, 0.8);
            margin: 0;
          }
        }
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;

        .stat-card {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 1rem;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.3s ease;

          &:hover {
            background: rgba(255, 255, 255, 0.35);
            transform: translateY(-2px);
          }

          .stat-icon {
            font-size: 1.25rem;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 0.75rem;
          }

          .stat-content {
            .stat-number {
              font-size: 1.25rem;
              font-weight: 700;
              color: white;
              line-height: 1;
              margin-bottom: 0.25rem;
            }

            .stat-label {
              font-size: 0.875rem;
              color: rgba(255, 255, 255, 0.8);
              font-weight: 500;
            }
          }
        }
      }
    }

    .reports-content {
      .reports-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 1.5rem;

        .report-card {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 1rem;
          padding: 1.5rem;
          transition: all 0.3s ease;

          &:hover {
            background: rgba(255, 255, 255, 0.35);
            transform: translateY(-2px);
          }

          .report-header {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            margin-bottom: 1rem;

            .report-icon {
              font-size: 2rem;
              width: 60px;
              height: 60px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 1rem;
              flex-shrink: 0;
            }

            .report-info {
              flex: 1;

              .report-name {
                font-size: 1.125rem;
                font-weight: 600;
                color: white;
                margin: 0 0 0.5rem 0;
              }

              .report-description {
                font-size: 0.875rem;
                color: rgba(255, 255, 255, 0.8);
                margin: 0;
                line-height: 1.4;
              }
            }

            .report-status {
              .status-badge {
                padding: 0.25rem 0.75rem;
                border-radius: 0.5rem;
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;

                &.status-available {
                  background: rgba(34, 197, 94, 0.2);
                  color: #22c55e;
                }

                &.status-generating {
                  background: rgba(245, 158, 11, 0.2);
                  color: #f59e0b;
                }

                &.status-scheduled {
                  background: rgba(59, 130, 246, 0.2);
                  color: #3b82f6;
                }
              }
            }
          }

          .report-details {
            margin-bottom: 1rem;

            .report-meta {
              display: flex;
              flex-direction: column;
              gap: 0.5rem;

              .meta-item {
                display: flex;
                justify-content: space-between;
                align-items: center;

                .meta-label {
                  font-size: 0.875rem;
                  color: rgba(255, 255, 255, 0.7);
                  font-weight: 500;
                }

                .meta-value {
                  font-size: 0.875rem;
                  color: white;
                  font-weight: 600;
                }
              }
            }
          }

          .report-actions {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;

            .btn-action {
              padding: 0.5rem 1rem;
              border-radius: 0.5rem;
              border: none;
              font-size: 0.875rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              flex: 1;
              min-width: 120px;

              &:disabled {
                opacity: 0.5;
                cursor: not-allowed;
              }

              &.generate-btn {
                background: rgba(34, 197, 94, 0.2);
                color: #22c55e;
                border: 1px solid rgba(34, 197, 94, 0.3);

                &:hover:not(:disabled) {
                  background: rgba(34, 197, 94, 0.3);
                }
              }

              &.schedule-btn {
                background: rgba(59, 130, 246, 0.2);
                color: #3b82f6;
                border: 1px solid rgba(59, 130, 246, 0.3);

                &:hover {
                  background: rgba(59, 130, 246, 0.3);
                }
              }

              &.download-btn {
                background: rgba(147, 51, 234, 0.2);
                color: #a855f7;
                border: 1px solid rgba(147, 51, 234, 0.3);

                &:hover:not(:disabled) {
                  background: rgba(147, 51, 234, 0.3);
                }
              }
            }
          }
        }
      }
    }
  `]
})
export class AdminReportsComponent {
  private authService = inject(AuthService);
  currentUser = this.authService.currentUser;

  // Mock report templates
  reportTemplates = signal<ReportTemplate[]>([
    {
      id: '1',
      name: 'User Activity Report',
      description: 'Comprehensive analysis of user engagement and platform usage patterns',
      category: 'users',
      icon: '👥',
      lastGenerated: new Date('2024-01-20'),
      frequency: 'weekly',
      status: 'available'
    },
    {
      id: '2',
      name: 'Business Performance Report',
      description: 'Detailed insights into business metrics, bookings, and revenue performance',
      category: 'businesses',
      icon: '🏪',
      lastGenerated: new Date('2024-01-22'),
      frequency: 'monthly',
      status: 'available'
    },
    {
      id: '3',
      name: 'Booking Analytics Report',
      description: 'Analysis of booking trends, conversion rates, and customer behavior',
      category: 'bookings',
      icon: '📅',
      frequency: 'daily',
      status: 'generating'
    },
    {
      id: '4',
      name: 'Financial Summary Report',
      description: 'Revenue analysis, commission tracking, and financial performance metrics',
      category: 'financial',
      icon: '💰',
      lastGenerated: new Date('2024-01-21'),
      frequency: 'monthly',
      status: 'scheduled'
    },
    {
      id: '5',
      name: 'Platform Analytics Report',
      description: 'Overall platform performance, growth metrics, and key performance indicators',
      category: 'analytics',
      icon: '📈',
      lastGenerated: new Date('2024-01-19'),
      frequency: 'weekly',
      status: 'available'
    }
  ]);

  // Action methods
  generateReport(report: ReportTemplate): void {
    console.log('Generate report:', report.name);
    // TODO: Implement report generation
  }

  scheduleReport(report: ReportTemplate): void {
    console.log('Schedule report:', report.name);
    // TODO: Implement report scheduling
  }

  downloadReport(report: ReportTemplate): void {
    console.log('Download report:', report.name);
    // TODO: Implement report download
  }

  // Utility methods
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }
}
