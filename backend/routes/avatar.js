/**
 * Avatar Upload Routes
 * Handles user avatar uploads and management
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store in memory for processing

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

/**
 * POST /api/users/avatar
 * Upload or update user avatar
 */
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads/avatars');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const filename = `avatar-${tenantId}-${userId}-${Date.now()}.jpg`;
    const filepath = path.join(uploadsDir, filename);

    // Process image with sharp
    // - Resize to 200x200
    // - Convert to JPEG
    // - Compress quality
    await sharp(req.file.buffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 90 })
      .toFile(filepath);

    // Save avatar URL to database
    const avatarUrl = `/uploads/avatars/${filename}`;
    
    const query = `
      UPDATE users 
      SET profile_image_url = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 AND tenant_id = $3 
      RETURNING id, profile_image_url
    `;
    
    const result = await req.db.query(query, [avatarUrl, userId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl: avatarUrl,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar', details: error.message });
  }
});

/**
 * DELETE /api/users/avatar
 * Remove user avatar (revert to default DiceBear avatar)
 */
router.delete('/avatar', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    // Get current avatar to delete file
    const currentQuery = `SELECT profile_image_url FROM users WHERE id = $1 AND tenant_id = $2`;
    const currentResult = await req.db.query(currentQuery, [userId, tenantId]);

    if (currentResult.rows.length > 0 && currentResult.rows[0].profile_image_url) {
      const oldAvatarPath = path.join(__dirname, '..', currentResult.rows[0].profile_image_url);
      try {
        await fs.unlink(oldAvatarPath);
      } catch (err) {
        console.log('Old avatar file not found or already deleted:', err.message);
      }
    }

    // Update database to remove avatar URL
    const query = `
      UPDATE users 
      SET profile_image_url = NULL, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND tenant_id = $2 
      RETURNING id
    `;
    
    const result = await req.db.query(query, [userId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Avatar removed successfully',
      avatarUrl: null
    });

  } catch (error) {
    console.error('Avatar deletion error:', error);
    res.status(500).json({ error: 'Failed to remove avatar', details: error.message });
  }
});

module.exports = router;
