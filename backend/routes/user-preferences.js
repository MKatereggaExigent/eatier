const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// ============================================================================
// GET /api/user-preferences - Get current user's preferences
// ============================================================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(
      `SELECT * FROM user_preferences WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    if (result.rows.length === 0) {
      // Return default preferences if none exist
      return res.json({
        userId,
        cuisinePreferences: [],
        dietaryRestrictions: [],
        allergies: [],
        priceRangeMin: 0,
        priceRangeMax: 1000,
        maxDistanceKm: 25,
        preferredCity: null,
        preferredCountry: null,
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        notificationFrequency: 'daily',
        adventurousness: 'moderate'
      });
    }

    const prefs = result.rows[0];
    res.json({
      id: prefs.id,
      userId: prefs.user_id,
      cuisinePreferences: prefs.cuisine_preferences || [],
      dietaryRestrictions: prefs.dietary_restrictions || [],
      allergies: prefs.allergies || [],
      priceRangeMin: parseFloat(prefs.price_range_min) || 0,
      priceRangeMax: parseFloat(prefs.price_range_max) || 1000,
      maxDistanceKm: prefs.max_distance_km || 25,
      preferredLocationLat: prefs.preferred_location_lat,
      preferredLocationLng: prefs.preferred_location_lng,
      preferredCity: prefs.preferred_city,
      preferredCountry: prefs.preferred_country,
      emailNotifications: prefs.email_notifications,
      pushNotifications: prefs.push_notifications,
      smsNotifications: prefs.sms_notifications,
      notificationFrequency: prefs.notification_frequency,
      adventurousness: prefs.adventurousness,
      createdAt: prefs.created_at,
      updatedAt: prefs.updated_at
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// ============================================================================
// PUT /api/user-preferences - Update current user's preferences
// ============================================================================
router.put('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;
    const {
      cuisinePreferences,
      dietaryRestrictions,
      allergies,
      priceRangeMin,
      priceRangeMax,
      maxDistanceKm,
      preferredLocationLat,
      preferredLocationLng,
      preferredCity,
      preferredCountry,
      emailNotifications,
      pushNotifications,
      smsNotifications,
      notificationFrequency,
      adventurousness
    } = req.body;

    const result = await pool.query(
      `INSERT INTO user_preferences (
        user_id, tenant_id, cuisine_preferences, dietary_restrictions, allergies,
        price_range_min, price_range_max, max_distance_km,
        preferred_location_lat, preferred_location_lng, preferred_city, preferred_country,
        email_notifications, push_notifications, sms_notifications, notification_frequency,
        adventurousness, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, tenant_id) DO UPDATE SET
        cuisine_preferences = COALESCE($3, user_preferences.cuisine_preferences),
        dietary_restrictions = COALESCE($4, user_preferences.dietary_restrictions),
        allergies = COALESCE($5, user_preferences.allergies),
        price_range_min = COALESCE($6, user_preferences.price_range_min),
        price_range_max = COALESCE($7, user_preferences.price_range_max),
        max_distance_km = COALESCE($8, user_preferences.max_distance_km),
        preferred_location_lat = COALESCE($9, user_preferences.preferred_location_lat),
        preferred_location_lng = COALESCE($10, user_preferences.preferred_location_lng),
        preferred_city = COALESCE($11, user_preferences.preferred_city),
        preferred_country = COALESCE($12, user_preferences.preferred_country),
        email_notifications = COALESCE($13, user_preferences.email_notifications),
        push_notifications = COALESCE($14, user_preferences.push_notifications),
        sms_notifications = COALESCE($15, user_preferences.sms_notifications),
        notification_frequency = COALESCE($16, user_preferences.notification_frequency),
        adventurousness = COALESCE($17, user_preferences.adventurousness),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        userId, tenantId, cuisinePreferences, dietaryRestrictions, allergies,
        priceRangeMin, priceRangeMax, maxDistanceKm,
        preferredLocationLat, preferredLocationLng, preferredCity, preferredCountry,
        emailNotifications, pushNotifications, smsNotifications, notificationFrequency,
        adventurousness
      ]
    );

    const prefs = result.rows[0];
    res.json({
      message: 'Preferences updated successfully',
      preferences: {
        id: prefs.id,
        userId: prefs.user_id,
        cuisinePreferences: prefs.cuisine_preferences || [],
        dietaryRestrictions: prefs.dietary_restrictions || [],
        allergies: prefs.allergies || [],
        priceRangeMin: parseFloat(prefs.price_range_min) || 0,
        priceRangeMax: parseFloat(prefs.price_range_max) || 1000,
        maxDistanceKm: prefs.max_distance_km || 25,
        preferredCity: prefs.preferred_city,
        preferredCountry: prefs.preferred_country,
        emailNotifications: prefs.email_notifications,
        pushNotifications: prefs.push_notifications,
        smsNotifications: prefs.sms_notifications,
        notificationFrequency: prefs.notification_frequency,
        adventurousness: prefs.adventurousness
      }
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

module.exports = router;

