import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

interface SettingCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  settings: Setting[];
}

interface Setting {
  id: string;
  name: string;
  description: string;
  type: 'toggle' | 'text' | 'number' | 'select' | 'textarea';
  value: any;
  options?: { label: string; value: any }[];
  required?: boolean;
}

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="admin-settings" role="main" aria-label="Admin Settings">
      <header class="settings-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              <span class="title-icon">⚙️</span>
              Platform Settings
            </h1>
            <p class="page-subtitle">
              Configure platform-wide settings and system preferences
            </p>
          </div>
        </div>

        <!-- Settings Overview -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">🔧</div>
            <div class="stat-content">
              <div class="stat-number">{{ getTotalSettings() }}</div>
              <div class="stat-label">Total Settings</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <div class="stat-number">{{ getActiveSettings() }}</div>
              <div class="stat-label">Active Features</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">🔒</div>
            <div class="stat-content">
              <div class="stat-number">{{ getSecuritySettings() }}</div>
              <div class="stat-label">Security Settings</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">🔔</div>
            <div class="stat-content">
              <div class="stat-number">{{ getNotificationSettings() }}</div>
              <div class="stat-label">Notifications</div>
            </div>
          </div>
        </div>
      </header>

      <!-- Settings Categories -->
      <div class="settings-content">
        <div class="settings-grid">
          @for (category of settingCategories(); track category.id) {
            <div class="settings-category">
              <div class="category-header">
                <div class="category-icon">{{ category.icon }}</div>
                <div class="category-info">
                  <h3 class="category-name">{{ category.name }}</h3>
                  <p class="category-description">{{ category.description }}</p>
                </div>
              </div>

              <div class="category-settings">
                @for (setting of category.settings; track setting.id) {
                  <div class="setting-item">
                    <div class="setting-info">
                      <label class="setting-name" [for]="setting.id">{{ setting.name }}</label>
                      <p class="setting-description">{{ setting.description }}</p>
                    </div>

                    <div class="setting-control">
                      @switch (setting.type) {
                        @case ('toggle') {
                          <label class="toggle-switch">
                            <input
                              type="checkbox"
                              [id]="setting.id"
                              [(ngModel)]="setting.value"
                              (change)="updateSetting(setting)">
                            <span class="toggle-slider"></span>
                          </label>
                        }

                        @case ('text') {
                          <input
                            type="text"
                            [id]="setting.id"
                            class="setting-input"
                            [(ngModel)]="setting.value"
                            (blur)="updateSetting(setting)"
                            [required]="setting.required || false">
                        }

                        @case ('number') {
                          <input
                            type="number"
                            [id]="setting.id"
                            class="setting-input"
                            [(ngModel)]="setting.value"
                            (blur)="updateSetting(setting)"
                            [required]="setting.required || false">
                        }

                        @case ('select') {
                          <select
                            [id]="setting.id"
                            class="setting-select"
                            [(ngModel)]="setting.value"
                            (change)="updateSetting(setting)">
                            @for (option of setting.options; track option.value) {
                              <option [value]="option.value">{{ option.label }}</option>
                            }
                          </select>
                        }

                        @case ('textarea') {
                          <textarea
                            [id]="setting.id"
                            class="setting-textarea"
                            [(ngModel)]="setting.value"
                            (blur)="updateSetting(setting)"
                            [required]="setting.required || false"
                            rows="3">
                          </textarea>
                        }
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Save Actions -->
        <div class="settings-actions">
          <button
            type="button"
            class="btn-primary save-btn"
            (click)="saveAllSettings()">
            💾 Save All Changes
          </button>

          <button
            type="button"
            class="btn-secondary reset-btn"
            (click)="resetToDefaults()">
            🔄 Reset to Defaults
          </button>

          <button
            type="button"
            class="btn-secondary export-btn"
            (click)="exportSettings()">
            📤 Export Settings
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-settings {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
      font-family: 'Inter', sans-serif;
    }
  `]
})
export class AdminSettingsComponent {
  private authService = inject(AuthService);
  currentUser = this.authService.currentUser;

  // Mock settings data
  settingCategories = signal<SettingCategory[]>([
    {
      id: 'general',
      name: 'General Settings',
      description: 'Basic platform configuration and preferences',
      icon: '⚙️',
      settings: [
        {
          id: 'platform_name',
          name: 'Platform Name',
          description: 'The name displayed across the platform',
          type: 'text',
          value: 'Eatier',
          required: true
        },
        {
          id: 'maintenance_mode',
          name: 'Maintenance Mode',
          description: 'Enable maintenance mode to restrict access',
          type: 'toggle',
          value: false
        }
      ]
    },
    {
      id: 'security',
      name: 'Security Settings',
      description: 'Security and authentication configuration',
      icon: '🔒',
      settings: [
        {
          id: 'two_factor_required',
          name: 'Require Two-Factor Authentication',
          description: 'Force all users to enable 2FA',
          type: 'toggle',
          value: false
        },
        {
          id: 'session_timeout',
          name: 'Session Timeout (minutes)',
          description: 'Automatic logout after inactivity',
          type: 'number',
          value: 60
        }
      ]
    }
  ]);

  // Computed methods
  getTotalSettings(): number {
    return this.settingCategories().reduce((total, category) => total + category.settings.length, 0);
  }

  getActiveSettings(): number {
    return this.settingCategories().reduce((total, category) =>
      total + category.settings.filter(s => s.type === 'toggle' && s.value === true).length, 0);
  }

  getSecuritySettings(): number {
    const securityCategory = this.settingCategories().find(c => c.id === 'security');
    return securityCategory ? securityCategory.settings.length : 0;
  }

  getNotificationSettings(): number {
    return 5; // Mock value
  }

  // Action methods
  updateSetting(setting: Setting): void {
    console.log('Update setting:', setting.name, setting.value);
  }

  saveAllSettings(): void {
    console.log('Save all settings');
  }

  resetToDefaults(): void {
    console.log('Reset to defaults');
  }

  exportSettings(): void {
    console.log('Export settings');
  }
}
