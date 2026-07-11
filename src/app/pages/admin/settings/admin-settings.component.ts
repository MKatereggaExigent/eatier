import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface TenantSettings {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  updated_at: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  channel: string;
  is_active: boolean;
  created_at: string;
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
  activeTab = signal<string>('general');

  // Settings data
  tenantSettings = signal<TenantSettings | null>(null);
  notificationTemplates = signal<NotificationTemplate[]>([]);

  // General Settings
  platformName = signal<string>('');
  platformSlug = signal<string>('');
  platformDomain = signal<string>('');
  platformLogoUrl = signal<string>('');
  subscriptionPlan = signal<string>('');
  subscriptionStatus = signal<string>('');
  defaultLanguage = signal<string>('en');
  defaultTimezone = signal<string>('UTC');
  defaultCurrency = signal<string>('ZAR');
  maintenanceMode = signal<boolean>(false);
  allowRegistrations = signal<boolean>(true);

  // Security Settings
  sessionTimeout = signal<number>(30);
  passwordMinLength = signal<number>(8);
  maxLoginAttempts = signal<number>(5);
  lockoutDuration = signal<number>(15);
  twoFactorEnabled = signal<boolean>(false);
  passwordRequireUppercase = signal<boolean>(true);
  passwordRequireLowercase = signal<boolean>(true);
  passwordRequireNumber = signal<boolean>(true);
  passwordRequireSpecial = signal<boolean>(false);

  // Notification Settings
  emailNotifications = signal<boolean>(true);
  pushNotifications = signal<boolean>(true);
  smsNotifications = signal<boolean>(false);
  adminEmail = signal<string>('admin@itiyum.com');
  notificationFrequency = signal<string>('realtime');

  // Booking Settings
  autoConfirmBookings = signal<boolean>(false);
  bookingCancellationHours = signal<number>(24);
  maxAdvanceBookingDays = signal<number>(90);
  requirePaymentUpfront = signal<boolean>(false);
  allowDoubleBooking = signal<boolean>(false);

  // Business Settings
  requireVerification = signal<boolean>(true);
  autoApproveBusinesses = signal<boolean>(false);
  maxBusinessesPerUser = signal<number>(5);
  requireBusinessDocuments = signal<boolean>(true);

  // Computed values for notification templates
  activeNotificationTemplates = computed(() =>
    this.notificationTemplates().filter(t => t.is_active).length
  );
  totalNotificationTemplates = computed(() =>
    this.notificationTemplates().length
  );

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.isLoading.set(true);

    this.adminService.getSettings().subscribe({
      next: (response) => {
        this.tenantSettings.set(response.tenant);
        this.notificationTemplates.set(response.notificationTemplates || []);

        // General Settings
        this.platformName.set(response.settings.general.platform_name || '');
        this.platformSlug.set(response.settings.general.platform_slug || '');
        this.platformDomain.set(response.settings.general.platform_domain || '');
        this.platformLogoUrl.set(response.settings.general.logo_url || '');
        this.subscriptionPlan.set(response.settings.general.subscription_plan || '');
        this.subscriptionStatus.set(response.settings.general.subscription_status || '');
        this.defaultLanguage.set(response.settings.general.default_language || 'en');
        this.defaultTimezone.set(response.settings.general.default_timezone || 'UTC');
        this.defaultCurrency.set(response.settings.general.default_currency || 'ZAR');
        this.maintenanceMode.set(response.settings.general.maintenance_mode || false);
        this.allowRegistrations.set(response.settings.general.allow_registrations !== false);

        // Security Settings
        this.sessionTimeout.set(response.settings.security.session_timeout || 30);
        this.passwordMinLength.set(response.settings.security.password_min_length || 8);
        this.maxLoginAttempts.set(response.settings.security.max_login_attempts || 5);
        this.lockoutDuration.set(response.settings.security.lockout_duration || 15);
        this.twoFactorEnabled.set(response.settings.security.two_factor_enabled || false);
        this.passwordRequireUppercase.set(response.settings.security.password_require_uppercase !== false);
        this.passwordRequireLowercase.set(response.settings.security.password_require_lowercase !== false);
        this.passwordRequireNumber.set(response.settings.security.password_require_number !== false);
        this.passwordRequireSpecial.set(response.settings.security.password_require_special || false);

        // Notification Settings
        this.emailNotifications.set(response.settings.notifications.email_notifications !== false);
        this.pushNotifications.set(response.settings.notifications.push_notifications !== false);
        this.smsNotifications.set(response.settings.notifications.sms_notifications || false);
        this.adminEmail.set(response.settings.notifications.admin_email || 'admin@itiyum.com');
        this.notificationFrequency.set(response.settings.notifications.notification_frequency || 'realtime');

        // Booking Settings
        this.autoConfirmBookings.set(response.settings.bookings.auto_confirm_bookings || false);
        this.bookingCancellationHours.set(response.settings.bookings.booking_cancellation_hours || 24);
        this.maxAdvanceBookingDays.set(response.settings.bookings.max_advance_booking_days || 90);
        this.requirePaymentUpfront.set(response.settings.bookings.require_payment_upfront || false);
        this.allowDoubleBooking.set(response.settings.bookings.allow_double_booking || false);

        // Business Settings
        this.requireVerification.set(response.settings.businesses.require_verification !== false);
        this.autoApproveBusinesses.set(response.settings.businesses.auto_approve_businesses || false);
        this.maxBusinessesPerUser.set(response.settings.businesses.max_businesses_per_user || 5);
        this.requireBusinessDocuments.set(response.settings.businesses.require_business_documents !== false);

        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading settings:', error);
        this.isLoading.set(false);
      }
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
  }

  saveGeneralSettings(): void {
    this.isSaving.set(true);

    const data = {
      name: this.platformName(),
      domain: this.platformDomain(),
      logo_url: this.platformLogoUrl(),
      settings: {
        default_language: this.defaultLanguage(),
        default_timezone: this.defaultTimezone(),
        default_currency: this.defaultCurrency(),
        maintenance_mode: this.maintenanceMode(),
        allow_registrations: this.allowRegistrations()
      }
    };

    this.adminService.updateSettings(data).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showSuccessMessage.set(true);
        setTimeout(() => this.showSuccessMessage.set(false), 3000);
      },
      error: (error) => {
        console.error('Error saving settings:', error);
        this.isSaving.set(false);
      }
    });
  }

  saveSecuritySettings(): void {
    this.isSaving.set(true);

    const data = {
      settings: {
        session_timeout: this.sessionTimeout(),
        password_min_length: this.passwordMinLength(),
        max_login_attempts: this.maxLoginAttempts(),
        lockout_duration: this.lockoutDuration(),
        two_factor_enabled: this.twoFactorEnabled(),
        password_require_uppercase: this.passwordRequireUppercase(),
        password_require_lowercase: this.passwordRequireLowercase(),
        password_require_number: this.passwordRequireNumber(),
        password_require_special: this.passwordRequireSpecial()
      }
    };

    this.adminService.updateSettings(data).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showSuccessMessage.set(true);
        setTimeout(() => this.showSuccessMessage.set(false), 3000);
      },
      error: (error) => {
        console.error('Error saving settings:', error);
        this.isSaving.set(false);
      }
    });
  }

  saveNotificationSettings(): void {
    this.isSaving.set(true);

    const data = {
      settings: {
        email_notifications: this.emailNotifications(),
        push_notifications: this.pushNotifications(),
        sms_notifications: this.smsNotifications(),
        admin_email: this.adminEmail(),
        notification_frequency: this.notificationFrequency()
      }
    };

    this.adminService.updateSettings(data).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showSuccessMessage.set(true);
        setTimeout(() => this.showSuccessMessage.set(false), 3000);
      },
      error: (error) => {
        console.error('Error saving settings:', error);
        this.isSaving.set(false);
      }
    });
  }

  saveBookingSettings(): void {
    this.isSaving.set(true);

    const data = {
      settings: {
        auto_confirm_bookings: this.autoConfirmBookings(),
        booking_cancellation_hours: this.bookingCancellationHours(),
        max_advance_booking_days: this.maxAdvanceBookingDays(),
        require_payment_upfront: this.requirePaymentUpfront(),
        allow_double_booking: this.allowDoubleBooking()
      }
    };

    this.adminService.updateSettings(data).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showSuccessMessage.set(true);
        setTimeout(() => this.showSuccessMessage.set(false), 3000);
      },
      error: (error) => {
        console.error('Error saving settings:', error);
        this.isSaving.set(false);
      }
    });
  }

  saveBusinessSettings(): void {
    this.isSaving.set(true);

    const data = {
      settings: {
        require_verification: this.requireVerification(),
        auto_approve_businesses: this.autoApproveBusinesses(),
        max_businesses_per_user: this.maxBusinessesPerUser(),
        require_business_documents: this.requireBusinessDocuments()
      }
    };

    this.adminService.updateSettings(data).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showSuccessMessage.set(true);
        setTimeout(() => this.showSuccessMessage.set(false), 3000);
      },
      error: (error) => {
        console.error('Error saving settings:', error);
        this.isSaving.set(false);
      }
    });
  }

}
