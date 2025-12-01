const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

const envPath = path.join(__dirname, '.env');
require('dotenv').config({ path: envPath, override: true });

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));

// Rate limiting - More lenient in development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per minute (very lenient for development)
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing middleware
app.use(cookieParser());

// Logging middleware
app.use(morgan('combined'));

// Initialize Passport for OAuth
const passport = require('./config/passport');
app.use(passport.initialize());

// Import middleware
const checkMaintenanceMode = require('./middleware/maintenanceMode');

// Apply maintenance mode check (blocks non-admin users when maintenance mode is on)
app.use(checkMaintenanceMode);

// Import routes
const authRoutes = require('./routes/auth');
const oauthRoutes = require('./routes/oauth');
const userRoutes = require('./routes/users');
const userDataRoutes = require('./routes/user-data');
const businessRoutes = require('./routes/businesses');
const menuRoutes = require('./routes/menus');
const communityRoutes = require('./routes/community');
const insightsRoutes = require('./routes/insights');
const adsRoutes = require('./routes/ads');
const bookingsRoutes = require('./routes/bookings');
const bookingAvailabilityRoutes = require('./routes/booking-availability');
const inquiriesRoutes = require('./routes/inquiries');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const businessOwnerRoutes = require('./routes/business-owner');
const businessOwnerExtendedRoutes = require('./routes/business-owner-extended');
const integrationsRoutes = require('./routes/integrations');
const notificationsRoutes = require('./routes/notifications');
const searchRoutes = require('./routes/search');
const analyticsRoutes = require('./routes/analytics');
const businessAdsRoutes = require('./routes/business-ads');
const adsPublicRoutes = require('./routes/ads-public');
const publicStatsRoutes = require('./routes/public-stats');
const reviewsRoutes = require('./routes/reviews');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', oauthRoutes); // OAuth routes (Google, Facebook, GitHub, LinkedIn)
app.use('/api/users', userDataRoutes); // User stats, activity, favorites
app.use('/api/users', userRoutes); // User profile management
app.use('/api/businesses', businessRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/booking-availability', bookingAvailabilityRoutes);
app.use('/api/inquiries', inquiriesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/business-owner', businessOwnerRoutes);
app.use('/api/business-owner', businessOwnerExtendedRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/business-ads', businessAdsRoutes);
app.use('/api/ads-public', adsPublicRoutes); // Public ad serving endpoints
app.use('/api/public', publicStatsRoutes); // Public statistics endpoint

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
