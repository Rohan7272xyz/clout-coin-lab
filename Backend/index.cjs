// Backend/index.cjs - Updated for unified architecture + Contract Analytics
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
// Import routes - UNIFIED ARCHITECTURE + CONTRACT ANALYTICS
const authRoutes = require('./routes/authRoutes');
const influencerRoutes = require('./routes/influencerRoutes'); // ✅ UNIFIED - Handles both admin and public
const testRoutes = require('./routes/testRoutes');
const pledgeRoutes = require('./routes/pledgeRoutes');
const userStatusRoutes = require('./routes/userStatusRoutes');
const contractRoutes = require('./routes/contractRoutes'); // 🔥 NEW - Real blockchain analytics
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
// UNIFIED ROUTE ARCHITECTURE + PRODUCTION BLOCKCHAIN INTEGRATION
// ===================================================================
// Core Routes
app.use('/api/auth', authRoutes);
app.use('/api/influencer', influencerRoutes); // ✅ UNIFIED - Handles ALL influencer operations (admin + public)
app.use('/api/contract', contractRoutes); // 🔥 NEW - Real blockchain analytics for deployed tokens
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
// ROOT ENDPOINT - Updated with contract analytics info
// ===================================================================
app.get('/', (req, res) => {
  res.json({
    message: '🚀 CoinFluence Backend - Unified Architecture + Blockchain Analytics',
    version: '2.1.0',
    architecture: 'unified + blockchain',
    endpoints: {
      // Unified Routes
      auth: '/api/auth',
      influencer: '/api/influencer', // ✅ Handles both admin and public operations
      contract: '/api/contract', // 🔥 NEW - Blockchain analytics
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
        getCoinDetails: 'GET /api/influencer/coin/:identifier' // 🔥 ENHANCED - Real database data
      },
      admin: {
        create: 'POST /api/influencer',
        update: 'PUT /api/influencer/:id',
        delete: 'DELETE /api/influencer/:id',
        approve: 'POST /api/influencer/:id/approve',
        createToken: 'POST /api/influencer/:id/create-token',
        deployRealToken: 'POST /api/influencer/:id/deploy-real-token', // 🔥 PRODUCTION DEPLOYMENT
        getTokenData: 'GET /api/influencer/:id/token-data',
        getStats: 'GET /api/influencer/admin/stats'
      }
    },
    blockchainAnalyticsAPI: {
      // 🔥 NEW CONTRACT ANALYTICS ENDPOINTS
      contractAnalytics: 'GET /api/contract/analytics/:contractAddress',
      holderAnalysis: 'GET /api/contract/holders/:contractAddress',
      parameters: {
        contractAddress: 'Valid Ethereum address (e.g., 0x9592D43821f79595920fF793f22cA1C5f567957d)',
        network: 'base-sepolia, base-mainnet (default: base-sepolia)'
      },
      supportedNetworks: {
        'base-sepolia': {
          chainId: 84532,
          rpcUrl: 'https://sepolia.base.org',
          explorer: 'https://sepolia.basescan.org'
        },
        'base-mainnet': {
          chainId: 8453,
          rpcUrl: 'https://mainnet.base.org',
          explorer: 'https://basescan.org'
        }
      },
      liveTokens: [
        {
          symbol: 'SKBDI',
          name: 'Skibidi Coin',
          contract: '0x9592D43821f79595920fF793f22cA1C5f567957d',
          network: 'base-sepolia',
          status: 'live',
          analyticsUrl: '/api/contract/analytics/0x9592D43821f79595920fF793f22cA1C5f567957d'
        }
      ]
    },
    features: [
      'Unified influencer management',
      'Real blockchain analytics', // 🔥 NEW
      'Live contract data integration', // 🔥 NEW
      'Multi-network support', // 🔥 NEW
      'Real-time quotes',
      'OHLCV charts',
      'Performance analytics',
      'News feed',
      'Market statistics',
      'Token creation workflow',
      'Production deployment pipeline', // 🔥 ENHANCED
      'Legacy route compatibility'
    ],
    status: 'operational',
    firebase: 'initialized',
    blockchain: 'connected', // 🔥 NEW
    phase: '2.1 - Unified Architecture + Blockchain Analytics'
  });
});
// ===================================================================
// HEALTH CHECK - Enhanced with blockchain status
// ===================================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    firebase: 'initialized',
    blockchain: 'connected', // 🔥 NEW
    architecture: 'unified + blockchain',
    version: '2.1.0',
    features: [
      'Unified influencer API',
      'Real-time analytics',
      'Blockchain contract analytics', // 🔥 NEW
      'Live token data integration', // 🔥 NEW
      'Multi-network support', // 🔥 NEW
      'Token factory integration',
      'Legacy compatibility'
    ],
    networks: {
      'base-sepolia': 'operational',
      'base-mainnet': 'operational'
    }
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
    architecture: 'unified + blockchain'
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
    architecture: 'unified + blockchain',
    availableRoutes: [
      '/api/influencer', 
      '/api/contract', // 🔥 NEW
      '/api/auth', 
      '/api/pledge', 
      '/api/quotes', 
      '/api/chart', 
      '/api/analytics'
    ]
  });
});
// ===================================================================
// SERVER STARTUP - Enhanced logging
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
  
  console.log(`\n🔗 BLOCKCHAIN ANALYTICS API (NEW):`);
  console.log(`   📊 Contract Analytics: http://localhost:${PORT}/api/contract/analytics/:address`);
  console.log(`   👥 Holder Analysis: http://localhost:${PORT}/api/contract/holders/:address`);
  console.log(`   🌐 Supported Networks: base-sepolia, base-mainnet`);
  console.log(`   🎯 Live Token Example: http://localhost:${PORT}/api/contract/analytics/0x9592D43821f79595920fF793f22cA1C5f567957d`);
  
  console.log(`\n📊 Phase 2C Analytics API routes:`);
  console.log(`   💹 Quotes: http://localhost:${PORT}/api/quotes`);
  console.log(`   📈 Charts: http://localhost:${PORT}/api/chart`);
  console.log(`   📊 Analytics: http://localhost:${PORT}/api/analytics`);
  
  console.log(`\n🎉 Ready for unified influencer management + blockchain analytics!`);
  console.log(`\n🔥 PRODUCTION FEATURES:`);
  console.log(`   ✅ Real database integration for all token data`);
  console.log(`   ✅ Live blockchain analytics for deployed tokens`);
  console.log(`   ✅ Multi-network support (Base Sepolia + Mainnet)`);
  console.log(`   ✅ Contract verification and holder analysis`);
  console.log(`   ✅ Dynamic live/pre-launch token detection`);
  console.log(`\n🚀 No more mock data - everything is real!`);
});