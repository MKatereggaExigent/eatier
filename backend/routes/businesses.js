const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get all businesses
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, type, country } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        b.*,
        u.first_name || ' ' || u.last_name as owner_name,
        u.email as owner_email
      FROM public.businesses b
      JOIN public.users u ON b.owner_id = u.id
      WHERE b.account_status != 'deleted'
    `;

    const params = [];

    if (type) {
      query += ` AND b.business_type = $${params.length + 1}`;
      params.push(type);
    }

    if (country) {
      query += ` AND b.country = $${params.length + 1}`;
      params.push(country);
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const businesses = result.rows.map(business => ({
      id: business.id,
      ownerId: business.owner_id,
      ownerName: business.owner_name,
      ownerEmail: business.owner_email,
      businessName: business.business_name,
      businessType: business.business_type,
      cuisineTypes: business.cuisine_types || [], // Array of cuisines
      email: business.email,
      phone: business.phone,
      country: business.country,
      address: business.address,
      sustainabilityEthos: business.sustainability_ethos,
      opensAt: business.opens_at,
      closesAt: business.closes_at,
      facilities: business.facilities || [],
      locationLinks: business.location_links || [],
      bio: business.bio,
      profilePhotos: business.profile_photos || [],
      backgroundImage: business.background_image,
      accountStatus: business.account_status,
      priceRange: business.price_range, // Auto-calculated based on menu prices
      createdAt: business.created_at,
      updatedAt: business.updated_at
    }));

    res.json({
      businesses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: businesses.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// Get business by ID
router.get('/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;

    const result = await pool.query(`
      SELECT
        b.*,
        u.first_name || ' ' || u.last_name as owner_name,
        u.email as owner_email
      FROM businesses b
      JOIN users u ON b.owner_id = u.id
      WHERE b.id = $1 AND b.account_status != 'deleted'
    `, [businessId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = result.rows[0];

    res.json({
      business: {
        id: business.id,
        ownerId: business.owner_id,
        ownerName: business.owner_name,
        ownerEmail: business.owner_email,
        businessName: business.business_name,
        businessType: business.business_type,
        cuisineTypes: business.cuisine_types || [], // Array of cuisines
        email: business.email,
        phone: business.phone,
        country: business.country,
        address: business.address,
        sustainabilityEthos: business.sustainability_ethos,
        opensAt: business.opens_at,
        closesAt: business.closes_at,
        facilities: business.facilities || [],
        locationLinks: business.location_links || [],
        bio: business.bio,
        profilePhotos: business.profile_photos || [],
        backgroundImage: business.background_image,
        accountStatus: business.account_status,
        priceRange: business.price_range, // Auto-calculated based on menu prices
        freezeUntil: business.freeze_until,
        freezeDuration: business.freeze_duration,
        createdAt: business.created_at,
        updatedAt: business.updated_at
      }
    });

  } catch (error) {
    console.error('Error fetching business:', error);
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

// Create new business
router.post('/', async (req, res) => {
  try {
    const {
      ownerId,
      businessName,
      businessType,
      email,
      phone,
      country,
      address,
      sustainabilityEthos,
      opensAt,
      closesAt,
      facilities = [],
      locationLinks = [],
      bio
    } = req.body;

    // Validate required fields
    if (!ownerId || !businessName || !businessType || !email || !phone || !country) {
      return res.status(400).json({
        error: 'Owner ID, business name, type, email, phone, and country are required'
      });
    }

    // Check if owner exists
    const ownerCheck = await pool.query('SELECT id FROM users WHERE id = $1', [ownerId]);
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    const result = await pool.query(`
      INSERT INTO businesses (
        owner_id, business_name, business_type, email, phone, country,
        address, sustainability_ethos, opens_at, closes_at, facilities,
        location_links, bio
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      ownerId, businessName, businessType, email, phone, country,
      address, sustainabilityEthos, opensAt, closesAt, facilities,
      locationLinks, bio
    ]);

    const business = result.rows[0];

    res.status(201).json({
      message: 'Business created successfully',
      business: {
        id: business.id,
        ownerId: business.owner_id,
        businessName: business.business_name,
        businessType: business.business_type,
        email: business.email,
        phone: business.phone,
        country: business.country,
        address: business.address,
        sustainabilityEthos: business.sustainability_ethos,
        opensAt: business.opens_at,
        closesAt: business.closes_at,
        facilities: business.facilities || [],
        locationLinks: business.location_links || [],
        bio: business.bio,
        accountStatus: business.account_status,
        createdAt: business.created_at
      }
    });

  } catch (error) {
    console.error('Error creating business:', error);
    res.status(500).json({ error: 'Failed to create business' });
  }
});

// Update business
router.put('/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const {
      businessName,
      businessType,
      email,
      phone,
      country,
      address,
      sustainabilityEthos,
      opensAt,
      closesAt,
      facilities,
      locationLinks,
      bio,
      profilePhotos,
      backgroundImage
    } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (businessName !== undefined) {
      updates.push(`business_name = $${paramCount++}`);
      values.push(businessName);
    }
    if (businessType !== undefined) {
      updates.push(`business_type = $${paramCount++}`);
      values.push(businessType);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (country !== undefined) {
      updates.push(`country = $${paramCount++}`);
      values.push(country);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(address);
    }
    if (sustainabilityEthos !== undefined) {
      updates.push(`sustainability_ethos = $${paramCount++}`);
      values.push(sustainabilityEthos);
    }
    if (opensAt !== undefined) {
      updates.push(`opens_at = $${paramCount++}`);
      values.push(opensAt);
    }
    if (closesAt !== undefined) {
      updates.push(`closes_at = $${paramCount++}`);
      values.push(closesAt);
    }
    if (facilities !== undefined) {
      updates.push(`facilities = $${paramCount++}`);
      values.push(facilities);
    }
    if (locationLinks !== undefined) {
      updates.push(`location_links = $${paramCount++}`);
      values.push(locationLinks);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramCount++}`);
      values.push(bio);
    }
    if (profilePhotos !== undefined) {
      updates.push(`profile_photos = $${paramCount++}`);
      values.push(profilePhotos);
    }
    if (backgroundImage !== undefined) {
      updates.push(`background_image = $${paramCount++}`);
      values.push(backgroundImage);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(businessId);

    const query = `
      UPDATE businesses
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND account_status != 'deleted'
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = result.rows[0];

    res.json({
      message: 'Business updated successfully',
      business: {
        id: business.id,
        ownerId: business.owner_id,
        businessName: business.business_name,
        businessType: business.business_type,
        email: business.email,
        phone: business.phone,
        country: business.country,
        address: business.address,
        sustainabilityEthos: business.sustainability_ethos,
        opensAt: business.opens_at,
        closesAt: business.closes_at,
        facilities: business.facilities || [],
        locationLinks: business.location_links || [],
        bio: business.bio,
        profilePhotos: business.profile_photos || [],
        backgroundImage: business.background_image,
        accountStatus: business.account_status,
        updatedAt: business.updated_at
      }
    });

  } catch (error) {
    console.error('Error updating business:', error);
    res.status(500).json({ error: 'Failed to update business' });
  }
});

// Freeze business account
router.post('/:businessId/freeze', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { duration, reason } = req.body;

    if (!duration) {
      return res.status(400).json({ error: 'Freeze duration is required' });
    }

    let freezeUntil = null;

    if (duration !== 'indefinite') {
      const now = new Date();
      switch (duration) {
        case '1_week':
          freezeUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case '1_month':
          freezeUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
        case '6_months':
          freezeUntil = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
          break;
        default:
          return res.status(400).json({ error: 'Invalid freeze duration' });
      }
    }

    const result = await pool.query(`
      UPDATE businesses
      SET
        account_status = 'frozen',
        freeze_until = $1,
        freeze_duration = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND account_status = 'active'
      RETURNING id, account_status, freeze_until, freeze_duration
    `, [freezeUntil, duration, businessId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found or already frozen' });
    }

    res.json({
      message: 'Business account frozen successfully',
      accountStatus: result.rows[0].account_status,
      freezeUntil: result.rows[0].freeze_until,
      freezeDuration: result.rows[0].freeze_duration
    });

  } catch (error) {
    console.error('Error freezing business account:', error);
    res.status(500).json({ error: 'Failed to freeze business account' });
  }
});

// Delete business
router.delete('/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { confirmDelete } = req.body;

    if (!confirmDelete) {
      return res.status(400).json({ error: 'Business deletion must be confirmed' });
    }

    const result = await pool.query(`
      UPDATE businesses
      SET
        account_status = 'deleted',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND account_status != 'deleted'
      RETURNING id
    `, [businessId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found or already deleted' });
    }

    res.json({
      message: 'Business deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting business:', error);
    res.status(500).json({ error: 'Failed to delete business' });
  }
});

module.exports = router;
