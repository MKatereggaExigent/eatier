const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
require('dotenv').config({ path: envPath, override: true });

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined'));

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const userDataRoutes = require('./routes/user-data');
const businessRoutes = require('./routes/businesses');
const menuRoutes = require('./routes/menus');
const communityRoutes = require('./routes/community');
const insightsRoutes = require('./routes/insights');
const adsRoutes = require('./routes/ads');
const bookingsRoutes = require('./routes/bookings');
const inquiriesRoutes = require('./routes/inquiries');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const businessOwnerRoutes = require('./routes/business-owner');
const businessOwnerExtendedRoutes = require('./routes/business-owner-extended');
const integrationsRoutes = require('./routes/integrations');
const notificationsRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const businessAdsRoutes = require('./routes/business-ads');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userDataRoutes); // User stats, activity, favorites
app.use('/api/users', userRoutes); // User profile management
app.use('/api/businesses', businessRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/inquiries', inquiriesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/business-owner', businessOwnerRoutes);
app.use('/api/business-owner', businessOwnerExtendedRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/business-ads', businessAdsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:4200'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});

module.exports = app;
