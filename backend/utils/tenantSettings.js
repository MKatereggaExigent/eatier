const pool = require('../config/database');

/**
 * Utility functions for reading tenant settings from tenants.settings JSONB column
 */

// Cache for tenant settings (5 minute TTL)
const settingsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get tenant settings from database
 * @param {string} tenantSlug - Tenant slug (default: 'itiyum')
 * @returns {Promise<Object>} Tenant settings object
 */
async function getTenantSettings(tenantSlug = 'itiyum') {
  const cacheKey = `tenant_settings_${tenantSlug}`;
  
  // Check cache
  const cached = settingsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.settings;
  }

  try {
    const result = await pool.query(
      'SELECT settings FROM tenants WHERE slug = $1',
      [tenantSlug]
    );

    if (result.rows.length === 0) {
      return {};
    }

    const settings = result.rows[0].settings || {};
    
    // Cache the settings
    settingsCache.set(cacheKey, {
      settings,
      timestamp: Date.now()
    });

    return settings;
  } catch (error) {
    console.error('Error fetching tenant settings:', error);
    return {};
  }
}

/**
 * Get a specific setting value
 * @param {string} key - Setting key (e.g., 'maintenance_mode', 'allow_registrations')
 * @param {*} defaultValue - Default value if setting not found
 * @param {string} tenantSlug - Tenant slug
 * @returns {Promise<*>} Setting value
 */
async function getSetting(key, defaultValue = null, tenantSlug = 'itiyum') {
  const settings = await getTenantSettings(tenantSlug);
  return settings[key] !== undefined ? settings[key] : defaultValue;
}

/**
 * Check if maintenance mode is enabled
 * @param {string} tenantSlug - Tenant slug
 * @returns {Promise<boolean>}
 */
async function isMaintenanceMode(tenantSlug = 'itiyum') {
  return await getSetting('maintenance_mode', false, tenantSlug);
}

/**
 * Check if registrations are allowed
 * @param {string} tenantSlug - Tenant slug
 * @returns {Promise<boolean>}
 */
async function areRegistrationsAllowed(tenantSlug = 'itiyum') {
  return await getSetting('allow_registrations', true, tenantSlug);
}

/**
 * Get password requirements
 * @param {string} tenantSlug - Tenant slug
 * @returns {Promise<Object>}
 */
async function getPasswordRequirements(tenantSlug = 'itiyum') {
  const settings = await getTenantSettings(tenantSlug);
  return {
    minLength: settings.password_min_length || 8,
    requireUppercase: settings.password_require_uppercase !== false,
    requireLowercase: settings.password_require_lowercase !== false,
    requireNumber: settings.password_require_number !== false,
    requireSpecial: settings.password_require_special || false
  };
}

/**
 * Get security settings
 * @param {string} tenantSlug - Tenant slug
 * @returns {Promise<Object>}
 */
async function getSecuritySettings(tenantSlug = 'itiyum') {
  const settings = await getTenantSettings(tenantSlug);
  return {
    sessionTimeout: settings.session_timeout || 30,
    maxLoginAttempts: settings.max_login_attempts || 5,
    lockoutDuration: settings.lockout_duration || 15,
    twoFactorEnabled: settings.two_factor_enabled || false
  };
}

/**
 * Get booking settings
 * @param {string} tenantSlug - Tenant slug
 * @returns {Promise<Object>}
 */
async function getBookingSettings(tenantSlug = 'itiyum') {
  const settings = await getTenantSettings(tenantSlug);
  return {
    autoConfirmBookings: settings.auto_confirm_bookings || false,
    bookingCancellationHours: settings.booking_cancellation_hours || 24,
    maxAdvanceBookingDays: settings.max_advance_booking_days || 90,
    requirePaymentUpfront: settings.require_payment_upfront || false,
    allowDoubleBooking: settings.allow_double_booking || false
  };
}

/**
 * Get business settings
 * @param {string} tenantSlug - Tenant slug
 * @returns {Promise<Object>}
 */
async function getBusinessSettings(tenantSlug = 'itiyum') {
  const settings = await getTenantSettings(tenantSlug);
  return {
    requireVerification: settings.require_verification !== false,
    autoApproveBusinesses: settings.auto_approve_businesses || false,
    maxBusinessesPerUser: settings.max_businesses_per_user || 5,
    requireBusinessDocuments: settings.require_business_documents !== false
  };
}

/**
 * Clear settings cache
 */
function clearCache() {
  settingsCache.clear();
}

/**
 * Clear cache for specific tenant
 * @param {string} tenantSlug - Tenant slug
 */
function clearTenantCache(tenantSlug = 'itiyum') {
  const cacheKey = `tenant_settings_${tenantSlug}`;
  settingsCache.delete(cacheKey);
}

module.exports = {
  getTenantSettings,
  getSetting,
  isMaintenanceMode,
  areRegistrationsAllowed,
  getPasswordRequirements,
  getSecuritySettings,
  getBookingSettings,
  getBusinessSettings,
  clearCache,
  clearTenantCache
};

