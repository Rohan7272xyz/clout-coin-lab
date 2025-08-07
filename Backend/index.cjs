const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Load .env from backend folder first, then root folder as fallback
require('dotenv').config(); // Load Backend/.env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Also load root .env

// Import routes - Fix the paths (they should match your actual file structure)
const authRoutes = require('./routes/authRoutes');
const influencerRoutes = require('./routes/influencerRoutes');
const testRoutes = require('./routes/testRoutes');
const pledgeRoutes = require('./routes/pledgeRoutes');
const userStatusRoutes = require('./routes/userStatusRoutes');

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/influencer', influencerRoutes);
app.use('/api/test', testRoutes);
app.use('/api/pledge', pledgeRoutes); // Add pledge routes
app.use('/api/status', userStatusRoutes); // Add user status routes

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 CoinFluence Backend Running',
    endpoints: {
      auth: '/api/auth',
      influencer: '/api/influencer',
      test: '/api/test',
      pledge: '/api/pledge'
    },
    status: 'operational'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
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
});