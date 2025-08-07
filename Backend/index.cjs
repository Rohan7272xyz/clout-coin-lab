// Backend/index.cjs - Updated with pledge routes
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const influencerRoutes = require('./Routes/influencerRoutes');
const testRoutes = require('./Routes/testRoutes');
const pledgeRoutes = require('./routes/pledgeRoutes'); // ✅ NEW - Pledge system routes

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173'], // Add Vite dev server
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/influencer', influencerRoutes);
app.use('/api/test', testRoutes);
app.use('/api/pledge', pledgeRoutes);           // ✅ NEW - Pledge routes

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 CoinFluence Backend Running',
    version: '2.0.0',
    features: ['Authentication', 'Influencers', 'Pledge System'], // ✅ NEW
    endpoints: {
      auth: '/api/auth/*',
      influencers: '/api/influencer/*',
      pledges: '/api/pledge/*',        // ✅ NEW
      test: '/api/test/*'
    },
    status: 'operational'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',      // You can add actual health checks here
      blockchain: 'connected',    // Check RPC connection
      pledge_system: 'active'     // ✅ NEW
    }
  });
});

// API documentation endpoint  
app.get('/api', (req, res) => {
  res.json({
    message: 'CoinFluence API Documentation',
    version: '2.0.0',
    baseUrl: `http://localhost:${PORT}`,
    endpoints: {
      // Authentication
      auth: {
        base: '/api/auth',
        endpoints: {
          sync: 'POST /api/auth/sync',
          user: 'GET /api/auth/user/:wallet_address',
          update: 'PUT /api/auth/user/:wallet_address'
        }
      },
      // Influencers  
      influencers: {
        base: '/api/influencer',
        endpoints: {
          list: 'GET /api/influencer/',
          details: 'GET /api/influencer/:id'
        }
      },
      // ✅ NEW - Pledge System
      pledges: {
        base: '/api/pledge',
        endpoints: {
          // Public endpoints
          list_influencers: 'GET /api/pledge/influencers',
          influencer_details: 'GET /api/pledge/influencer/:address',
          user_pledges: 'GET /api/pledge/user/:userAddress/pledges',
          platform_stats: 'GET /api/pledge/stats',
          
          // Admin endpoints
          setup_influencer: 'POST /api/pledge/admin/setup-influencer',
          approve_influencer: 'POST /api/pledge/admin/approve-influencer',
          launch_token: 'POST /api/pledge/admin/launch-token'
        }
      },
      // Test endpoints
      test: {
        base: '/api/test',
        endpoints: {
          ping: 'GET /api/test/ping'
        }
      }
    },
    // ✅ NEW - Contract information
    contracts: {
      network: 'base-sepolia',
      tokenFactory: process.env.TOKEN_FACTORY_ADDRESS || '0x18594f5d4761b9DBEA625dDeD86356F6D346A09a',
      pledgeManager: process.env.PLEDGE_MANAGER_ADDRESS || 'Deploy PledgeManager first',
      usdc: process.env.BASE_SEPOLIA_USDC || '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  
  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({ 
    error: isDevelopment ? err.message : 'Internal server error',
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler - must be last
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'GET /',
      'GET /health', 
      'GET /api',
      'GET /api/auth/*',
      'GET /api/influencer/*',
      'GET /api/pledge/*',      // ✅ NEW
      'GET /api/test/*'
    ],
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CoinFluence Backend v2.0.0 running on http://localhost:${PORT}`);
  console.log(`📊 API Documentation: http://localhost:${PORT}/api`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`💰 Pledge System: http://localhost:${PORT}/api/pledge`);
  console.log('');
  console.log('🔧 Available Services:');
  console.log('   ✅ Authentication System');
  console.log('   ✅ Influencer Management'); 
  console.log('   ✅ Pledge System');          // ✅ NEW
  console.log('   ✅ Database Integration');
  console.log('');
  console.log('📋 Environment Check:');
  console.log(`   Database: ${process.env.PG_DATABASE || 'Not configured'}`);
  console.log(`   Network: ${process.env.NETWORK || 'base-sepolia'}`);
  console.log(`   TokenFactory: ${process.env.TOKEN_FACTORY_ADDRESS || 'Not set'}`);
  console.log(`   PledgeManager: ${process.env.PLEDGE_MANAGER_ADDRESS || 'Not deployed yet'}`); // ✅ NEW
});

module.exports = app;