const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get all favorites for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        f.*,
        json_build_object(
          'id', b.id,
          'name', b.business_name,
          'description', b.description,
          'cuisine_types', b.cuisine_types,
          'price_range', b.price_range,
          'average_rating', b.average_rating,
          'total_reviews', b.total_reviews,
          'image_url', b.cover_image_url,
          'address', b.address,
          'city', b.city,
          'state', b.state,
          'phone', b.phone,
          'email', b.email,
          'website', b.website
        ) as business
      FROM favorites f
      LEFT JOIN businesses b ON f.business_id = b.id
      WHERE f.user_id = $1
      ORDER BY f.added_at DESC
    `, [userId]);
    
    res.json({ favorites: result.rows });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Get collections for a user
router.get('/collections/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM favorite_collections
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    
    res.json({ collections: result.rows });
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

// Add to favorites
router.post('/', async (req, res) => {
  try {
    const { userId, businessId, notes, tags } = req.body;
    
    const result = await pool.query(`
      INSERT INTO favorites (user_id, business_id, notes, tags)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, business_id) DO UPDATE SET
        notes = EXCLUDED.notes,
        tags = EXCLUDED.tags,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [userId, businessId, notes, tags || []]);
    
    // Fetch the business details
    const businessResult = await pool.query(`
      SELECT * FROM businesses WHERE id = $1
    `, [businessId]);
    
    const favorite = result.rows[0];
    favorite.business = businessResult.rows[0] || {};
    
    res.status(201).json(favorite);
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

// Update favorite
router.patch('/:favoriteId', async (req, res) => {
  try {
    const { favoriteId } = req.params;
    const { notes, tags, isPublic, rating } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramCount++}`);
      values.push(tags);
    }
    if (isPublic !== undefined) {
      updates.push(`is_public = $${paramCount++}`);
      values.push(isPublic);
    }
    if (rating !== undefined) {
      updates.push(`rating = $${paramCount++}`);
      values.push(rating);
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(favoriteId);
    
    const result = await pool.query(`
      UPDATE favorites SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating favorite:', error);
    res.status(500).json({ error: 'Failed to update favorite' });
  }
});

// Remove from favorites
router.delete('/:favoriteId', async (req, res) => {
  try {
    const { favoriteId } = req.params;
    
    const result = await pool.query(`
      DELETE FROM favorites WHERE id = $1 RETURNING id
    `, [favoriteId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }
    
    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({ error: 'Failed to remove from favorites' });
  }
});

// Create collection
router.post('/collections', async (req, res) => {
  try {
    const { userId, name, description, isPublic } = req.body;
    
    const result = await pool.query(`
      INSERT INTO favorite_collections (user_id, name, description, is_public)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [userId, name, description, isPublic || false]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

module.exports = router;

