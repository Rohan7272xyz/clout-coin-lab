// Backend/index.cjs - Updated for unified architecture
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

// Import routes - UNIFIED ARCHITECTURE
const authRoutes = require('./routes/authRoutes');
const influencerRoutes = require('./routes/influencerRoutes'); // ✅ UNIFIED - Handles both admin and public
const testRoutes = require('./routes/testRoutes');
const pledgeRoutes = require('./routes/pledgeRoutes');
const userStatusRoutes = require('./routes/userStatusRoutes');

// ⚠️ DEPRECATED: adminDashboardRoutes and dashboardRoutes - functionality moved to influencerRoutes
// const adminDashboardRoutes = require('./routes/adminDashboardRoutes'); // REMOVED
// const dashboardRoutes = require('./routes/dashboardRoutes'); // REMOVED

// Analytics API Routes (Phase 2C)
const quotesRoutes = require('./routes/quotesRoutes');
const chartRoutes = require('./routes/chartRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:5174'], 
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// ===================================================================
// UNIFIED ROUTE ARCHITECTURE
// ===================================================================

// Core Routes
app.use('/api/auth', authRoutes);
app.use('/api/influencer', influencerRoutes); // ✅ UNIFIED - Handles ALL influencer operations (admin + public)
app.use('/api/test', testRoutes);
app.use('/api/pledge', pledgeRoutes);
app.use('/api/status', userStatusRoutes);

// Analytics Routes (Phase 2C)
app.use('/api/quotes', quotesRoutes);
app.use('/api/chart', chartRoutes);
app.use('/api/analytics', analyticsRoutes);

// ===================================================================
// LEGACY COMPATIBILITY ROUTES
// ===================================================================

// Dashboard routes - Redirect to unified influencer routes
app.use('/api/dashboard/admin/influencers', (req, res, next) => {
  console.log('🔄 Redirecting legacy dashboard route to unified influencer API');
  req.url = '/api/influencer' + req.url.replace('/api/dashboard/admin/influencers', '');
  influencerRoutes(req, res, next);
});

app.use('/api/dashboard/admin/stats', (req, res, next) => {
  console.log('🔄 Redirecting legacy stats route to unified influencer API');
  req.url = '/admin/stats';
  influencerRoutes(req, res, next);
});

// Other legacy dashboard routes can be handled similarly
app.use('/api/dashboard', (req, res) => {
  res.status(410).json({
    error: 'Legacy dashboard routes have been unified',
    message: 'Please use /api/influencer routes instead',
    migration: {
      '/api/dashboard/admin/influencers': '/api/influencer',
      '/api/dashboard/admin/stats': '/api/influencer/admin/stats',
      '/api/dashboard/admin/influencers/:id/approve': '/api/influencer/:id/approve',
      '/api/dashboard/admin/influencers/:id/create-token': '/api/influencer/:id/create-token'
    }
  });
});

// ===================================================================
// ROOT ENDPOINT
// ===================================================================

app.get('/', (req, res) => {
  res.json({
    message: '🚀 CoinFluence Backend - Unified Architecture',
    version: '2.0.0',
    architecture: 'unified',
    endpoints: {
      // Unified Routes
      auth: '/api/auth',
      influencer: '/api/influencer', // ✅ Handles both admin and public operations
      test: '/api/test',
      pledge: '/api/pledge',
      status: '/api/status',
      // Analytics
      quotes: '/api/quotes',
      chart: '/api/chart',
      analytics: '/api/analytics'
    },
    unifiedInfluencerAPI: {
      public: {
        listAll: 'GET /api/influencer',
        getById: 'GET /api/influencer/:id',
        getByHandle: 'GET /api/influencer/handle/:handle',
        getByAddress: 'GET /api/influencer/address/:address',
        getCoinDetails: 'GET /api/influencer/coin/:identifier'
      },
      admin: {
        create: 'POST /api/influencer',
        update: 'PUT /api/influencer/:id',
        delete: 'DELETE /api/influencer/:id',
        approve: 'POST /api/influencer/:id/approve',
        createToken: 'POST /api/influencer/:id/create-token',
        getTokenData: 'GET /api/influencer/:id/token-data',
        getStats: 'GET /api/influencer/admin/stats'
      }
    },
    features: [
      'Unified influencer management',
      'Real-time quotes',
      'OHLCV charts',
      'Performance analytics',
      'News feed',
      'Market statistics',
      'Token creation workflow',
      'Legacy route compatibility'
    ],
    status: 'operational',
    firebase: 'initialized',
    phase: '2.0 - Unified Architecture'
  });
});

// ===================================================================
// HEALTH CHECK
// ===================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    firebase: 'initialized',
    architecture: 'unified',
    version: '2.0.0',
    features: [
      'Unified influencer API',
      'Real-time analytics',
      'Token factory integration',
      'Legacy compatibility'
    ]
  });
});

// ===================================================================
// ERROR HANDLING
// ===================================================================

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    architecture: 'unified'
  });
});

// 404 handler with migration guidance
app.use((req, res) => {
  // Provide helpful migration messages for common legacy routes
  if (req.url.startsWith('/api/dashboard/admin')) {
    return res.status(404).json({
      error: 'Route migrated to unified architecture',
      requested: req.url,
      suggestion: req.url.replace('/api/dashboard/admin/influencers', '/api/influencer'),
      message: 'Admin dashboard routes have been unified into /api/influencer'
    });
  }
  
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
    architecture: 'unified',
    availableRoutes: ['/api/influencer', '/api/auth', '/api/pledge', '/api/quotes', '/api/chart', '/api/analytics']
  });
});

// ===================================================================
// SERVER STARTUP
// ===================================================================

app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database connection configured`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🚀 Firebase Admin SDK status: initialized`);
  
  console.log(`\n🎯 UNIFIED ARCHITECTURE ACTIVE:`);
  console.log(`   ✅ All influencer operations: http://localhost:${PORT}/api/influencer`);
  console.log(`   ✅ Admin functions: http://localhost:${PORT}/api/influencer/admin/*`);
  console.log(`   ✅ Public functions: http://localhost:${PORT}/api/influencer/*`);
  console.log(`   ⚠️  Legacy /api/dashboard routes deprecated`);
  
  console.log(`\n📊 Phase 2C Analytics API routes:`);
  console.log(`   💹 Quotes: http://localhost:${PORT}/api/quotes`);
  console.log(`   📈 Charts: http://localhost:${PORT}/api/chart`);
  console.log(`   📊 Analytics: http://localhost:${PORT}/api/analytics`);
  
  console.log(`\n🎉 Ready for unified influencer management!`);
});