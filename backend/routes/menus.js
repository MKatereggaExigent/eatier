const express = require('express');
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Get menus for a business
router.get('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { category } = req.query;
    
    let query = `
      SELECT * FROM menus 
      WHERE business_id = $1 AND is_active = true
    `;
    
    const params = [businessId];
    
    if (category) {
      query += ` AND category = $2`;
      params.push(category);
    }
    
    query += ` ORDER BY category, title`;
    
    const result = await pool.query(query, params);
    
    const menus = result.rows.map(menu => ({
      id: menu.id,
      businessId: menu.business_id,
      title: menu.title,
      category: menu.category,
      description: menu.description,
      price: parseFloat(menu.price),
      backgroundImage: menu.background_image,
      isActive: menu.is_active,
      createdAt: menu.created_at,
      updatedAt: menu.updated_at
    }));
    
    res.json(menus);
    
  } catch (error) {
    console.error('Error fetching menus:', error);
    res.status(500).json({ error: 'Failed to fetch menus' });
  }
});

// Create new menu item
router.post('/', async (req, res) => {
  try {
    const {
      businessId,
      title,
      category,
      description,
      price,
      backgroundImage
    } = req.body;
    
    // Validate required fields
    if (!businessId || !title || !category || !description || price === undefined) {
      return res.status(400).json({ 
        error: 'Business ID, title, category, description, and price are required' 
      });
    }
    
    // Validate category
    const validCategories = ['breakfast', 'lunch', 'dinner', 'beverages', 'dessert'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    // Validate description length (15 characters max, no emojis)
    if (description.length > 15) {
      return res.status(400).json({ error: 'Description must be 15 characters or less' });
    }
    
    // Check for emojis in description
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
    if (emojiRegex.test(description)) {
      return res.status(400).json({ error: 'Emojis are not allowed in the description' });
    }
    
    // Check if business exists
    const businessCheck = await pool.query('SELECT id FROM businesses WHERE id = $1', [businessId]);
    if (businessCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    const result = await pool.query(`
      INSERT INTO menus (business_id, title, category, description, price, background_image)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [businessId, title, category, description, price, backgroundImage]);
    
    const menu = result.rows[0];
    
    res.status(201).json({
      message: 'Menu item created successfully',
      menu: {
        id: menu.id,
        businessId: menu.business_id,
        title: menu.title,
        category: menu.category,
        description: menu.description,
        price: parseFloat(menu.price),
        backgroundImage: menu.background_image,
        isActive: menu.is_active,
        createdAt: menu.created_at
      }
    });
    
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Update menu item
router.put('/:menuId', async (req, res) => {
  try {
    const { menuId } = req.params;
    const { title, category, description, price, backgroundImage, isActive } = req.body;
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (category !== undefined) {
      const validCategories = ['breakfast', 'lunch', 'dinner', 'beverages', 'dessert'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      updates.push(`category = $${paramCount++}`);
      values.push(category);
    }
    if (description !== undefined) {
      if (description.length > 15) {
        return res.status(400).json({ error: 'Description must be 15 characters or less' });
      }
      const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
      if (emojiRegex.test(description)) {
        return res.status(400).json({ error: 'Emojis are not allowed in the description' });
      }
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(price);
    }
    if (backgroundImage !== undefined) {
      updates.push(`background_image = $${paramCount++}`);
      values.push(backgroundImage);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(menuId);
    
    const query = `
      UPDATE menus 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    const menu = result.rows[0];
    
    res.json({
      message: 'Menu item updated successfully',
      menu: {
        id: menu.id,
        businessId: menu.business_id,
        title: menu.title,
        category: menu.category,
        description: menu.description,
        price: parseFloat(menu.price),
        backgroundImage: menu.background_image,
        isActive: menu.is_active,
        updatedAt: menu.updated_at
      }
    });
    
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Delete menu item
router.delete('/:menuId', async (req, res) => {
  try {
    const { menuId } = req.params;
    
    const result = await pool.query(`
      UPDATE menus 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `, [menuId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json({
      message: 'Menu item deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

// Grant menu access
router.post('/:menuId/access', async (req, res) => {
  try {
    const { menuId } = req.params;
    const { email, message, accessLevel } = req.body;
    
    if (!email || !accessLevel) {
      return res.status(400).json({ error: 'Email and access level are required' });
    }
    
    // Validate access level
    const validAccessLevels = ['edit_and_see', 'see_only', 'cannot_edit'];
    if (!validAccessLevels.includes(accessLevel)) {
      return res.status(400).json({ error: 'Invalid access level' });
    }
    
    // Get menu and business info
    const menuResult = await pool.query(`
      SELECT m.*, b.id as business_id 
      FROM menus m 
      JOIN businesses b ON m.business_id = b.id 
      WHERE m.id = $1
    `, [menuId]);
    
    if (menuResult.rows.length === 0) {
      return res.status(404).json({ error: 'Menu not found' });
    }
    
    const menu = menuResult.rows[0];
    const accessLink = `https://eatier.com/menu/access/${uuidv4()}`;
    
    const result = await pool.query(`
      INSERT INTO menu_access (menu_id, business_id, email, message, access_level, access_link)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [menuId, menu.business_id, email, message, accessLevel, accessLink]);
    
    const access = result.rows[0];
    
    res.status(201).json({
      message: 'Menu access granted successfully',
      access: {
        id: access.id,
        menuId: access.menu_id,
        businessId: access.business_id,
        email: access.email,
        message: access.message,
        accessLevel: access.access_level,
        accessLink: access.access_link,
        isActive: access.is_active,
        createdAt: access.created_at
      }
    });
    
  } catch (error) {
    console.error('Error granting menu access:', error);
    res.status(500).json({ error: 'Failed to grant menu access' });
  }
});

// Get menu access permissions for a business
router.get('/access/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        ma.*,
        m.title as menu_title,
        m.category as menu_category
      FROM menu_access ma
      JOIN menus m ON ma.menu_id = m.id
      WHERE ma.business_id = $1 AND ma.is_active = true
      ORDER BY ma.created_at DESC
    `, [businessId]);
    
    const accesses = result.rows.map(access => ({
      id: access.id,
      menuId: access.menu_id,
      menuTitle: access.menu_title,
      menuCategory: access.menu_category,
      businessId: access.business_id,
      email: access.email,
      message: access.message,
      accessLevel: access.access_level,
      accessLink: access.access_link,
      isActive: access.is_active,
      expiresAt: access.expires_at,
      createdAt: access.created_at
    }));
    
    res.json(accesses);
    
  } catch (error) {
    console.error('Error fetching menu access:', error);
    res.status(500).json({ error: 'Failed to fetch menu access' });
  }
});

// Revoke menu access
router.delete('/access/:accessId', async (req, res) => {
  try {
    const { accessId } = req.params;
    
    const result = await pool.query(`
      UPDATE menu_access 
      SET is_active = false
      WHERE id = $1
      RETURNING id
    `, [accessId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu access not found' });
    }
    
    res.json({
      message: 'Menu access revoked successfully'
    });
    
  } catch (error) {
    console.error('Error revoking menu access:', error);
    res.status(500).json({ error: 'Failed to revoke menu access' });
  }
});

module.exports = router;
