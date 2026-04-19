const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// Load environment variables only in development
// Production (Vercel) provides env vars directly
// Docker also provides env vars, so we don't override when running in Docker
const isProduction = process.env.NODE_ENV === 'production';
const isDocker = process.env.DB_HOST === 'postgres';  // Docker uses 'postgres' as hostname
if (!isProduction && !isDocker) {
  const envLocalPath = path.join(__dirname, '.env.local');
  const envPath = path.join(__dirname, '.env');

  // Try .env.local first, then .env (don't override existing env vars)
  if (fs.existsSync(envLocalPath)) {
    require('dotenv').config({ path: envLocalPath });
    console.log('💻 Loaded .env.local for development');
  } else if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('💻 Loaded .env for development');
  }
} else if (isDocker) {
  console.log('🐳 Running in Docker mode - using container environment variables');
}

const app = express();
const server = require('http').createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize WebSocket (will be started when server starts)
const { initializeWebSocket } = require('./websocket/socketHandler');

// Security middleware
app.use(helmet());

// CORS configuration for production (Vercel) and development
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:4200',
  'https://itiyum.vercel.app',
  'https://itiyum-michaelkateregga-3777s-projects.vercel.app',
  /\.vercel\.app$/  // Allow all Vercel preview deployments
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list or matches regex pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all origins in production for now
    }
  },
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

// Simple ping endpoint (no database required) - useful for debugging
app.get('/api/ping', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    env: process.env.NODE_ENV || 'development',
    hasDbUrl: !!process.env.DATABASE_URL,
    timestamp: new Date().toISOString()
  });
});

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
const specialistRoutes = require('./routes/specialist');
const specialistPortfolioRoutes = require('./routes/specialist-portfolio');
const publicSpecialistRoutes = require('./routes/public-specialist');
const uploadRoutes = require('./routes/uploads');
const favoritesRoutes = require('./routes/favorites');
const userPreferencesRoutes = require('./routes/user-preferences');
const ordersRoutes = require('./routes/orders');
const memberPromotionsRoutes = require('./routes/member-promotions');
const bookingIncentivesRoutes = require('./routes/booking-incentives');
const userWalletRoutes = require('./routes/user-wallet');
const socialRoutes = require('./routes/social');
const messagingRoutes = require('./routes/messaging');
const presenceRoutes = require('./routes/presence');
const pokesRoutes = require('./routes/pokes');
const recommendationsRoutes = require('./routes/recommendations');
const userSpecialistBookingsRoutes = require('./routes/user-specialist-bookings');
const blogRoutes = require('./routes/blog');
const adminBlogRoutes = require('./routes/admin-blog');
const industryNewsRoutes = require('./routes/industry-news');
const specialistReviewsRoutes = require('./routes/specialist-reviews');
const paymentsRoutes = require('./routes/payments');
const subscriptionsRoutes = require('./routes/subscriptions');
const premiumListingsRoutes = require('./routes/premium-listings');
const cartRoutes = require('./routes/cart');
const checkoutRoutes = require('./routes/checkout');
const businessAnalyticsRoutes = require('./routes/business-analytics');
const systemStatusRoutes = require('./routes/system-status');
const avatarRoutes = require('./routes/avatar');
const monitoringRoutes = require('./routes/monitoring');

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/specialist', specialistRoutes); // Specialist dashboard endpoints
app.use('/api/specialist/portfolio', specialistPortfolioRoutes); // Specialist portfolio management
app.use('/api/public/specialists', publicSpecialistRoutes); // Public specialist discovery
app.use('/api/uploads', uploadRoutes); // File upload endpoints
app.use('/api/favorites', favoritesRoutes); // User favorites endpoints
app.use('/api/user-preferences', userPreferencesRoutes); // User preferences for personalization
app.use('/api/orders', ordersRoutes); // Order history and management
app.use('/api/cart', cartRoutes); // Shopping cart management
app.use('/api/checkout', checkoutRoutes); // Checkout and order creation
app.use('/api/member-promotions', memberPromotionsRoutes); // Member-only promotions
app.use('/api/booking-incentives', bookingIncentivesRoutes); // Booking discounts/cashback
app.use('/api/wallet', userWalletRoutes); // User wallet/cashback
app.use('/api/social', socialRoutes); // Social features (follow, activity feed)
app.use('/api/messaging', messagingRoutes); // User-to-user messaging (Erlang-style actor model)
app.use('/api/presence', presenceRoutes); // Real-time user presence tracking
app.use('/api/pokes', pokesRoutes); // Poke/nudge feature
app.use('/api/recommendations', recommendationsRoutes); // Personalized recommendations
app.use('/api/user/specialist-bookings', userSpecialistBookingsRoutes); // User specialist booking history & testimonials
app.use('/api/blog', blogRoutes); // Public blog endpoints
app.use('/api/admin/blog', adminBlogRoutes); // Admin blog management
app.use('/api/industry-news', industryNewsRoutes); // Real-time industry news feed
app.use('/api/specialist-reviews', specialistReviewsRoutes); // Specialist reviews endpoints
app.use('/api/payments', paymentsRoutes); // Paystack payment gateway
app.use('/api/subscriptions', subscriptionsRoutes); // Subscription plans and management
app.use('/api/premium-listings', premiumListingsRoutes); // Premium listing purchases
app.use('/api/business', businessAnalyticsRoutes); // Business analytics dashboard
app.use('/api/system-status', systemStatusRoutes); // Public system status and health
app.use('/api/users', avatarRoutes); // Avatar upload and management
app.use('/api/monitoring', monitoringRoutes); // System monitoring and API usage tracking

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

// Start server only if not in serverless environment (Vercel)
if (!process.env.VERCEL) {
  // Initialize WebSocket
  const io = initializeWebSocket(server);

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:4200'}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket server initialized`);
  });
}

// Export for Vercel serverless
module.exports = app;
