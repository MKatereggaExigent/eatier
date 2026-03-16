import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ServiceStatus {
  status: 'operational' | 'degraded' | 'down';
  message: string;
  responseTime?: string;
}

interface SystemStatus {
  overall: 'operational' | 'degraded' | 'down';
  timestamp: string;
  services: {
    api?: ServiceStatus;
    database?: ServiceStatus;
    websocket?: ServiceStatus;
  };
  uptime: number;
  responseTime: string;
}

interface UptimeInfo {
  uptime: {
    seconds: number;
    minutes: number;
    hours: number;
    days: number;
    formatted: string;
  };
  startTime: string;
  currentTime: string;
}

@Component({
  selector: 'app-system-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './system-status.component.html',
  styleUrls: ['./system-status.component.css']
})
export class SystemStatusComponent implements OnInit {
  private apiUrl = environment.apiUrl;

  systemStatus = signal<SystemStatus | null>(null);
  uptimeInfo = signal<UptimeInfo | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  lastUpdated = signal<Date>(new Date());

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadSystemStatus();
    // Auto-refresh every 30 seconds
    setInterval(() => this.loadSystemStatus(), 30000);
  }

  loadSystemStatus() {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<SystemStatus>(`${this.apiUrl}/system-status`).subscribe({
      next: (status) => {
        this.systemStatus.set(status);
        this.lastUpdated.set(new Date());
        this.loadUptime();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load system status:', err);
        this.error.set('Unable to retrieve system status. The system may be experiencing issues.');
        this.loading.set(false);
      }
    });
  }

  loadUptime() {
    this.http.get<UptimeInfo>(`${this.apiUrl}/system-status/uptime`).subscribe({
      next: (uptime) => {
        this.uptimeInfo.set(uptime);
      },
      error: (err) => {
        console.error('Failed to load uptime:', err);
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'operational':
        return 'status-operational';
      case 'degraded':
        return 'status-degraded';
      case 'down':
        return 'status-down';
      default:
        return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'operational':
        return '✓';
      case 'degraded':
        return '⚠';
      case 'down':
        return '✗';
      default:
        return '?';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'operational':
        return 'All Systems Operational';
      case 'degraded':
        return 'Degraded Performance';
      case 'down':
        return 'System Outage';
      default:
        return 'Unknown Status';
    }
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  refresh() {
    this.loadSystemStatus();
  }

  calculateUptime(): number {
    const uptime = this.uptimeInfo()?.uptime.seconds || 0;
    const totalSeconds = 30 * 24 * 60 * 60; // 30 days
    return Math.min((uptime / totalSeconds) * 100, 99.99);
  }
}

