const pool = require('../config/database');

class SettingsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get a setting value by key
   * @param {string} tenantId - Tenant ID
   * @param {string} key - Setting key
   * @param {any} defaultValue - Default value if setting not found
   * @returns {Promise<any>} Setting value
   */
  async getSetting(tenantId, key, defaultValue = null) {
    const cacheKey = `${tenantId}:${key}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.value;
      }
    }

    try {
      const result = await pool.query(
        'SELECT value, type FROM settings WHERE tenant_id = $1 AND key = $2',
        [tenantId, key]
      );

      if (result.rows.length === 0) {
        return defaultValue;
      }

      const setting = result.rows[0];
      const value = this.parseValue(setting.value, setting.type);

      // Cache the value
      this.cache.set(cacheKey, {
        value,
        timestamp: Date.now()
      });

      return value;
    } catch (error) {
      console.error('Error getting setting:', error);
      return defaultValue;
    }
  }

  /**
   * Get multiple settings by category
   * @param {string} tenantId - Tenant ID
   * @param {string} category - Setting category
   * @returns {Promise<Object>} Settings object
   */
  async getSettingsByCategory(tenantId, category) {
    try {
      const result = await pool.query(
        'SELECT key, value, type FROM settings WHERE tenant_id = $1 AND category = $2',
        [tenantId, category]
      );

      const settings = {};
      result.rows.forEach(row => {
        settings[row.key] = this.parseValue(row.value, row.type);
      });

      return settings;
    } catch (error) {
      console.error('Error getting settings by category:', error);
      return {};
    }
  }

  /**
   * Get all settings for a tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} All settings grouped by category
   */
  async getAllSettings(tenantId) {
    try {
      const result = await pool.query(
        'SELECT category, key, value, type, description, is_public FROM settings WHERE tenant_id = $1 ORDER BY category, key',
        [tenantId]
      );

      const settings = {};
      result.rows.forEach(row => {
        if (!settings[row.category]) {
          settings[row.category] = {};
        }
        settings[row.category][row.key] = {
          value: this.parseValue(row.value, row.type),
          type: row.type,
          description: row.description,
          isPublic: row.is_public
        };
      });

      return settings;
    } catch (error) {
      console.error('Error getting all settings:', error);
      return {};
    }
  }

  /**
   * Update a setting value
   * @param {string} tenantId - Tenant ID
   * @param {string} key - Setting key
   * @param {any} value - New value
   * @returns {Promise<boolean>} Success status
   */
  async updateSetting(tenantId, key, value) {
    try {
      // Get the setting type first
      const typeResult = await pool.query(
        'SELECT type FROM settings WHERE tenant_id = $1 AND key = $2',
        [tenantId, key]
      );

      if (typeResult.rows.length === 0) {
        return false;
      }

      const type = typeResult.rows[0].type;
      const stringValue = this.stringifyValue(value, type);

      await pool.query(
        'UPDATE settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $2 AND key = $3',
        [stringValue, tenantId, key]
      );

      // Clear cache for this setting
      const cacheKey = `${tenantId}:${key}`;
      this.cache.delete(cacheKey);

      return true;
    } catch (error) {
      console.error('Error updating setting:', error);
      return false;
    }
  }

  /**
   * Parse setting value based on type
   * @param {string} value - String value from database
   * @param {string} type - Value type
   * @returns {any} Parsed value
   */
  parseValue(value, type) {
    switch (type) {
      case 'boolean':
        return value === 'true';
      case 'number':
        return parseFloat(value);
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      case 'string':
      default:
        return value;
    }
  }

  /**
   * Convert value to string for database storage
   * @param {any} value - Value to stringify
   * @param {string} type - Value type
   * @returns {string} String value
   */
  stringifyValue(value, type) {
    switch (type) {
      case 'boolean':
        return value ? 'true' : 'false';
      case 'number':
        return value.toString();
      case 'json':
        return JSON.stringify(value);
      case 'string':
      default:
        return value.toString();
    }
  }

  /**
   * Clear all cached settings
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Clear cached settings for a specific tenant
   * @param {string} tenantId - Tenant ID
   */
  clearTenantCache(tenantId) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Check if maintenance mode is enabled
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} True if maintenance mode is enabled
   */
  async isMaintenanceMode(tenantId) {
    return await this.getSetting(tenantId, 'maintenance_mode', false);
  }

  /**
   * Check if registrations are allowed
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} True if registrations are allowed
   */
  async areRegistrationsAllowed(tenantId) {
    return await this.getSetting(tenantId, 'allow_registrations', true);
  }

  /**
   * Check if RBAC is enabled
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} True if RBAC is enabled
   */
  async isRBACEnabled(tenantId) {
    return await this.getSetting(tenantId, 'enable_rbac', true);
  }

  /**
   * Get password requirements
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Password requirements
   */
  async getPasswordRequirements(tenantId) {
    return {
      minLength: await this.getSetting(tenantId, 'password_min_length', 8),
      requireUppercase: await this.getSetting(tenantId, 'password_require_uppercase', true),
      requireLowercase: await this.getSetting(tenantId, 'password_require_lowercase', true),
      requireNumber: await this.getSetting(tenantId, 'password_require_number', true),
      requireSpecial: await this.getSetting(tenantId, 'password_require_special', false)
    };
  }

  /**
   * Get platform fee percentage
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<number>} Platform fee percentage
   */
  async getPlatformFeePercentage(tenantId) {
    return await this.getSetting(tenantId, 'platform_fee_percentage', 10);
  }

  /**
   * Check if auto-confirm bookings is enabled
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} True if auto-confirm is enabled
   */
  async isAutoConfirmBookings(tenantId) {
    return await this.getSetting(tenantId, 'auto_confirm_bookings', false);
  }

  /**
   * Get booking cancellation hours
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<number>} Cancellation hours
   */
  async getBookingCancellationHours(tenantId) {
    return await this.getSetting(tenantId, 'booking_cancellation_hours', 24);
  }
}

// Export singleton instance
module.exports = new SettingsService();

