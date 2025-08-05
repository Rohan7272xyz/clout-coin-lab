// File: server.js
// Your main Express server file

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/auth'); // Your existing auth routes
const tokenRoutes = require('./routes/tokens'); // New token/influencer routes
const tradingRoutes = require('./routes/trading'); // New trading routes

// Apply routes
app.use('/api/auth', authRoutes); // Your existing auth endpoints
app.use('/api', tokenRoutes); // New endpoints: /api/influencers, /api/waitlist, etc.
app.use('/api/trading', tradingRoutes); // Trading endpoints: /api/trading/coin/:id, /api/trading/price, etc.

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        routes: {
            auth: '/api/auth/*',
            general: '/api/*',
            trading: '/api/trading/*'
        }
    });
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Token Factory API',
        version: '1.0.0',
        endpoints: {
            auth: {
                base: '/api/auth',
                description: 'Authentication routes'
            },
            influencers: {
                base: '/api/influencers',
                description: 'Get all influencers',
                methods: ['GET', 'POST']
            },
            waitlist: {
                base: '/api/waitlist',
                description: 'Waitlist signup',
                methods: ['POST']
            },
            trading: {
                base: '/api/trading',
                description: 'Trading functionality',
                endpoints: {
                    coinDetail: '/api/trading/coin/:id',
                    priceQuote: '/api/trading/price/:tokenAddress/:ethAmount',
                    recordPurchase: '/api/trading/record-purchase',
                    portfolio: '/api/trading/portfolio/:userId'
                }
            }
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        availableRoutes: [
            '/api',
            '/api/influencers',
            '/api/waitlist',
            '/api/trading/coin/:id',
            '/health'
        ]
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📈 Trading API: http://localhost:${PORT}/api/trading`);
});

module.exports = app;