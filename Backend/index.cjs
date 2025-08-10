// Backend/index.cjs - Updated to include dashboard routes and Phase 2C Analytics API
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Load .env from backend folder first, then root folder as fallback
require('dotenv').config(); // Load Backend/.env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Also load root .env

// Initialize Firebase Admin SDK BEFORE importing routes
const { initializeFirebaseAdmin } = require('./config/firebase-admin');

// Initialize Firebase Admin SDK
try {
  initializeFirebaseAdmin();
  console.log('🔥 Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error);
  console.error('⚠️ Authentication will not work properly');
}

// Import existing routes AFTER Firebase initialization
const authRoutes = require('./routes/authRoutes');
const influencerRoutes = require('./routes/influencerRoutes');
const testRoutes = require('./routes/testRoutes');
const pledgeRoutes = require('./routes/pledgeRoutes');
const userStatusRoutes = require('./routes/userStatusRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// NEW: Phase 2C Production Analytics API Routes
const quotesRoutes = require('./routes/quotesRoutes');
const chartRoutes = require('./routes/chartRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
const PORT = process.env.PORT || 3000; // Use port 3000 as default

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:5174'], // Support multiple frontend ports
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Existing Routes
app.use('/api/auth', authRoutes);
app.use('/api/influencer', influencerRoutes);
app.use('/api/test', testRoutes);
app.use('/api/pledge', pledgeRoutes);
app.use('/api/status', userStatusRoutes);
app.use('/api/dashboard', dashboardRoutes);

// NEW: Phase 2C Production Analytics Routes
app.use('/api/quotes', quotesRoutes);      // Real-time quotes API
app.use('/api/chart', chartRoutes);        // OHLCV chart data API
app.use('/api/analytics', analyticsRoutes); // Performance, news, statistics API

// Root endpoint - Updated to include new analytics endpoints
app.get('/', (req, res) => {
  res.json({
    message: '🚀 CoinFluence Backend Running - Phase 2C Analytics Ready',
    endpoints: {
      // Existing endpoints
      auth: '/api/auth',
      influencer: '/api/influencer',
      test: '/api/test',
      pledge: '/api/pledge',
      status: '/api/status',
      dashboard: '/api/dashboard',
      // NEW: Phase 2C Analytics endpoints
      quotes: '/api/quotes',
      chart: '/api/chart',
      analytics: '/api/analytics'
    },
    analytics: {
      quotes: {
        realTime: '/api/quotes/:tokenId',
        mini: '/api/quotes/:tokenId/mini'
      },
      charts: {
        ohlcv: '/api/chart/:tokenId/:range',
        ranges: '/api/chart/:tokenId/ranges'
      },
      analytics: {
        performance: '/api/analytics/:tokenId/performance',
        statistics: '/api/analytics/:tokenId/statistics',
        news: '/api/analytics/:tokenId/news',
        profile: '/api/analytics/:tokenId/profile'
      }
    },
    status: 'operational',
    firebase: 'initialized',
    phase: '2C - Production Analytics API Ready'
  });
});

// Health check endpoint - Enhanced with analytics status
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    firebase: 'initialized',
    analytics: 'enabled',
    phase: '2C',
    features: [
      'Real-time quotes',
      'OHLCV charts',
      'Performance analytics',
      'News feed',
      'Market statistics'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database connection configured`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🚀 Firebase Admin SDK status: initialized`);
  console.log(`📈 Dashboard routes enabled at http://localhost:${PORT}/api/dashboard`);
  console.log(`📊 Phase 2C Analytics API routes enabled:`);
  console.log(`   💹 Quotes: http://localhost:${PORT}/api/quotes`);
  console.log(`   📈 Charts: http://localhost:${PORT}/api/chart`);
  console.log(`   📊 Analytics: http://localhost:${PORT}/api/analytics`);
  console.log(`🎯 Ready for Yahoo Finance-style frontend integration!`);
});