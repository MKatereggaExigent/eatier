/**
 * File Upload Routes
 * Production-ready image upload endpoint for ads, profiles, businesses, and menus
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist (skip on Vercel serverless - read-only filesystem)
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const uploadDirs = ['ads', 'profiles', 'businesses', 'menus', 'temp'];

if (!isVercel) {
  uploadDirs.forEach(dir => {
    const dirPath = path.join(__dirname, '..', 'uploads', dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
}

// Allowed file types
const ALLOWED_MIME_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm'
};

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,  // 10MB for images
  video: 100 * 1024 * 1024  // 100MB for videos
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.params.category || 'temp';
    const validCategories = ['ads', 'profiles', 'businesses', 'menus', 'temp'];
    const destCategory = validCategories.includes(category) ? category : 'temp';
    const destPath = path.join(__dirname, '..', 'uploads', destCategory);
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const ext = ALLOWED_MIME_TYPES[file.mimetype] || 'jpg';
    const uniqueName = `${uuidv4()}.${ext}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMITS.video, // Use max limit, we'll validate per type
    files: 10 // Max 10 files per request
  }
});

/**
 * POST /api/uploads/:category
 * Upload single or multiple files to a category
 * Categories: ads, profiles, businesses, menus
 */
router.post('/:category', upload.array('files', 10), async (req, res) => {
  try {
    const { category } = req.params;
    const validCategories = ['ads', 'profiles', 'businesses', 'menus'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category',
        validCategories
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Build response with file URLs
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

    const uploadedFiles = req.files.map(file => ({
      id: path.basename(file.filename, path.extname(file.filename)),
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      category,
      url: `${baseUrl}/uploads/${category}/${file.filename}`,
      path: `/uploads/${category}/${file.filename}`
    }));

    res.status(201).json({
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload files', details: error.message });
  }
});

/**
 * POST /api/uploads/:category/single
 * Upload a single file (convenience endpoint)
 */
router.post('/:category/single', upload.single('file'), async (req, res) => {
  try {
    const { category } = req.params;
    const validCategories = ['ads', 'profiles', 'businesses', 'menus'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category', validCategories });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const file = req.file;

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: path.basename(file.filename, path.extname(file.filename)),
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        category,
        url: `${baseUrl}/uploads/${category}/${file.filename}`,
        path: `/uploads/${category}/${file.filename}`
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file', details: error.message });
  }
});

/**
 * DELETE /api/uploads/:category/:filename
 * Delete a specific file
 */
router.delete('/:category/:filename', async (req, res) => {
  try {
    const { category, filename } = req.params;
    const validCategories = ['ads', 'profiles', 'businesses', 'menus', 'temp'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(__dirname, '..', 'uploads', category, sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);

    res.json({ message: 'File deleted successfully', filename: sanitizedFilename });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file', details: error.message });
  }
});

/**
 * GET /api/uploads/:category
 * List files in a category (for admin use)
 */
router.get('/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const validCategories = ['ads', 'profiles', 'businesses', 'menus', 'temp'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const dirPath = path.join(__dirname, '..', 'uploads', category);
    const files = fs.readdirSync(dirPath);
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

    const fileList = files
      .filter(f => !f.startsWith('.'))
      .map(filename => {
        const filePath = path.join(dirPath, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          createdAt: stats.birthtime,
          url: `${baseUrl}/uploads/${category}/${filename}`
        };
      });

    res.json({ category, count: fileList.length, files: fileList });

  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: 'Failed to list files', details: error.message });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Max size: 10MB for images, 100MB for videos' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum 10 files per upload' });
    }
    return res.status(400).json({ error: error.message });
  }
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

module.exports = router;

