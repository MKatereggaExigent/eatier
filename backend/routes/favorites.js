const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all favorites for a user
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const tenantId = req.user.tenant_id;

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
      WHERE f.user_id = $1 AND f.tenant_id = $2
      ORDER BY f.created_at DESC
    `, [userId, tenantId]);

    res.json({ favorites: result.rows });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Get collections for a user
router.get('/collections/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      SELECT * FROM favorite_collections
      WHERE user_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC
    `, [userId, tenantId]);

    res.json({ collections: result.rows });
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

// Add to favorites
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { businessId, notes } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      INSERT INTO favorites (user_id, business_id, tenant_id, notes)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, business_id) DO UPDATE SET
        notes = EXCLUDED.notes
      RETURNING *
    `, [userId, businessId, tenantId, notes]);

    // Fetch the business details with consistent structure
    const businessResult = await pool.query(`
      SELECT
        id,
        business_name,
        description,
        cuisine_types,
        price_range,
        average_rating,
        total_reviews,
        cover_image_url,
        address,
        city,
        state,
        phone,
        email,
        website
      FROM businesses WHERE id = $1
    `, [businessId]);

    const favorite = result.rows[0];

    // Transform business data to match GET endpoint format
    if (businessResult.rows[0]) {
      favorite.business = {
        id: businessResult.rows[0].id,
        name: businessResult.rows[0].business_name,
        description: businessResult.rows[0].description,
        cuisine_types: businessResult.rows[0].cuisine_types,
        price_range: businessResult.rows[0].price_range,
        average_rating: businessResult.rows[0].average_rating,
        total_reviews: businessResult.rows[0].total_reviews,
        image_url: businessResult.rows[0].cover_image_url,
        address: businessResult.rows[0].address,
        city: businessResult.rows[0].city,
        state: businessResult.rows[0].state,
        phone: businessResult.rows[0].phone,
        email: businessResult.rows[0].email,
        website: businessResult.rows[0].website
      };
    } else {
      favorite.business = null;
    }

    res.status(201).json(favorite);
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

// Update favorite
router.patch('/:favoriteId', authenticateToken, async (req, res) => {
  try {
    const { favoriteId } = req.params;
    const { notes } = req.body;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      UPDATE favorites SET notes = $1
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, [notes, favoriteId, tenantId]);

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
router.delete('/:favoriteId', authenticateToken, async (req, res) => {
  try {
    const { favoriteId } = req.params;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      DELETE FROM favorites WHERE id = $1 AND tenant_id = $2 RETURNING id
    `, [favoriteId, tenantId]);

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
router.post('/collections', authenticateToken, async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenant_id;

    const result = await pool.query(`
      INSERT INTO favorite_collections (user_id, tenant_id, name, description, is_public)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [userId, tenantId, name, description, isPublic || false]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

module.exports = router;

