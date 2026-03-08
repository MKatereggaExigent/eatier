const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get all users (for admin/testing purposes)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        id, email, first_name, last_name, phone, country, 
        date_of_birth, gender, is_chef, profile_photo, 
        bio, experience_years, specialty_dishes, certifications,
        account_status, created_at
      FROM users
      WHERE account_status != 'deleted'
    `;
    
    const params = [];
    
    if (type === 'chefs') {
      query += ` AND is_chef = true`;
    } else if (type === 'users') {
      query += ` AND is_chef = false`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    const users = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: `${user.first_name} ${user.last_name}`,
      phone: user.phone,
      country: user.country,
      dateOfBirth: user.date_of_birth,
      gender: user.gender,
      isChef: user.is_chef,
      profilePhoto: user.profile_photo,
      bio: user.bio,
      experienceYears: user.experience_years,
      specialtyDishes: user.specialty_dishes || [],
      certifications: user.certifications || [],
      accountStatus: user.account_status,
      createdAt: user.created_at
    }));
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: users.length === parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(`
      SELECT
        id, email, first_name, last_name, phone, country,
        date_of_birth, gender, is_chef, profile_photo, background_photo,
        bio, experience_years, specialty_dishes, certifications, portfolio_images,
        street, city, state, zip_code,
        profile_visibility, show_contact_info, show_location,
        account_status, freeze_until, freeze_duration, created_at, updated_at
      FROM users
      WHERE id = $1 AND account_status != 'deleted'
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: `${user.first_name} ${user.last_name}`,
      phone: user.phone,
      country: user.country,
      dateOfBirth: user.date_of_birth,
      gender: user.gender,
      isChef: user.is_chef,
      profilePhoto: user.profile_photo,
      backgroundPhoto: user.background_photo,
      bio: user.bio,
      experienceYears: user.experience_years,
      specialtyDishes: user.specialty_dishes || [],
      certifications: user.certifications || [],
      portfolioImages: user.portfolio_images || [],
      address: {
        street: user.street,
        city: user.city,
        state: user.state,
        zipCode: user.zip_code,
        country: user.country
      },
      profileVisibility: user.profile_visibility || 'public',
      showContactInfo: user.show_contact_info !== false,
      showLocation: user.show_location || false,
      accountStatus: user.account_status,
      freezeUntil: user.freeze_until,
      freezeDuration: user.freeze_duration,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      firstName,
      lastName,
      phone,
      country,
      dateOfBirth,
      gender,
      profilePhoto,
      backgroundPhoto,
      bio,
      experienceYears,
      specialtyDishes,
      certifications,
      portfolioImages,
      address,
      profileVisibility,
      showContactInfo,
      showLocation
    } = req.body;

    // Debug: Log specialty dishes and certifications
    console.log('📝 Updating user profile:', {
      userId,
      specialtyDishes,
      certifications,
      specialtyDishesType: typeof specialtyDishes,
      certificationsType: typeof certifications,
      specialtyDishesLength: Array.isArray(specialtyDishes) ? specialtyDishes.length : 'N/A',
      certificationsLength: Array.isArray(certifications) ? certifications.length : 'N/A'
    });
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (firstName !== undefined) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(lastName);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (country !== undefined) {
      updates.push(`country = $${paramCount++}`);
      values.push(country);
    }
    if (dateOfBirth !== undefined) {
      updates.push(`date_of_birth = $${paramCount++}`);
      values.push(dateOfBirth);
    }
    if (gender !== undefined) {
      updates.push(`gender = $${paramCount++}`);
      values.push(gender);
    }
    if (profilePhoto !== undefined) {
      updates.push(`profile_photo = $${paramCount++}`);
      values.push(profilePhoto);
    }
    if (backgroundPhoto !== undefined) {
      updates.push(`background_photo = $${paramCount++}`);
      values.push(backgroundPhoto);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramCount++}`);
      values.push(bio);
    }
    if (experienceYears !== undefined) {
      updates.push(`experience_years = $${paramCount++}`);
      values.push(experienceYears);
    }
    if (specialtyDishes !== undefined) {
      updates.push(`specialty_dishes = $${paramCount++}::jsonb`);
      values.push(JSON.stringify(specialtyDishes));
    }
    if (certifications !== undefined) {
      updates.push(`certifications = $${paramCount++}::jsonb`);
      values.push(JSON.stringify(certifications));
    }
    if (portfolioImages !== undefined) {
      updates.push(`portfolio_images = $${paramCount++}::jsonb`);
      values.push(JSON.stringify(portfolioImages));
    }

    // Address fields
    if (address?.street !== undefined) {
      updates.push(`street = $${paramCount++}`);
      values.push(address.street);
    }
    if (address?.city !== undefined) {
      updates.push(`city = $${paramCount++}`);
      values.push(address.city);
    }
    if (address?.state !== undefined) {
      updates.push(`state = $${paramCount++}`);
      values.push(address.state);
    }
    if (address?.zipCode !== undefined) {
      updates.push(`zip_code = $${paramCount++}`);
      values.push(address.zipCode);
    }

    // Privacy settings
    if (profileVisibility !== undefined) {
      updates.push(`profile_visibility = $${paramCount++}`);
      values.push(profileVisibility);
    }
    if (showContactInfo !== undefined) {
      updates.push(`show_contact_info = $${paramCount++}`);
      values.push(showContactInfo);
    }
    if (showLocation !== undefined) {
      updates.push(`show_location = $${paramCount++}`);
      values.push(showLocation);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(userId);
    
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND account_status != 'deleted'
      RETURNING *
    `;
    
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Debug: Log what was saved to database
    console.log('✅ Profile updated in DB:', {
      userId: user.id,
      specialty_dishes: user.specialty_dishes,
      certifications: user.certifications
    });
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: `${user.first_name} ${user.last_name}`,
        phone: user.phone,
        country: user.country,
        dateOfBirth: user.date_of_birth,
        gender: user.gender,
        isChef: user.is_chef,
        profilePhoto: user.profile_photo,
        backgroundPhoto: user.background_photo,
        bio: user.bio,
        experienceYears: user.experience_years,
        specialtyDishes: user.specialty_dishes || [],
        certifications: user.certifications || [],
        portfolioImages: user.portfolio_images || [],
        address: {
          street: user.street,
          city: user.city,
          state: user.state,
          zipCode: user.zip_code,
          country: user.country
        },
        profileVisibility: user.profile_visibility || 'public',
        showContactInfo: user.show_contact_info !== false,
        showLocation: user.show_location || false,
        accountStatus: user.account_status,
        updatedAt: user.updated_at
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating user:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({
      error: 'Failed to update user profile',
      details: error.message
    });
  }
});

// Freeze user account
router.post('/:userId/freeze', async (req, res) => {
  try {
    const { userId } = req.params;
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
      UPDATE users 
      SET 
        account_status = 'frozen',
        freeze_until = $1,
        freeze_duration = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND account_status = 'active'
      RETURNING id, account_status, freeze_until, freeze_duration
    `, [freezeUntil, duration, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or already frozen' });
    }
    
    res.json({
      message: 'Account frozen successfully',
      accountStatus: result.rows[0].account_status,
      freezeUntil: result.rows[0].freeze_until,
      freezeDuration: result.rows[0].freeze_duration
    });
    
  } catch (error) {
    console.error('Error freezing account:', error);
    res.status(500).json({ error: 'Failed to freeze account' });
  }
});

// Reactivate user account
router.post('/:userId/reactivate', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(`
      UPDATE users 
      SET 
        account_status = 'active',
        freeze_until = NULL,
        freeze_duration = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND account_status = 'frozen'
      RETURNING id, account_status
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or not frozen' });
    }
    
    res.json({
      message: 'Account reactivated successfully',
      accountStatus: result.rows[0].account_status
    });
    
  } catch (error) {
    console.error('Error reactivating account:', error);
    res.status(500).json({ error: 'Failed to reactivate account' });
  }
});

// Delete user account
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { confirmDelete } = req.body;
    
    if (!confirmDelete) {
      return res.status(400).json({ error: 'Account deletion must be confirmed' });
    }
    
    const result = await pool.query(`
      UPDATE users 
      SET 
        account_status = 'deleted',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND account_status != 'deleted'
      RETURNING id
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or already deleted' });
    }
    
    res.json({
      message: 'Account deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
