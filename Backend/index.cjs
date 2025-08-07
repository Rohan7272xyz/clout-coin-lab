const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./Routes/AuthRoutes');
const influencerRoutes = require('./Routes/influencerRoutes');
const testRoutes = require('./Routes/testRoutes');

const app = express();
const PORT = process.env.PORT || 8080; // Changed to 3000 to match frontend

// Middleware
app.use(cors({
  origin: 'http://localhost:8080', // Your frontend URL
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);           // Added auth routes
app.use('/api/influencer', influencerRoutes);
app.use('/api/test', testRoutes);

app.get('/', (req, res) => {
  res.send('🚀 CoinFluence Backend Running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database connection configured`);
});