import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';

interface SettingCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  settings: Setting[];
}

interface Setting {
  id: string;
  key: string;
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
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.scss']
})
export class AdminSettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private adminService = inject(AdminService);
  currentUser = this.authService.currentUser;

  // State signals
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  showSuccessMessage = signal<boolean>(false);

  // Settings data
  settingCategories = signal<SettingCategory[]>([]);

  ngOnInit(): void {
    this.loadSettings();
  }

  // Load settings
  loadSettings(): void {
    this.isLoading.set(true);

    this.adminService.getSettings().subscribe({
      next: (response) => {
        this.mapSettingsToCategories(response.settings);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading settings:', error);
        this.isLoading.set(false);
      }
    });
  }

  // Map API settings to frontend categories
  mapSettingsToCategories(apiSettings: any): void {
    const categories: SettingCategory[] = [];

    // General Settings
    if (apiSettings.general) {
      categories.push({
        id: 'general',
        name: 'General Settings',
        description: 'Basic platform configuration and preferences',
        icon: '⚙️',
        settings: this.mapSettings(apiSettings.general, {
          platform_name: { name: 'Platform Name', type: 'text', required: true },
          platform_tagline: { name: 'Platform Tagline', type: 'text' },
          maintenance_mode: { name: 'Maintenance Mode', type: 'toggle' },
          allow_registrations: { name: 'Allow New Registrations', type: 'toggle' },
          default_language: { name: 'Default Language', type: 'select', options: [
            { label: 'English', value: 'en' },
            { label: 'French', value: 'fr' },
            { label: 'Swahili', value: 'sw' }
          ]},
          default_timezone: { name: 'Default Timezone', type: 'text' },
          default_currency: { name: 'Default Currency', type: 'select', options: [
            { label: 'UGX - Ugandan Shilling', value: 'UGX' },
            { label: 'USD - US Dollar', value: 'USD' },
            { label: 'EUR - Euro', value: 'EUR' }
          ]}
        })
      });
    }

    // Security Settings
    if (apiSettings.security) {
      categories.push({
        id: 'security',
        name: 'Security Settings',
        description: 'Security and authentication configuration',
        icon: '🔒',
        settings: this.mapSettings(apiSettings.security, {
          two_factor_required: { name: 'Require Two-Factor Authentication', type: 'toggle' },
          session_timeout: { name: 'Session Timeout (minutes)', type: 'number' },
          password_min_length: { name: 'Minimum Password Length', type: 'number' },
          max_login_attempts: { name: 'Max Login Attempts', type: 'number' },
          lockout_duration: { name: 'Lockout Duration (minutes)', type: 'number' },
          password_require_uppercase: { name: 'Require Uppercase Letter', type: 'toggle' },
          password_require_lowercase: { name: 'Require Lowercase Letter', type: 'toggle' },
          password_require_number: { name: 'Require Number', type: 'toggle' },
          password_require_special: { name: 'Require Special Character', type: 'toggle' }
        })
      });
    }

    // Multi-tenancy Settings
    if (apiSettings.multi_tenancy) {
      categories.push({
        id: 'multi_tenancy',
        name: 'Multi-Tenancy Settings',
        description: 'Tenant management and isolation settings',
        icon: '🏢',
        settings: this.mapSettings(apiSettings.multi_tenancy, {
          allow_tenant_creation: { name: 'Allow Tenant Creation', type: 'toggle' },
          tenant_isolation_strict: { name: 'Strict Tenant Isolation', type: 'toggle' },
          max_tenants: { name: 'Maximum Tenants', type: 'number' },
          tenant_auto_approve: { name: 'Auto-Approve Tenants', type: 'toggle' },
          cross_tenant_search: { name: 'Cross-Tenant Search', type: 'toggle' }
        })
      });
    }

    // RBAC Settings
    if (apiSettings.rbac) {
      categories.push({
        id: 'rbac',
        name: 'RBAC Settings',
        description: 'Role-based access control configuration',
        icon: '👥',
        settings: this.mapSettings(apiSettings.rbac, {
          enable_rbac: { name: 'Enable RBAC', type: 'toggle' },
          default_user_role: { name: 'Default User Role', type: 'text' },
          allow_role_self_assignment: { name: 'Allow Self Role Assignment', type: 'toggle' },
          max_roles_per_user: { name: 'Max Roles Per User', type: 'number' },
          permission_inheritance: { name: 'Permission Inheritance', type: 'toggle' },
          audit_permission_changes: { name: 'Audit Permission Changes', type: 'toggle' }
        })
      });
    }

    // Notification Settings
    if (apiSettings.notifications) {
      categories.push({
        id: 'notifications',
        name: 'Notification Settings',
        description: 'Configure email and push notifications',
        icon: '🔔',
        settings: this.mapSettings(apiSettings.notifications, {
          email_notifications: { name: 'Email Notifications', type: 'toggle' },
          push_notifications: { name: 'Push Notifications', type: 'toggle' },
          sms_notifications: { name: 'SMS Notifications', type: 'toggle' },
          notification_frequency: { name: 'Notification Frequency', type: 'select', options: [
            { label: 'Real-time', value: 'realtime' },
            { label: 'Daily', value: 'daily' },
            { label: 'Weekly', value: 'weekly' },
            { label: 'Never', value: 'never' }
          ]},
          admin_email: { name: 'Admin Email', type: 'text' }
        })
      });
    }

    // Booking Settings
    if (apiSettings.bookings) {
      categories.push({
        id: 'bookings',
        name: 'Booking Settings',
        description: 'Configure booking and reservation settings',
        icon: '📅',
        settings: this.mapSettings(apiSettings.bookings, {
          auto_confirm_bookings: { name: 'Auto-Confirm Bookings', type: 'toggle' },
          booking_cancellation_hours: { name: 'Cancellation Window (hours)', type: 'number' },
          max_advance_booking_days: { name: 'Max Advance Booking (days)', type: 'number' },
          require_payment_upfront: { name: 'Require Payment Upfront', type: 'toggle' },
          allow_double_booking: { name: 'Allow Double Booking', type: 'toggle' }
        })
      });
    }

    // Payment Settings
    if (apiSettings.payments) {
      categories.push({
        id: 'payments',
        name: 'Payment Settings',
        description: 'Configure payment processing and fees',
        icon: '💳',
        settings: this.mapSettings(apiSettings.payments, {
          platform_fee_percentage: { name: 'Platform Fee (%)', type: 'number' },
          payment_methods: { name: 'Accepted Payment Methods', type: 'select', options: [
            { label: 'All Methods', value: 'all' },
            { label: 'Credit/Debit Cards Only', value: 'cards' },
            { label: 'Mobile Money Only', value: 'mobile' }
          ]},
          auto_payout: { name: 'Automatic Payouts', type: 'toggle' },
          payout_delay_days: { name: 'Payout Delay (days)', type: 'number' },
          minimum_payout_amount: { name: 'Minimum Payout Amount', type: 'number' }
        })
      });
    }

    // Business Settings
    if (apiSettings.businesses) {
      categories.push({
        id: 'businesses',
        name: 'Business Settings',
        description: 'Configure business registration and verification',
        icon: '🏪',
        settings: this.mapSettings(apiSettings.businesses, {
          require_verification: { name: 'Require Verification', type: 'toggle' },
          auto_approve_businesses: { name: 'Auto-Approve Businesses', type: 'toggle' },
          max_businesses_per_user: { name: 'Max Businesses Per User', type: 'number' },
          require_business_documents: { name: 'Require Business Documents', type: 'toggle' }
        })
      });
    }

    this.settingCategories.set(categories);
  }

  // Helper to map settings
  mapSettings(apiSettings: any, mapping: any): Setting[] {
    const settings: Setting[] = [];

    for (const [key, config] of Object.entries(mapping)) {
      const apiSetting = apiSettings.find((s: any) => s.key === key);
      if (apiSetting) {
        settings.push({
          id: apiSetting.id,
          key: apiSetting.key,
          name: (config as any).name,
          description: apiSetting.description,
          type: (config as any).type,
          value: apiSetting.value,
          options: (config as any).options,
          required: (config as any).required || false
        });
      }
    }

    return settings;
  }

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
    const notificationCategory = this.settingCategories().find(c => c.id === 'notifications');
    return notificationCategory ? notificationCategory.settings.length : 0;
  }

  // Action methods
  updateSetting(setting: Setting): void {
    this.adminService.updateSetting(setting.id, setting.value).subscribe({
      next: (response) => {
        console.log('Setting updated:', setting.name, setting.value);
      },
      error: (error) => {
        console.error('Error updating setting:', error);
        // Revert the value on error
        this.loadSettings();
      }
    });
  }

  saveAllSettings(): void {
    this.isSaving.set(true);

    // Collect all settings to save
    const allSettings: any[] = [];
    this.settingCategories().forEach(category => {
      category.settings.forEach(setting => {
        allSettings.push({ id: setting.id, value: setting.value });
      });
    });

    // Save all settings sequentially
    let savedCount = 0;
    const saveNext = (index: number) => {
      if (index >= allSettings.length) {
        this.isSaving.set(false);
        this.showSuccessMessage.set(true);

        // Hide success message after 3 seconds
        setTimeout(() => {
          this.showSuccessMessage.set(false);
        }, 3000);

        console.log('All settings saved');
        return;
      }

      const setting = allSettings[index];
      this.adminService.updateSetting(setting.id, setting.value).subscribe({
        next: () => {
          savedCount++;
          saveNext(index + 1);
        },
        error: (error) => {
          console.error('Error saving setting:', error);
          this.isSaving.set(false);
          // Reload settings on error
          this.loadSettings();
        }
      });
    };

    saveNext(0);
  }

  resetToDefaults(): void {
    if (confirm('Are you sure you want to reset all settings to their default values?')) {
      console.log('Reset to defaults');
      // In production, this would reset all settings to defaults
    }
  }

  exportSettings(): void {
    const settingsData = JSON.stringify(this.settingCategories(), null, 2);
    const blob = new Blob([settingsData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `itiyum-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    console.log('Settings exported');
  }
}
