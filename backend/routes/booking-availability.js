const express = require('express');
const pool = require('../config/database');
const router = express.Router();

/**
 * GET /api/booking-availability/tiers
 * Get all booking tier information with benefits
 */
router.get('/tiers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        tier,
        tier_name,
        tier_description,
        tier_color,
        tier_icon,
        benefits,
        priority_level,
        allows_cancellation,
        allows_modification,
        gets_confirmation_priority,
        gets_table_preference,
        gets_special_requests
      FROM booking_tier_benefits
      ORDER BY priority_level ASC
    `);

    res.json({ tiers: result.rows });
  } catch (error) {
    console.error('Error fetching booking tiers:', error);
    res.status(500).json({ error: 'Failed to fetch booking tiers' });
  }
});

/**
 * GET /api/booking-availability/business/:businessId/settings
 * Get capacity settings for a business
 */
router.get('/business/:businessId/settings', async (req, res) => {
  try {
    const { businessId } = req.params;

    const result = await pool.query(`
      SELECT * FROM business_capacity_settings
      WHERE business_id = $1
    `, [businessId]);

    if (result.rows.length === 0) {
      // Return default settings if none exist
      return res.json({
        settings: {
          total_capacity: 50,
          tables_count: 10,
          slot_duration_minutes: 90,
          basic_tier_price: 0.00,
          standard_tier_price: 5.00,
          premium_tier_price: 15.00,
          priority_tier_price: 25.00,
          enable_tier_system: true
        }
      });
    }

    res.json({ settings: result.rows[0] });
  } catch (error) {
    console.error('Error fetching business settings:', error);
    res.status(500).json({ error: 'Failed to fetch business settings' });
  }
});

/**
 * GET /api/booking-availability/business/:businessId/slots
 * Get available time slots for a business on a specific date
 */
router.get('/business/:businessId/slots', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { date, tier = 'basic' } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    // Get or create slots for the date
    const slots = await pool.query(`
      SELECT 
        id,
        slot_date,
        slot_time,
        slot_end_time,
        total_capacity,
        basic_capacity,
        standard_capacity,
        premium_capacity,
        priority_capacity,
        basic_booked,
        standard_booked,
        premium_booked,
        priority_booked,
        total_booked,
        is_available,
        is_blocked,
        block_reason
      FROM booking_time_slots
      WHERE business_id = $1 AND slot_date = $2
      ORDER BY slot_time ASC
    `, [businessId, date]);

    // If no slots exist, generate default slots
    if (slots.rows.length === 0) {
      await generateDefaultSlots(businessId, date);
      // Fetch again
      const newSlots = await pool.query(`
        SELECT * FROM booking_time_slots
        WHERE business_id = $1 AND slot_date = $2
        ORDER BY slot_time ASC
      `, [businessId, date]);
      
      return res.json({ slots: newSlots.rows });
    }

    // Calculate availability for each slot based on tier
    const slotsWithAvailability = slots.rows.map(slot => {
      let availableCapacity = 0;
      let tierCapacity = 0;
      let tierBooked = 0;

      switch (tier) {
        case 'basic':
          tierCapacity = slot.basic_capacity;
          tierBooked = slot.basic_booked;
          break;
        case 'standard':
          tierCapacity = slot.standard_capacity;
          tierBooked = slot.standard_booked;
          break;
        case 'premium':
          tierCapacity = slot.premium_capacity;
          tierBooked = slot.premium_booked;
          break;
        case 'priority':
          tierCapacity = slot.priority_capacity;
          tierBooked = slot.priority_booked;
          break;
      }

      availableCapacity = tierCapacity - tierBooked;

      return {
        ...slot,
        tier_capacity: tierCapacity,
        tier_booked: tierBooked,
        tier_available: availableCapacity,
        is_tier_available: availableCapacity > 0 && slot.is_available && !slot.is_blocked
      };
    });

    res.json({ slots: slotsWithAvailability });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    res.status(500).json({ error: 'Failed to fetch time slots' });
  }
});

/**
 * POST /api/booking-availability/check
 * Check if a specific slot is available for booking
 */
router.post('/check', async (req, res) => {
  try {
    const { businessId, date, time, tier = 'basic', partySize = 1 } = req.body;

    if (!businessId || !date || !time) {
      return res.status(400).json({ error: 'businessId, date, and time are required' });
    }

    // Use the database function to check availability
    const result = await pool.query(`
      SELECT check_slot_availability($1, $2, $3, $4, $5) as is_available
    `, [businessId, date, time, tier, partySize]);

    const isAvailable = result.rows[0].is_available;

    // Get slot details
    const slotDetails = await pool.query(`
      SELECT * FROM booking_time_slots
      WHERE business_id = $1 AND slot_date = $2 AND slot_time = $3
    `, [businessId, date, time]);

    res.json({
      is_available: isAvailable,
      slot: slotDetails.rows[0] || null
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

/**
 * POST /api/booking-availability/waitlist
 * Add customer to waitlist for a fully booked slot
 */
router.post('/waitlist', async (req, res) => {
  try {
    const {
      businessId,
      userId,
      preferredDate,
      preferredTime,
      partySize,
      tier = 'basic',
      contactName,
      contactPhone,
      contactEmail
    } = req.body;

    // Get tenant ID
    const tenantResult = await pool.query(`
      SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1
    `);
    const tenantId = tenantResult.rows[0].id;

    // Add to waitlist
    const result = await pool.query(`
      INSERT INTO booking_waitlist (
        tenant_id, business_id, user_id, preferred_date, preferred_time,
        party_size, booking_tier, contact_name, contact_phone, contact_email,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() + INTERVAL '48 hours')
      RETURNING *
    `, [
      tenantId, businessId, userId, preferredDate, preferredTime,
      partySize, tier, contactName, contactPhone, contactEmail
    ]);

    res.status(201).json({
      message: 'Added to waitlist successfully',
      waitlist: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    res.status(500).json({ error: 'Failed to add to waitlist' });
  }
});

/**
 * Helper function to generate default time slots for a business on a specific date
 */
async function generateDefaultSlots(businessId, date) {
  try {
    // Get business capacity settings
    const settings = await pool.query(`
      SELECT * FROM business_capacity_settings WHERE business_id = $1
    `, [businessId]);

    const config = settings.rows[0] || {
      total_capacity: 50,
      basic_tier_capacity_percent: 40,
      standard_tier_capacity_percent: 30,
      premium_tier_capacity_percent: 20,
      priority_tier_capacity_percent: 10
    };

    // Get tenant ID
    const tenantResult = await pool.query(`
      SELECT tenant_id FROM businesses WHERE id = $1
    `, [businessId]);
    const tenantId = tenantResult.rows[0].tenant_id;

    // Calculate tier capacities
    const basicCapacity = Math.floor(config.total_capacity * config.basic_tier_capacity_percent / 100);
    const standardCapacity = Math.floor(config.total_capacity * config.standard_tier_capacity_percent / 100);
    const premiumCapacity = Math.floor(config.total_capacity * config.premium_tier_capacity_percent / 100);
    const priorityCapacity = Math.floor(config.total_capacity * config.priority_tier_capacity_percent / 100);

    // Generate slots from 11:00 AM to 10:00 PM (every 30 minutes)
    const slots = [];
    for (let hour = 11; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 22 && minute > 0) break; // Stop at 10:00 PM

        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
        const endHour = minute === 30 ? hour + 1 : hour;
        const endMinute = minute === 30 ? 0 : 30;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;

        slots.push({
          tenantId,
          businessId,
          date,
          time,
          endTime,
          totalCapacity: config.total_capacity,
          basicCapacity,
          standardCapacity,
          premiumCapacity,
          priorityCapacity
        });
      }
    }

    // Insert all slots
    for (const slot of slots) {
      await pool.query(`
        INSERT INTO booking_time_slots (
          tenant_id, business_id, slot_date, slot_time, slot_end_time,
          total_capacity, basic_capacity, standard_capacity, premium_capacity, priority_capacity
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (business_id, slot_date, slot_time) DO NOTHING
      `, [
        slot.tenantId, slot.businessId, slot.date, slot.time, slot.endTime,
        slot.totalCapacity, slot.basicCapacity, slot.standardCapacity,
        slot.premiumCapacity, slot.priorityCapacity
      ]);
    }

    console.log(`Generated ${slots.length} time slots for business ${businessId} on ${date}`);
  } catch (error) {
    console.error('Error generating default slots:', error);
    throw error;
  }
}

module.exports = router;

