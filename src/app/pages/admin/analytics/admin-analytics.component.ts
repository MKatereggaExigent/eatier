import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface AnalyticsData {
  userGrowth: { month: string; users: number; growth: number }[];
  revenueData: { month: string; revenue: number; growth: number }[];
  bookingTrends: { month: string; bookings: number; growth: number }[];
  topCities: { city: string; users: number; businesses: number }[];
  deviceStats: { device: string; percentage: number }[];
  conversionRates: { funnel: string; rate: number }[];
}

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-analytics" role="main" aria-label="Admin Analytics">
      <header class="analytics-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              <span class="title-icon">📈</span>
              Platform Analytics
            </h1>
            <p class="page-subtitle">
              Comprehensive analytics and insights for the entire Eatier platform
            </p>
          </div>
        </div>

        <!-- Key Metrics -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon">👥</div>
            <div class="metric-content">
              <div class="metric-number">{{ formatNumber(12847) }}</div>
              <div class="metric-label">Total Users</div>
              <div class="metric-change positive">+12.5% this month</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">💰</div>
            <div class="metric-content">
              <div class="metric-number">{{ formatCurrency(234567) }}</div>
              <div class="metric-label">Monthly Revenue</div>
              <div class="metric-change positive">+8.3% this month</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">📅</div>
            <div class="metric-content">
              <div class="metric-number">{{ formatNumber(3456) }}</div>
              <div class="metric-label">Monthly Bookings</div>
              <div class="metric-change positive">+15.7% this month</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">🏪</div>
            <div class="metric-content">
              <div class="metric-number">{{ formatNumber(1256) }}</div>
              <div class="metric-label">Active Businesses</div>
              <div class="metric-change positive">+6.2% this month</div>
            </div>
          </div>
        </div>
      </header>

      <!-- Analytics Charts -->
      <div class="analytics-content">
        <div class="charts-grid">
          <!-- User Growth Chart -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>User Growth Trend</h3>
              <div class="chart-period">Last 6 months</div>
            </div>
            <div class="chart-placeholder">
              <div class="chart-icon">📈</div>
              <p>User growth visualization</p>
              <div class="chart-data">
                @for (data of analyticsData().userGrowth; track data.month) {
                  <div class="data-point">
                    <span class="month">{{ data.month }}</span>
                    <span class="value">{{ formatNumber(data.users) }}</span>
                    <span class="growth" [class.positive]="data.growth > 0" [class.negative]="data.growth < 0">
                      {{ data.growth > 0 ? '+' : '' }}{{ data.growth.toFixed(1) }}%
                    </span>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Revenue Chart -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>Revenue Analytics</h3>
              <div class="chart-period">Last 6 months</div>
            </div>
            <div class="chart-placeholder">
              <div class="chart-icon">💰</div>
              <p>Revenue trend visualization</p>
              <div class="chart-data">
                @for (data of analyticsData().revenueData; track data.month) {
                  <div class="data-point">
                    <span class="month">{{ data.month }}</span>
                    <span class="value">{{ formatCurrency(data.revenue) }}</span>
                    <span class="growth" [class.positive]="data.growth > 0" [class.negative]="data.growth < 0">
                      {{ data.growth > 0 ? '+' : '' }}{{ data.growth.toFixed(1) }}%
                    </span>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Booking Trends -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>Booking Trends</h3>
              <div class="chart-period">Last 6 months</div>
            </div>
            <div class="chart-placeholder">
              <div class="chart-icon">📅</div>
              <p>Booking trends visualization</p>
              <div class="chart-data">
                @for (data of analyticsData().bookingTrends; track data.month) {
                  <div class="data-point">
                    <span class="month">{{ data.month }}</span>
                    <span class="value">{{ formatNumber(data.bookings) }}</span>
                    <span class="growth" [class.positive]="data.growth > 0" [class.negative]="data.growth < 0">
                      {{ data.growth > 0 ? '+' : '' }}{{ data.growth.toFixed(1) }}%
                    </span>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Top Cities -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>Top Cities</h3>
              <div class="chart-period">By user activity</div>
            </div>
            <div class="chart-placeholder">
              <div class="chart-icon">🌍</div>
              <p>Geographic distribution</p>
              <div class="chart-data">
                @for (city of analyticsData().topCities; track city.city) {
                  <div class="data-point">
                    <span class="month">{{ city.city }}</span>
                    <span class="value">{{ formatNumber(city.users) }} users</span>
                    <span class="growth">{{ formatNumber(city.businesses) }} businesses</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Additional Analytics -->
        <div class="analytics-grid">
          <!-- Device Stats -->
          <div class="analytics-card">
            <div class="analytics-header">
              <h3>Device Usage</h3>
            </div>
            <div class="analytics-content">
              @for (device of analyticsData().deviceStats; track device.device) {
                <div class="analytics-item">
                  <div class="item-label">{{ device.device }}</div>
                  <div class="item-bar">
                    <div class="bar-fill" [style.width.%]="device.percentage"></div>
                  </div>
                  <div class="item-value">{{ device.percentage.toFixed(1) }}%</div>
                </div>
              }
            </div>
          </div>

          <!-- Conversion Rates -->
          <div class="analytics-card">
            <div class="analytics-header">
              <h3>Conversion Funnel</h3>
            </div>
            <div class="analytics-content">
              @for (funnel of analyticsData().conversionRates; track funnel.funnel) {
                <div class="analytics-item">
                  <div class="item-label">{{ funnel.funnel }}</div>
                  <div class="item-bar">
                    <div class="bar-fill" [style.width.%]="funnel.rate"></div>
                  </div>
                  <div class="item-value">{{ funnel.rate.toFixed(1) }}%</div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-analytics {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
      font-family: 'Inter', sans-serif;
    }

    .analytics-header {
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

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;

        .metric-card {
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

          .metric-icon {
            font-size: 2rem;
            margin-bottom: 1rem;
          }

          .metric-content {
            .metric-number {
              font-size: 2rem;
              font-weight: 700;
              color: white;
              margin-bottom: 0.5rem;
            }

            .metric-label {
              font-size: 1rem;
              color: rgba(255, 255, 255, 0.8);
              margin-bottom: 0.5rem;
            }

            .metric-change {
              font-size: 0.875rem;
              font-weight: 600;

              &.positive {
                color: #10b981;
              }

              &.negative {
                color: #ef4444;
              }
            }
          }
        }
      }
    }

    .analytics-content {
      .charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;

        .chart-card {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 1rem;
          padding: 1.5rem;

          .chart-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;

            h3 {
              color: white;
              font-size: 1.125rem;
              font-weight: 600;
              margin: 0;
            }

            .chart-period {
              color: rgba(255, 255, 255, 0.7);
              font-size: 0.875rem;
            }
          }

          .chart-placeholder {
            text-align: center;
            padding: 2rem;

            .chart-icon {
              font-size: 3rem;
              margin-bottom: 1rem;
            }

            p {
              color: rgba(255, 255, 255, 0.8);
              margin-bottom: 1.5rem;
            }

            .chart-data {
              text-align: left;

              .data-point {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);

                &:last-child {
                  border-bottom: none;
                }

                .month {
                  color: white;
                  font-weight: 500;
                  flex: 1;
                }

                .value {
                  color: rgba(255, 255, 255, 0.9);
                  font-weight: 600;
                  flex: 1;
                  text-align: center;
                }

                .growth {
                  font-size: 0.875rem;
                  font-weight: 600;
                  flex: 1;
                  text-align: right;

                  &.positive {
                    color: #10b981;
                  }

                  &.negative {
                    color: #ef4444;
                  }
                }
              }
            }
          }
        }
      }

      .analytics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;

        .analytics-card {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 1rem;
          padding: 1.5rem;

          .analytics-header {
            margin-bottom: 1rem;

            h3 {
              color: white;
              font-size: 1.125rem;
              font-weight: 600;
              margin: 0;
            }
          }

          .analytics-content {
            .analytics-item {
              display: flex;
              align-items: center;
              gap: 1rem;
              margin-bottom: 1rem;

              &:last-child {
                margin-bottom: 0;
              }

              .item-label {
                color: white;
                font-weight: 500;
                min-width: 80px;
              }

              .item-bar {
                flex: 1;
                height: 8px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                overflow: hidden;

                .bar-fill {
                  height: 100%;
                  background: linear-gradient(90deg, #3b82f6, #10b981);
                  border-radius: 4px;
                  transition: width 0.3s ease;
                }
              }

              .item-value {
                color: rgba(255, 255, 255, 0.9);
                font-weight: 600;
                min-width: 50px;
                text-align: right;
              }
            }
          }
        }
      }
    }
  `]
})
export class AdminAnalyticsComponent {
  private authService = inject(AuthService);
  currentUser = this.authService.currentUser;

  // Mock analytics data
  analyticsData = signal<AnalyticsData>({
    userGrowth: [
      { month: 'Aug', users: 8234, growth: 12.5 },
      { month: 'Sep', users: 9156, growth: 11.2 },
      { month: 'Oct', users: 10234, growth: 11.8 },
      { month: 'Nov', users: 11456, growth: 11.9 },
      { month: 'Dec', users: 12234, growth: 6.8 },
      { month: 'Jan', users: 12847, growth: 5.0 }
    ],
    revenueData: [
      { month: 'Aug', revenue: 156789, growth: 8.3 },
      { month: 'Sep', revenue: 167234, growth: 6.7 },
      { month: 'Oct', revenue: 178456, growth: 6.7 },
      { month: 'Nov', revenue: 198234, growth: 11.1 },
      { month: 'Dec', revenue: 215678, growth: 8.8 },
      { month: 'Jan', revenue: 234567, growth: 8.8 }
    ],
    bookingTrends: [
      { month: 'Aug', bookings: 2134, growth: 15.7 },
      { month: 'Sep', bookings: 2456, growth: 15.1 },
      { month: 'Oct', bookings: 2789, growth: 13.5 },
      { month: 'Nov', bookings: 3012, growth: 8.0 },
      { month: 'Dec', bookings: 3234, growth: 7.4 },
      { month: 'Jan', bookings: 3456, growth: 6.9 }
    ],
    topCities: [
      { city: 'New York', users: 3456, businesses: 234 },
      { city: 'Los Angeles', users: 2789, businesses: 189 },
      { city: 'Chicago', users: 1987, businesses: 145 },
      { city: 'Houston', users: 1654, businesses: 123 },
      { city: 'Miami', users: 1432, businesses: 98 }
    ],
    deviceStats: [
      { device: 'Mobile', percentage: 68.5 },
      { device: 'Desktop', percentage: 24.3 },
      { device: 'Tablet', percentage: 7.2 }
    ],
    conversionRates: [
      { funnel: 'Visitor to Signup', rate: 12.5 },
      { funnel: 'Signup to Profile', rate: 78.3 },
      { funnel: 'Profile to Booking', rate: 34.7 },
      { funnel: 'Booking to Payment', rate: 89.2 }
    ]
  });

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }
}
